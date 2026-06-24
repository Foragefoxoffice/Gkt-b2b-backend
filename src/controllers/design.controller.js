import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';
import fs from 'fs';
import path from 'path';

export const createDesign = async (req, res) => {
  const { code, name, categoryId, color, colorStocks, rate, gstPercent, material, availableStock } = req.body;
  let images = [];
  let newImgColors = [];
  if (req.files && req.files.length > 0) {
    images = req.files.map(f => `/uploads/designs/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${f.filename}`);
    if (req.body.imageColors !== undefined) {
      newImgColors = Array.isArray(req.body.imageColors) ? req.body.imageColors : [req.body.imageColors];
    }
  }
  const image = images.length > 0 ? images.join(',') : null;
  const imageColorMap = newImgColors.length > 0 ? JSON.stringify(newImgColors) : null;

  let finalAvailableStock = parseInt(availableStock || 0);
  let finalColorStock = null;
  if (colorStocks) {
    try {
      const parsed = typeof colorStocks === 'string' ? JSON.parse(colorStocks) : colorStocks;
      finalAvailableStock = Object.values(parsed).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
      finalColorStock = typeof colorStocks === 'string' ? colorStocks : JSON.stringify(colorStocks);
    } catch (e) { }
  }

  const design = await prisma.design.create({
    data: {
      code, name, categoryId: parseInt(categoryId), color, colorStock: finalColorStock,
      rate: parseFloat(rate),
      gstPercent: parseFloat(gstPercent || 5.0),
      material,
      availableStock: finalAvailableStock,
      image,
      imageColorMap
    }
  });

  import('../socket.js').then(({ getIO }) => {
    try { getIO().emit('inventoryUpdated'); } catch (e) { }
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
      include: { designcategory: true, loom: { include: { weaver: true } } }
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
    include: { designcategory: true, loom: { include: { weaver: true } } }
  });

  if (!design || design.deletedAt) return sendResponse(res, 404, false, 'Not found');
  return sendResponse(res, 200, true, 'Retrieved', design);
};

export const updateDesign = async (req, res) => {
  const { code, name, categoryId, color, colorStocks, rate, gstPercent, material, availableStock } = req.body;
  const designId = parseInt(req.params.id);

  const existing = await prisma.design.findUnique({ where: { id: designId } });
  if (!existing || existing.deletedAt) return sendResponse(res, 404, false, 'Not found');

  let finalAvailableStock = availableStock !== undefined && availableStock !== '' ? parseInt(availableStock) : undefined;
  let finalColorStock = existing.colorStock;

  if (colorStocks !== undefined) {
    try {
      const parsed = typeof colorStocks === 'string' ? JSON.parse(colorStocks) : colorStocks;
      finalAvailableStock = Object.values(parsed).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
      finalColorStock = typeof colorStocks === 'string' ? colorStocks : JSON.stringify(colorStocks);
    } catch (e) { }
  }

  const data = {
    code, name, color, colorStock: finalColorStock, material,
    categoryId: categoryId ? parseInt(categoryId) : undefined,
    rate: rate !== undefined ? parseFloat(rate) : undefined,
    gstPercent: gstPercent !== undefined ? parseFloat(gstPercent) : undefined,
    availableStock: finalAvailableStock,
  };

  let finalImages = [];
  let finalColors = [];

  const existingImgs = req.body.existingImages ? (Array.isArray(req.body.existingImages) ? req.body.existingImages : [req.body.existingImages]) : [];
  const existingColors = req.body.existingImageColors ? (Array.isArray(req.body.existingImageColors) ? req.body.existingImageColors : [req.body.existingImageColors]) : [];

  const newImgs = req.files && req.files.length > 0 ? req.files.map(f => `/uploads/designs/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${f.filename}`) : [];
  const newColors = req.body.imageColors ? (Array.isArray(req.body.imageColors) ? req.body.imageColors : [req.body.imageColors]) : [];

  if (req.body.mediaSequence) {
    try {
      const sequence = JSON.parse(req.body.mediaSequence);
      let eIdx = 0;
      let nIdx = 0;
      for (const type of sequence) {
        if (type === 'existing' && existingImgs[eIdx] !== undefined) {
          finalImages.push(existingImgs[eIdx]);
          finalColors.push(existingColors[eIdx] || '');
          eIdx++;
        } else if (type === 'new' && newImgs[nIdx] !== undefined) {
          finalImages.push(newImgs[nIdx]);
          finalColors.push(newColors[nIdx] || '');
          nIdx++;
        }
      }
    } catch (e) {
      finalImages = [...existingImgs, ...newImgs];
      finalColors = [...existingColors, ...newColors];
    }
  } else {
    finalImages = [...existingImgs, ...newImgs];
    finalColors = [...existingColors, ...newColors];
  }

  if (finalImages.length > 0 || req.body.existingImages !== undefined) {
    data.image = finalImages.length > 0 ? finalImages.join(',') : null;
    data.imageColorMap = finalColors.length > 0 ? JSON.stringify(finalColors) : null;
  }

  const updated = await prisma.design.update({
    where: { id: designId },
    data
  });

  import('../socket.js').then(({ emitToRole, getIO }) => {
    getIO().emit('inventoryUpdated');

    if (existing.availableStock !== updated.availableStock || existing.colorStock !== updated.colorStock) {
      emitToRole('BUYER', 'notification', {
        type: 'STOCK_UPDATED',
        title: 'Stock Updated',
        message: `Stock for design "${updated.name}" (${updated.code}) has been updated.`,
        data: updated
      });
    }
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

  import('../socket.js').then(({ getIO }) => {
    try { getIO().emit('inventoryUpdated'); } catch (e) { }
  });

  return sendResponse(res, 200, true, 'Deleted');
};
