import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';

export const createCategory = async (req, res) => {
  const { name, code } = req.body;
  const category = await prisma.designCategory.create({
    data: { name, code }
  });
  return sendResponse(res, 201, true, 'Category created', category);
};

export const getCategories = async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = { deletedAt: null };
  if (search) {
    where.name = { contains: search };
  }

  const [categories, total] = await Promise.all([
    prisma.designCategory.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' }
    }),
    prisma.designCategory.count({ where })
  ]);

  return sendResponse(res, 200, true, 'Categories retrieved', categories, {
    page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / take)
  });
};

export const updateCategory = async (req, res) => {
  const { name, code } = req.body;
  const existing = await prisma.designCategory.findUnique({ where: { id: parseInt(req.params.id) } });
  if (!existing || existing.deletedAt) return sendResponse(res, 404, false, 'Not found');

  const updated = await prisma.designCategory.update({
    where: { id: parseInt(req.params.id) },
    data: { name, code }
  });
  return sendResponse(res, 200, true, 'Updated', updated);
};

export const deleteCategory = async (req, res) => {
  const existing = await prisma.designCategory.findUnique({ where: { id: parseInt(req.params.id) } });
  if (!existing || existing.deletedAt) return sendResponse(res, 404, false, 'Not found');

  await prisma.designCategory.update({
    where: { id: parseInt(req.params.id) },
    data: { deletedAt: new Date() }
  });
  return sendResponse(res, 200, true, 'Deleted');
};
