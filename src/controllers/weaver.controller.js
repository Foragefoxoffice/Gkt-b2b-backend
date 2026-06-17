import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';

export const createWeaver = async (req, res) => {
  const { name, code, loomNumber } = req.body;
  const weaver = await prisma.weaver.create({
    data: { name, code, loomNumber }
  });
  return sendResponse(res, 201, true, 'Weaver created', weaver);
};

export const getWeavers = async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = { deletedAt: null };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } }
    ];
  }

  const [weavers, total] = await Promise.all([
    prisma.weaver.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.weaver.count({ where })
  ]);

  return sendResponse(res, 200, true, 'Weavers retrieved', weavers, {
    page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / take)
  });
};

export const getWeaverById = async (req, res) => {
  const weaver = await prisma.weaver.findUnique({ where: { id: parseInt(req.params.id) } });
  if (!weaver || weaver.deletedAt) return sendResponse(res, 404, false, 'Not found');
  return sendResponse(res, 200, true, 'Retrieved', weaver);
};

export const updateWeaver = async (req, res) => {
  const { name, code, loomNumber } = req.body;
  const existing = await prisma.weaver.findUnique({ where: { id: parseInt(req.params.id) } });
  if (!existing || existing.deletedAt) return sendResponse(res, 404, false, 'Not found');

  const updated = await prisma.weaver.update({
    where: { id: parseInt(req.params.id) },
    data: { name, code, loomNumber }
  });
  return sendResponse(res, 200, true, 'Updated', updated);
};

export const deleteWeaver = async (req, res) => {
  const existing = await prisma.weaver.findUnique({ where: { id: parseInt(req.params.id) } });
  if (!existing || existing.deletedAt) return sendResponse(res, 404, false, 'Not found');

  await prisma.weaver.update({
    where: { id: parseInt(req.params.id) },
    data: { deletedAt: new Date() }
  });
  return sendResponse(res, 200, true, 'Deleted');
};
