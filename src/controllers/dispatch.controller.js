import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';

const generateDispatchNumber = async () => {
  const last = await prisma.dispatch.findFirst({ orderBy: { id: 'desc' } });
  if (!last) return 'DSP-000001';
  const lastNum = parseInt(last.dispatchNumber.split('-')[1]);
  return `DSP-${String(lastNum + 1).padStart(6, '0')}`;
};

export const createDispatch = async (req, res) => {
  const { orderId, transporterId, numberOfBundles } = req.body;
  
  const order = await prisma.order.findUnique({ 
    where: { id: parseInt(orderId) }, 
    include: { items: true, buyer: true } 
  });
  if (!order || order.status !== 'PROCESSING') return sendResponse(res, 400, false, 'Invalid or unapproved order');



  const dispatchItemsData = order.items.map(item => ({
    orderItemId: item.id,
    quantity: item.quantity
  }));

  const dispatchNumber = await generateDispatchNumber();

  const dispatch = await prisma.dispatch.create({
    data: {
      dispatchNumber,
      orderId: parseInt(orderId),
      transporterId: parseInt(transporterId),
      numberOfBundles: parseInt(numberOfBundles),
      status: 'DISPATCHED',
      items: { create: dispatchItemsData }
    }
  });

  await prisma.order.update({ where: { id: parseInt(orderId) }, data: { status: 'DISPATCHED' } });

  const buyerUser = await prisma.user.findUnique({ where: { email: order.buyer.email } });
  if (buyerUser) {
    import('../socket.js').then(({ emitToUser }) => {
      emitToUser(buyerUser.id, 'notification', {
        type: 'DISPATCH_CREATED',
        title: 'Order Dispatched',
        message: `Your order ${order.orderNumber} has been dispatched.`,
        data: dispatch
      });
    });
  }

  return sendResponse(res, 201, true, 'Dispatch created', dispatch);
};

export const updateDispatchStatus = async (req, res) => {
  const { status, trackingNumber } = req.body; // DISPATCHED, DELIVERED
  const dispatchId = parseInt(req.params.id);

  // Build update data
  const updateData = { status };

  // When marking as delivered, include tracking number and file uploads
  if (status === 'DELIVERED') {
    if (trackingNumber) updateData.trackingNumber = trackingNumber;

    if (req.files) {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      if (req.files.bookingCopy) {
        updateData.bookingCopy = `/uploads/dispatches/${year}/${month}/${req.files.bookingCopy[0].filename}`;
      }
      if (req.files.invoiceCopy) {
        updateData.invoiceCopy = `/uploads/dispatches/${year}/${month}/${req.files.invoiceCopy[0].filename}`;
      }
    }
  }

  const dispatch = await prisma.dispatch.update({
    where: { id: dispatchId },
    data: updateData,
    include: { order: { include: { buyer: true } } }
  });

  if (status === 'DISPATCHED') {
    await prisma.order.update({ where: { id: dispatch.orderId }, data: { status: 'DISPATCHED' } });
  } else if (status === 'DELIVERED') {
    await prisma.order.update({ where: { id: dispatch.orderId }, data: { status: 'COMPLETED' } });
  }

  const buyerUser = await prisma.user.findUnique({ where: { email: dispatch.order.buyer.email } });
  if (buyerUser) {
    import('../socket.js').then(({ emitToUser }) => {
      emitToUser(buyerUser.id, 'notification', {
        type: 'DISPATCH_UPDATED',
        title: 'Dispatch Update',
        message: `The dispatch status for order ${dispatch.order.orderNumber} is now ${status}.`,
        data: dispatch
      });
    });
  }

  return sendResponse(res, 200, true, 'Dispatch status updated', dispatch);
};

export const getDispatches = async (req, res) => {
  const { search, status, transporterId, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = { deletedAt: null };
  if (status && status !== 'ALL') where.status = status;
  if (transporterId && transporterId !== 'ALL') where.transporterId = parseInt(transporterId);
  if (search) {
    where.OR = [
      { dispatchNumber: { contains: search } },
      { trackingNumber: { contains: search } },
      { order: { orderNumber: { contains: search } } }
    ];
  }

  if (req.user.roleName === 'BUYER') {
    const buyer = await prisma.buyer.findFirst({ where: { email: req.user.email } });
    if (buyer) {
      where.order = { buyerId: buyer.id };
    } else {
      return sendResponse(res, 200, true, 'Dispatches', [], { page, limit, total: 0 });
    }
  }

  const [dispatches, total] = await Promise.all([
    prisma.dispatch.findMany({ 
      where, skip, take, orderBy: { createdAt: 'desc' },
      include: { order: true, transporter: true }
    }),
    prisma.dispatch.count({ where })
  ]);

  return sendResponse(res, 200, true, 'Dispatches retrieved', dispatches, {
    page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / take)
  });
};
