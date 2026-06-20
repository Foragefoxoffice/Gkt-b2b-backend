import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';
import { emitToRole, emitToUser, getIO } from '../socket.js';

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
      color: item.color,
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

    // Notify Admins
    emitToRole('ADMIN', 'notification', {
      type: 'ORDER_CREATED',
      title: 'New Order',
      message: `Order ${result.orderNumber} placed by ${buyer.name}`,
      data: result
    });

    // Notify Buyer
    emitToUser(req.user.id, 'notification', {
      type: 'ORDER_CREATED',
      title: 'Order Placed',
      message: `Your order ${result.orderNumber} has been placed successfully.`,
      data: result
    });

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

  const order = await prisma.order.findUnique({ 
    where: { id: orderId }, 
    include: { items: true, buyer: true } 
  });
  if (!order || order.deletedAt) return sendResponse(res, 404, false, 'Not found');

  // Cancel order (Buyer or Admin)
  if (status === 'CANCELLED') {
    if (order.status !== 'PENDING') return sendResponse(res, 400, false, 'Can only cancel PENDING orders');
    
    await prisma.order.update({
      where: { id: orderId },
      data: { status, remarks }
    });

    if (req.user.roleName === 'ADMIN') {
      const buyerUser = await prisma.user.findUnique({ where: { email: order.buyer.email } });
      if (buyerUser) {
        emitToUser(buyerUser.id, 'notification', {
          type: 'ORDER_CANCELLED',
          title: 'Order Cancelled',
          message: `Your order ${order.orderNumber} has been cancelled by Admin.`,
          data: order
        });
      }
    } else {
      emitToRole('ADMIN', 'notification', {
        type: 'ORDER_CANCELLED',
        title: 'Order Cancelled',
        message: `Order ${order.orderNumber} has been cancelled by ${order.buyer.name}.`,
        data: order
      });
    }

    return sendResponse(res, 200, true, 'Order cancelled');
  }

  // Admin Approval logic
  if (req.user.roleName === 'BUYER') return sendResponse(res, 403, false, 'Buyers cannot approve/reject orders');

  if (status === 'PROCESSING') {
    if (order.status !== 'PENDING') return sendResponse(res, 400, false, 'Can only approve PENDING orders');

    try {
      await prisma.$transaction(async (tx) => {
        // Update Order
        await tx.order.update({ where: { id: orderId }, data: { status } });
        
        // Log Approval
        await tx.approval.create({
          data: { orderId, approvedBy: req.user.id, status: 'PROCESSING', remarks }
        });

        // Reserve Stock & Log Inventory Txn
        for (const item of order.items) {
          const design = await tx.design.findUnique({ where: { id: item.designId } });
          let newColorStock = design.colorStock;
          
          if (item.color && design.colorStock) {
            try {
              const colorStocks = JSON.parse(design.colorStock);
              if (colorStocks[item.color] !== undefined) {
                colorStocks[item.color] = Math.max(0, colorStocks[item.color] - item.quantity);
                newColorStock = JSON.stringify(colorStocks);
              }
            } catch(e) {}
          }

          await tx.design.update({
            where: { id: item.designId },
            data: { 
              availableStock: { decrement: item.quantity },
              colorStock: newColorStock
            }
          });

          await tx.inventoryTransaction.create({
            data: {
              designId: item.designId,
              color: item.color,
              type: 'ORDER',
              quantity: -item.quantity,
              orderRef: order.orderNumber
            }
          });
        }
      });

      const buyerUser = await prisma.user.findUnique({ where: { email: order.buyer.email } });
      if (buyerUser) {
        emitToUser(buyerUser.id, 'notification', {
          type: 'ORDER_PROCESSING',
          title: 'Order Approved',
          message: `Your order ${order.orderNumber} is now processing.`,
          data: order
        });
        try {
          getIO().emit('inventoryUpdated');
        } catch(e) {}
      }

      return sendResponse(res, 200, true, 'Order approved and processing started');
    } catch (e) {
      return sendResponse(res, 500, false, 'Failed to process order');
    }
  }

  return sendResponse(res, 400, false, 'Invalid status update');
};
