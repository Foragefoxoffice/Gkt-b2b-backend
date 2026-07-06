import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';

export const createWeaver = async (req, res) => {
  const { name, code, loom } = req.body;
  const weaver = await prisma.weaver.create({
    data: {
      name,
      code,
      loom: loom && loom.length > 0 ? {
        create: loom.map(l => ({ loomNo: l }))
      } : undefined
    },
    include: { loom: { include: { design: true } } }
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
    prisma.weaver.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { loom: { include: { design: true } } }
    }),
    prisma.weaver.count({ where })
  ]);

  return sendResponse(res, 200, true, 'Weavers retrieved', weavers, {
    page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / take)
  });
};

export const getWeaverById = async (req, res) => {
  const weaver = await prisma.weaver.findUnique({
    where: { id: parseInt(req.params.id) },
    include: { loom: { include: { design: true } } }
  });
  if (!weaver || weaver.deletedAt) return sendResponse(res, 404, false, 'Not found');
  return sendResponse(res, 200, true, 'Retrieved', weaver);
};

export const updateWeaver = async (req, res) => {
  const { name, code, loom } = req.body;
  const existing = await prisma.weaver.findUnique({ where: { id: parseInt(req.params.id) }, include: { loom: true } });
  if (!existing || existing.deletedAt) return sendResponse(res, 404, false, 'Not found');

  const loomList = Array.isArray(loom) ? loom : [];
  const loomToDelete = existing.loom.filter(l => !loomList.includes(l.loomNo));
  const existingLoomNos = existing.loom.map(l => l.loomNo);
  const loomToAdd = loomList.filter(l => !existingLoomNos.includes(l));

  const updated = await prisma.$transaction(async (prisma) => {
    if (loomToDelete.length > 0) {
      await prisma.loom.deleteMany({
        where: { id: { in: loomToDelete.map(l => l.id) } }
      });
    }
    if (loomToAdd.length > 0) {
      await prisma.loom.createMany({
        data: loomToAdd.map(l => ({ loomNo: l, weaverId: existing.id }))
      });
    }
    return await prisma.weaver.update({
      where: { id: parseInt(req.params.id) },
      data: { name, code },
      include: { loom: { include: { design: true } } }
    });
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

export const assignDesignToLoom = async (req, res) => {
  const { loomId } = req.params;
  const { designId, assignedColor } = req.body;

  const loom = await prisma.loom.findUnique({ where: { id: parseInt(loomId) } });
  if (!loom) return sendResponse(res, 404, false, 'Loom not found');

  // designId can be null to unassign
  const updatedLoom = await prisma.loom.update({
    where: { id: parseInt(loomId) },
    data: {
      designId: designId ? parseInt(designId) : null,
      assignedColor: assignedColor || null
    },
    include: { design: true }
  });

  return sendResponse(res, 200, true, 'Design assigned to loom', updatedLoom);
};
