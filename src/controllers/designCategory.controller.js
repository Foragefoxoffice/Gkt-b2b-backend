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
  const categories = await prisma.designCategory.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' }
  });
  return sendResponse(res, 200, true, 'Categories retrieved', categories);
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
