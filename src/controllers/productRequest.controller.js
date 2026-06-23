import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';
import { emitToRole, emitToUser, getIO } from '../socket.js';

const generateRequestNumber = async (tx) => {
  const client = tx || prisma;
  const lastRequest = await client.productrequest.findFirst({ orderBy: { id: 'desc' } });
  if (!lastRequest) return 'PRQ-000001';
  const lastNum = parseInt(lastRequest.requestNumber.split('-')[1]);
  return `PRQ-${String(lastNum + 1).padStart(6, '0')}`;
};

export const createProductRequest = async (req, res) => {
  const { remarks } = req.body;
  if (req.user.roleName !== 'BUYER') {
    return sendResponse(res, 403, false, 'Only buyers can submit product requests');
  }

  const buyer = await prisma.buyer.findFirst({ where: { email: req.user.email } });
  if (!buyer) return sendResponse(res, 404, false, 'Buyer profile not found');

  const cart = await prisma.cart.findUnique({
    where: { buyerId: buyer.id },
    include: { items: { include: { design: true } } }
  });

  if (!cart || cart.items.length === 0) {
    return sendResponse(res, 400, false, 'Cart is empty');
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const requestNumber = await generateRequestNumber(tx);

      const requestItems = cart.items.map(item => ({
        designId: item.designId,
        color: item.color,
        quantity: item.quantity
      }));

      const productRequest = await tx.productrequest.create({
        data: {
          requestNumber,
          buyerId: buyer.id,
          remarks,
          items: {
            create: requestItems
          }
        },
        include: {
          items: { include: { design: true } },
          buyer: true
        }
      });

      // Clear the buyer's cart after successfully creating the request
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return productRequest;
    });

    // Notify Admins
    emitToRole('ADMIN', 'notification', {
      type: 'PRODUCT_REQUEST_CREATED',
      title: 'New Product Request',
      message: `Request ${result.requestNumber} submitted by ${buyer.name}`,
      data: result
    });

    // Notify Buyer
    emitToUser(req.user.id, 'notification', {
      type: 'PRODUCT_REQUEST_CREATED',
      title: 'Product Request Submitted',
      message: `Your request ${result.requestNumber} has been submitted successfully.`,
      data: result
    });

    try {
      getIO().emit('cartUpdated');
      getIO().emit('productRequestsUpdated');
    } catch (e) {}

    return sendResponse(res, 201, true, 'Product request submitted successfully', result);
  } catch (error) {
    return sendResponse(res, 500, false, error.message || 'Failed to submit request');
  }
};

export const getProductRequests = async (req, res) => {
  const { status, page = 1, limit = 20, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = { deletedAt: null };
  if (status && status !== 'ALL') where.status = status;

  if (req.user.roleName === 'BUYER') {
    const buyer = await prisma.buyer.findFirst({ where: { email: req.user.email } });
    if (buyer) {
      where.buyerId = buyer.id;
    } else {
      return sendResponse(res, 200, true, 'Product Requests', [], { page, limit, total: 0 });
    }
  }

  if (search) {
    where.OR = [
      { requestNumber: { contains: search } },
      { buyer: { name: { contains: search } } },
      { buyer: { code: { contains: search } } }
    ];
  }

  const [requests, total] = await Promise.all([
    prisma.productrequest.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: true,
        items: { include: { design: true } }
      }
    }),
    prisma.productrequest.count({ where })
  ]);

  return sendResponse(res, 200, true, 'Product Requests retrieved', requests, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / take)
  });
};

export const getProductRequestById = async (req, res) => {
  const request = await prisma.productrequest.findUnique({
    where: { id: parseInt(req.params.id) },
    include: {
      buyer: true,
      items: { include: { design: true } }
    }
  });

  if (!request || request.deletedAt) return sendResponse(res, 404, false, 'Not found');

  if (req.user.roleName === 'BUYER') {
    const buyer = await prisma.buyer.findFirst({ where: { email: req.user.email } });
    if (!buyer || request.buyerId !== buyer.id) {
      return sendResponse(res, 403, false, 'Access denied');
    }
  }

  return sendResponse(res, 200, true, 'Retrieved', request);
};

export const updateProductRequestStatus = async (req, res) => {
  const { status, loomId, designId, color } = req.body;
  const requestId = parseInt(req.params.id);

  if (req.user.roleName === 'BUYER') {
    return sendResponse(res, 403, false, 'Buyers cannot update request status');
  }

  const request = await prisma.productrequest.findUnique({
    where: { id: requestId },
    include: { buyer: true, items: true }
  });

  if (!request || request.deletedAt) return sendResponse(res, 404, false, 'Request not found');

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const updatedReq = await tx.productrequest.update({
        where: { id: requestId },
        data: { status },
        include: { buyer: true, items: { include: { design: true } } }
      });

      // If status is APPROVED and a loomId is specified, assign the design to the loom
      if (status === 'APPROVED' && loomId && designId) {
        await tx.loom.update({
          where: { id: parseInt(loomId) },
          data: {
            designId: parseInt(designId),
            assignedColor: color || null
          }
        });
      }

      return updatedReq;
    });

    const buyerUser = await prisma.user.findUnique({ where: { email: request.buyer.email } });
    if (buyerUser) {
      emitToUser(buyerUser.id, 'notification', {
        type: `PRODUCT_REQUEST_${status}`,
        title: `Request ${status.charAt(0) + status.slice(1).toLowerCase()}`,
        message: `Your production request ${request.requestNumber} has been ${status.toLowerCase()}${loomId ? ' and assigned to a loom' : ''}.`,
        data: updated
      });
    }

    try {
      getIO().emit('loomsUpdated');
      getIO().emit('productRequestsUpdated');
    } catch (e) {}

    return sendResponse(res, 200, true, `Product request status updated to ${status}`, updated);
  } catch (error) {
    return sendResponse(res, 500, false, error.message || 'Failed to update request status');
  }
};
