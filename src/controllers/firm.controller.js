import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';

export const createFirm = async (req, res) => {
  const { name, address, gstNumber, panNumber, mobile, email, status } = req.body;
  
  const firm = await prisma.firm.create({
    data: { name, address, gstNumber, panNumber, mobile, email, status }
  });
  
  return sendResponse(res, 201, true, 'Firm created successfully', firm);
};

export const getFirms = async (req, res) => {
  const { search, status, page = 1, limit = 20 } = req.query;
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = { deletedAt: null };
  if (search) {
    where.name = { contains: search };
  }
  if (status !== undefined) {
    where.status = status === 'true';
  }

  const [firms, total] = await Promise.all([
    prisma.firm.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.firm.count({ where })
  ]);

  return sendResponse(res, 200, true, 'Firms retrieved successfully', firms, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / take)
  });
};

export const getFirmById = async (req, res) => {
  const firm = await prisma.firm.findUnique({
    where: { id: parseInt(req.params.id) }
  });

  if (!firm || firm.deletedAt) {
    return sendResponse(res, 404, false, 'Firm not found');
  }

  return sendResponse(res, 200, true, 'Firm retrieved successfully', firm);
};

export const updateFirm = async (req, res) => {
  const { name, address, gstNumber, panNumber, mobile, email, status } = req.body;
  
  const firm = await prisma.firm.findUnique({ where: { id: parseInt(req.params.id) } });
  if (!firm || firm.deletedAt) return sendResponse(res, 404, false, 'Firm not found');

  const updatedFirm = await prisma.firm.update({
    where: { id: parseInt(req.params.id) },
    data: { name, address, gstNumber, panNumber, mobile, email, status }
  });

  return sendResponse(res, 200, true, 'Firm updated successfully', updatedFirm);
};

export const deleteFirm = async (req, res) => {
  const firm = await prisma.firm.findUnique({ where: { id: parseInt(req.params.id) } });
  if (!firm || firm.deletedAt) return sendResponse(res, 404, false, 'Firm not found');

  await prisma.firm.update({
    where: { id: parseInt(req.params.id) },
    data: { deletedAt: new Date() }
  });

  return sendResponse(res, 200, true, 'Firm deleted successfully');
};
