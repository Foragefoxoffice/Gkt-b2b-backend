import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';

const generateDispatchNumber = async () => {
  const last = await prisma.dispatch.findFirst({ orderBy: { id: 'desc' } });
  if (!last) return 'DSP-000001';
  const lastNum = parseInt(last.dispatchNumber.split('-')[1]);
  return `DSP-${String(lastNum + 1).padStart(6, '0')}`;
};

export const createDispatch = async (req, res) => {
  const { orderId, transporterId, numberOfBundles, trackingNumber } = req.body;
  
  const order = await prisma.order.findUnique({ where: { id: parseInt(orderId) }, include: { items: true } });
  if (!order || order.status !== 'APPROVED') return sendResponse(res, 400, false, 'Invalid or unapproved order');

  let bookingCopy = null;
  let invoiceCopy = null;

  if (req.files) {
    if (req.files.bookingCopy) bookingCopy = `/uploads/dispatches/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${req.files.bookingCopy[0].filename}`;
    if (req.files.invoiceCopy) invoiceCopy = `/uploads/dispatches/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${req.files.invoiceCopy[0].filename}`;
  }

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
      trackingNumber,
      bookingCopy,
      invoiceCopy,
      items: { create: dispatchItemsData }
    }
  });

  // Automatically update order status to PROCESSING or COMPLETED? 
  // Let's mark order as PROCESSING when dispatch is created, and COMPLETED when dispatch is DELIVERED.
  await prisma.order.update({ where: { id: parseInt(orderId) }, data: { status: 'PROCESSING' } });

  return sendResponse(res, 201, true, 'Dispatch created', dispatch);
};

export const updateDispatchStatus = async (req, res) => {
  const { status } = req.body; // DISPATCHED, DELIVERED
  const dispatchId = parseInt(req.params.id);

  const dispatch = await prisma.dispatch.update({
    where: { id: dispatchId },
    data: { status }
  });

  if (status === 'DELIVERED') {
    await prisma.order.update({ where: { id: dispatch.orderId }, data: { status: 'COMPLETED' } });
  }

  return sendResponse(res, 200, true, 'Dispatch status updated', dispatch);
};

export const getDispatches = async (req, res) => {
  const { search, status, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = { deletedAt: null };
  if (status) where.status = status;
  if (search) where.dispatchNumber = { contains: search };

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
