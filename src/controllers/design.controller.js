import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';
import fs from 'fs';
import path from 'path';

export const createDesign = async (req, res) => {
  const { code, name, categoryId, color, rate, gstPercent, availableStock, weaverId, loomNumber } = req.body;
  const image = req.file ? `/uploads/designs/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${req.file.filename}` : null;

  const design = await prisma.design.create({
    data: {
      code, name, categoryId: parseInt(categoryId), color, 
      rate: parseFloat(rate), 
      gstPercent: parseFloat(gstPercent || 5.0), 
      availableStock: parseInt(availableStock || 0), 
      image,
      weaverId: weaverId ? parseInt(weaverId) : null,
      loomNumber
    }
  });
  
  return sendResponse(res, 201, true, 'Design created', design);
};

export const getDesigns = async (req, res) => {
  const { search, categoryId, color, minRate, maxRate, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = { deletedAt: null };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } }
    ];
  }
  if (categoryId) where.categoryId = parseInt(categoryId);
  if (color) where.color = { contains: color };
  if (minRate || maxRate) {
    where.rate = {};
    if (minRate) where.rate.gte = parseFloat(minRate);
    if (maxRate) where.rate.lte = parseFloat(maxRate);
  }

  const [designs, total] = await Promise.all([
    prisma.design.findMany({ 
      where, skip, take, orderBy: { createdAt: 'desc' },
      include: { category: true }
    }),
    prisma.design.count({ where })
  ]);

  // Compute Tags
  const now = new Date();
  const designsWithTags = designs.map(d => {
    const isNew = (now - new Date(d.createdAt)) < 30 * 24 * 60 * 60 * 1000;
    const tags = [];
    if (isNew) tags.push('New Arrival');
    // Note: Fast/Slow moving could be computed via aggregate query. Keeping it simple for now.
    return { ...d, tags };
  });

  return sendResponse(res, 200, true, 'Designs retrieved', designsWithTags, {
    page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / take)
  });
};

export const getDesignById = async (req, res) => {
  const design = await prisma.design.findUnique({
    where: { id: parseInt(req.params.id) },
    include: { category: true, weaver: true }
  });
  
  if (!design || design.deletedAt) return sendResponse(res, 404, false, 'Not found');
  return sendResponse(res, 200, true, 'Retrieved', design);
};

export const updateDesign = async (req, res) => {
  const { code, name, categoryId, color, rate, gstPercent, availableStock, weaverId, loomNumber } = req.body;
  const designId = parseInt(req.params.id);
  
  const existing = await prisma.design.findUnique({ where: { id: designId } });
  if (!existing || existing.deletedAt) return sendResponse(res, 404, false, 'Not found');

  const data = {
    code, name, color, loomNumber,
    categoryId: categoryId ? parseInt(categoryId) : undefined,
    rate: rate ? parseFloat(rate) : undefined,
    gstPercent: gstPercent ? parseFloat(gstPercent) : undefined,
    availableStock: availableStock ? parseInt(availableStock) : undefined,
    weaverId: weaverId ? parseInt(weaverId) : undefined,
  };

  if (req.file) {
    data.image = `/uploads/designs/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${req.file.filename}`;
  }

  const updated = await prisma.design.update({
    where: { id: designId },
    data
  });

  return sendResponse(res, 200, true, 'Updated', updated);
};

export const deleteDesign = async (req, res) => {
  const designId = parseInt(req.params.id);
  const existing = await prisma.design.findUnique({ where: { id: designId } });
  if (!existing || existing.deletedAt) return sendResponse(res, 404, false, 'Not found');

  await prisma.design.update({
    where: { id: designId },
    data: { deletedAt: new Date() }
  });
  return sendResponse(res, 200, true, 'Deleted');
};
