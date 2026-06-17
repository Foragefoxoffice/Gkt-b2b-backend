import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';

export const createTransporter = async (req, res) => {
  const { name, mobile, email, address } = req.body;
  const transporter = await prisma.transporter.create({
    data: { name, mobile, email, address }
  });
  return sendResponse(res, 201, true, 'Transporter created', transporter);
};

export const getTransporters = async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = { deletedAt: null };
  if (search) where.name = { contains: search };

  const [transporters, total] = await Promise.all([
    prisma.transporter.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.transporter.count({ where })
  ]);

  return sendResponse(res, 200, true, 'Transporters retrieved', transporters, {
    page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / take)
  });
};

export const getTransporterById = async (req, res) => {
  const transporter = await prisma.transporter.findUnique({ where: { id: parseInt(req.params.id) } });
  if (!transporter || transporter.deletedAt) return sendResponse(res, 404, false, 'Not found');
  return sendResponse(res, 200, true, 'Retrieved', transporter);
};

export const updateTransporter = async (req, res) => {
  const { name, mobile, email, address } = req.body;
  const transporterId = parseInt(req.params.id);

  const existing = await prisma.transporter.findUnique({ where: { id: transporterId } });
  if (!existing || existing.deletedAt) return sendResponse(res, 404, false, 'Not found');

  const updated = await prisma.transporter.update({
    where: { id: transporterId },
    data: { name, mobile, email, address }
  });
  return sendResponse(res, 200, true, 'Updated', updated);
};

export const deleteTransporter = async (req, res) => {
  const transporterId = parseInt(req.params.id);
  const existing = await prisma.transporter.findUnique({ where: { id: transporterId } });
  if (!existing || existing.deletedAt) return sendResponse(res, 404, false, 'Not found');

  await prisma.transporter.update({
    where: { id: transporterId },
    data: { deletedAt: new Date() }
  });
  return sendResponse(res, 200, true, 'Deleted');
};
