import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';

const generateOrderNumber = async () => {
  const lastOrder = await prisma.order.findFirst({ orderBy: { id: 'desc' } });
  if (!lastOrder) return 'ORD-000001';
  const lastNum = parseInt(lastOrder.orderNumber.split('-')[1]);
  return `ORD-${String(lastNum + 1).padStart(6, '0')}`;
};

export const createOrderFromCart = async (req, res) => {
  const { transporterId, remarks } = req.body;
  const buyer = await prisma.buyer.findFirst({ where: { email: req.user.email } });
  if (!buyer) return sendResponse(res, 404, false, 'Buyer not found');

  const cart = await prisma.cart.findUnique({
    where: { buyerId: buyer.id },
    include: { items: { include: { design: true } } }
  });

  if (!cart || cart.items.length === 0) {
    return sendResponse(res, 400, false, 'Cart is empty');
  }

  let gstAmount = 0;
  let totalAmount = 0;

  const orderItemsData = cart.items.map(item => {
    const rate = item.design.rate;
    const taxPercent = item.design.gstPercent;
    const quantity = item.quantity;
    
    const lineBaseTotal = rate * quantity;
    const taxAmount = (lineBaseTotal * taxPercent) / 100;
    const lineTotal = lineBaseTotal + taxAmount;

    totalAmount += lineBaseTotal;
    gstAmount += taxAmount;

    return {
      designId: item.designId,
      quantity,
      rate,
      taxPercent,
      taxAmount,
      lineTotal
    };
  });

  const grandTotal = totalAmount + gstAmount;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const orderNumber = await generateOrderNumber();
      
      const order = await tx.order.create({
        data: {
          orderNumber,
          buyerId: buyer.id,
          transporterId: transporterId ? parseInt(transporterId) : null,
          gstAmount, totalAmount, grandTotal, remarks,
          items: {
            create: orderItemsData
          }
        },
        include: { items: true }
      });

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return order;
    });

    // TODO: Trigger Notification Service here

    return sendResponse(res, 201, true, 'Order created successfully', result);
  } catch (error) {
    throw error;
  }
};

export const getOrders = async (req, res) => {
  const { status, buyerId, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = { deletedAt: null };
  if (status) where.status = status;
  if (buyerId) where.buyerId = parseInt(buyerId);

  // If user is buyer, restrict to their orders
  if (req.user.roleName === 'BUYER') {
    const buyer = await prisma.buyer.findFirst({ where: { email: req.user.email } });
    if (buyer) {
      where.buyerId = buyer.id;
    } else {
      return sendResponse(res, 200, true, 'Orders', [], { page, limit, total: 0 });
    }
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({ 
      where, skip, take, orderBy: { createdAt: 'desc' },
      include: { buyer: true, transporter: true }
    }),
    prisma.order.count({ where })
  ]);

  return sendResponse(res, 200, true, 'Orders retrieved', orders, {
    page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / take)
  });
};

export const getOrderById = async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: parseInt(req.params.id) },
    include: {
      buyer: true,
      transporter: true,
      items: { include: { design: true } },
      approvals: true,
      dispatches: true
    }
  });

  if (!order || order.deletedAt) return sendResponse(res, 404, false, 'Not found');
  
  if (req.user.roleName === 'BUYER') {
    const buyer = await prisma.buyer.findFirst({ where: { email: req.user.email } });
    if (!buyer || order.buyerId !== buyer.id) {
      return sendResponse(res, 403, false, 'Access denied');
    }
  }

  return sendResponse(res, 200, true, 'Retrieved', order);
};

export const updateOrderStatus = async (req, res) => {
  const { status, remarks } = req.body;
  const orderId = parseInt(req.params.id);

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.deletedAt) return sendResponse(res, 404, false, 'Not found');

  // Cancel order (Buyer or Admin)
  if (status === 'CANCELLED') {
    if (order.status !== 'PENDING') return sendResponse(res, 400, false, 'Can only cancel PENDING orders');
    
    await prisma.order.update({
      where: { id: orderId },
      data: { status, remarks }
    });
    return sendResponse(res, 200, true, 'Order cancelled');
  }

  // Admin Approval logic
  if (req.user.roleName === 'BUYER') return sendResponse(res, 403, false, 'Buyers cannot approve/reject orders');

  if (status === 'APPROVED') {
    if (order.status !== 'PENDING') return sendResponse(res, 400, false, 'Can only approve PENDING orders');

    try {
      await prisma.$transaction(async (tx) => {
        // Update Order
        await tx.order.update({ where: { id: orderId }, data: { status } });
        
        // Log Approval
        await tx.approval.create({
          data: { orderId, approvedBy: req.user.id, status: 'APPROVED', remarks }
        });

        // Reserve Stock & Log Inventory Txn
        for (const item of order.items) {
          await tx.design.update({
            where: { id: item.designId },
            data: { availableStock: { decrement: item.quantity } }
          });

          await tx.inventoryTransaction.create({
            data: {
              designId: item.designId,
              type: 'ORDER',
              quantity: -item.quantity,
              orderRef: order.orderNumber
            }
          });
        }
      });
      return sendResponse(res, 200, true, 'Order approved and stock reserved');
    } catch (e) {
      return sendResponse(res, 500, false, 'Failed to approve order');
    }
  }

  return sendResponse(res, 400, false, 'Invalid status update');
};
