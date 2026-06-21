import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';
import bcrypt from 'bcrypt';

// Generate Buyer Code (e.g. BUY-0001)
const generateBuyerCode = async () => {
  const lastBuyer = await prisma.buyer.findFirst({
    orderBy: { id: 'desc' }
  });
  if (!lastBuyer || !lastBuyer.code) return 'BUY-0001';
  
  const parts = lastBuyer.code.split('-');
  const lastNum = parts.length > 1 ? parseInt(parts[1]) : NaN;
  
  if (isNaN(lastNum)) {
    // If the last code wasn't in the expected format, just count total buyers or fallback
    const count = await prisma.buyer.count();
    return `BUY-${String(count + 1).padStart(4, '0')}`;
  }
  
  return `BUY-${String(lastNum + 1).padStart(4, '0')}`;
};

export const createBuyer = async (req, res) => {
  const { code, name, firmId, mobile, mobile2, email, gst, pan, stateCode, branchName, billingAddress, shippingAddress, branches, password } = req.body;
  
  try {
    const result = await prisma.$transaction(async (tx) => {
      const finalCode = code || await generateBuyerCode();
      
      const buyer = await tx.buyer.create({
        data: {
          code: finalCode, name, firmId: parseInt(firmId), mobile, mobile2, email, gst, pan, stateCode, branchName, billingAddress, shippingAddress,
          branches: {
            create: branches || []
          }
        },
        include: { branches: true }
      });

      // Auto-generate User credentials for buyer
      if (email) {
        const buyerRole = await tx.role.findUnique({ where: { name: 'BUYER' } });
        if (buyerRole) {
          const generatedPassword = Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 10);
          const defaultPassword = await bcrypt.hash(generatedPassword, 10);
          await tx.user.create({
            data: {
              email: email,
              password: defaultPassword,
              name: name,
              roleId: buyerRole.id,
              phone: mobile
            }
          });

          // Send credentials via email
          const { sendCredentialsEmail } = await import('../services/email.service.js');
          // intentionally non-blocking email send
          sendCredentialsEmail(email, name, generatedPassword).catch(e => console.error(e));
        }
      }

      return buyer;
    });
    
    return sendResponse(res, 201, true, 'Buyer created successfully', result);
  } catch (error) {
    throw error;
  }
};

export const getBuyers = async (req, res) => {
  const { search, firmId, page = 1, limit = 20 } = req.query;
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = { deletedAt: null };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { email: { contains: search } }
    ];
  }
  if (firmId) {
    where.firmId = parseInt(firmId);
  }

  const [buyers, total] = await Promise.all([
    prisma.buyer.findMany({
      where, skip, take, orderBy: { createdAt: 'desc' },
      include: { firm: true, branches: true }
    }),
    prisma.buyer.count({ where })
  ]);

  return sendResponse(res, 200, true, 'Buyers retrieved', buyers, {
    page: parseInt(page), limit: parseInt(limit), total,
    totalPages: Math.ceil(total / take)
  });
};

export const getBuyerById = async (req, res) => {
  const buyer = await prisma.buyer.findUnique({
    where: { id: parseInt(req.params.id) },
    include: { firm: true, branches: true }
  });

  if (!buyer || buyer.deletedAt) return sendResponse(res, 404, false, 'Buyer not found');
  return sendResponse(res, 200, true, 'Buyer retrieved', buyer);
};

export const updateBuyer = async (req, res) => {
  const { code, name, firmId, mobile, mobile2, email, gst, pan, stateCode, branchName, billingAddress, shippingAddress } = req.body;
  const buyerId = parseInt(req.params.id);

  const buyer = await prisma.buyer.findUnique({ where: { id: buyerId } });
  if (!buyer || buyer.deletedAt) return sendResponse(res, 404, false, 'Buyer not found');

  const updatedBuyer = await prisma.buyer.update({
    where: { id: buyerId },
    data: { code, name, firmId: parseInt(firmId), mobile, mobile2, email, gst, pan, stateCode, branchName, billingAddress, shippingAddress }
  });

  return sendResponse(res, 200, true, 'Buyer updated', updatedBuyer);
};

export const deleteBuyer = async (req, res) => {
  const buyerId = parseInt(req.params.id);
  const buyer = await prisma.buyer.findUnique({ where: { id: buyerId } });
  if (!buyer || buyer.deletedAt) return sendResponse(res, 404, false, 'Buyer not found');

  await prisma.buyer.update({
    where: { id: buyerId },
    data: { deletedAt: new Date() }
  });
  return sendResponse(res, 200, true, 'Buyer deleted');
};
