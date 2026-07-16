import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';

export const createCategory = async (req, res) => {
  const { name, code } = req.body;
  const category = await prisma.designcategory.create({
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
    prisma.designcategory.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' }
    }),
    prisma.designcategory.count({ where })
  ]);

  const allCategories = await prisma.designcategory.findMany({ where: { deletedAt: null }, select: { createdAt: true } });
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  let currentMonthCount = 0;
  let previousMonthCount = 0;
  const monthlyDataMap = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = d.toLocaleString('default', { month: 'short' });
    monthlyDataMap[monthName] = { name: monthName, value: 0 };
  }

  allCategories.forEach(c => {
    const d = new Date(c.createdAt);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) currentMonthCount++;
    if (d.getMonth() === previousMonth && d.getFullYear() === previousYear) previousMonthCount++;
    
    const monthName = d.toLocaleString('default', { month: 'short' });
    if (monthlyDataMap[monthName]) {
      monthlyDataMap[monthName].value++;
    }
  });

  const calculateTrend = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  };
  
  const stats = {
    total: allCategories.length,
    trend: calculateTrend(currentMonthCount, previousMonthCount),
    sparkline: Object.values(monthlyDataMap)
  };

  return sendResponse(res, 200, true, 'Categories retrieved', categories, {
    page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / take), stats
  });
};

export const updateCategory = async (req, res) => {
  const { name, code } = req.body;
  const existing = await prisma.designcategory.findUnique({ where: { id: parseInt(req.params.id) } });
  if (!existing || existing.deletedAt) return sendResponse(res, 404, false, 'Not found');

  const updated = await prisma.designcategory.update({
    where: { id: parseInt(req.params.id) },
    data: { name, code }
  });
  return sendResponse(res, 200, true, 'Updated', updated);
};

export const deleteCategory = async (req, res) => {
  const existing = await prisma.designcategory.findUnique({ where: { id: parseInt(req.params.id) } });
  if (!existing || existing.deletedAt) return sendResponse(res, 404, false, 'Not found');

  await prisma.designcategory.update({
    where: { id: parseInt(req.params.id) },
    data: { deletedAt: new Date() }
  });
  return sendResponse(res, 200, true, 'Deleted');
};
