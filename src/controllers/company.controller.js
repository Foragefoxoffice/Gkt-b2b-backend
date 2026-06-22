import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';

export const createCompany = async (req, res) => {
  const { name, status, address, gst, phone } = req.body;
  const logo = req.file ? `/uploads/companies/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${req.file.filename}` : null;
  
  const existing = await prisma.company.findFirst({
    where: { name, deletedAt: null }
  });
  if (existing) {
    return sendResponse(res, 400, false, 'Company with this name already exists');
  }

  const company = await prisma.company.create({
    data: { 
      name, 
      logo,
      address,
      gst,
      phone,
      status: status === undefined ? true : (status === 'true' || status === true)
    }
  });
  return sendResponse(res, 201, true, 'Company created successfully', company);
};

export const getCompanies = async (req, res) => {
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' }
  });
  return sendResponse(res, 200, true, 'Companies retrieved successfully', companies);
};

export const updateCompany = async (req, res) => {
  const { name, status, address, gst, phone } = req.body;
  const { id } = req.params;

  const company = await prisma.company.findUnique({
    where: { id: parseInt(id) }
  });
  if (!company || company.deletedAt) {
    return sendResponse(res, 404, false, 'Company not found');
  }

  if (name) {
    const existing = await prisma.company.findFirst({
      where: { name, id: { not: parseInt(id) }, deletedAt: null }
    });
    if (existing) {
      return sendResponse(res, 400, false, 'Another company with this name already exists');
    }
  }

  const logo = req.file ? `/uploads/companies/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${req.file.filename}` : company.logo;

  const updated = await prisma.company.update({
    where: { id: parseInt(id) },
    data: { 
      name: name || company.name,
      logo,
      address: address !== undefined ? address : company.address,
      gst: gst !== undefined ? gst : company.gst,
      phone: phone !== undefined ? phone : company.phone,
      status: status === undefined ? company.status : (status === 'true' || status === true)
    }
  });
  return sendResponse(res, 200, true, 'Company updated successfully', updated);
};

export const deleteCompany = async (req, res) => {
  const { id } = req.params;

  const company = await prisma.company.findUnique({
    where: { id: parseInt(id) }
  });
  if (!company || company.deletedAt) {
    return sendResponse(res, 404, false, 'Company not found');
  }

  await prisma.company.update({
    where: { id: parseInt(id) },
    data: { deletedAt: new Date() }
  });
  return sendResponse(res, 200, true, 'Company deleted successfully');
};
