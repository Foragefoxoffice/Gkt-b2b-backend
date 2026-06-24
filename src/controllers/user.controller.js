import bcrypt from 'bcrypt';
import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';

export const getProfile = async (req, res) => {
  let user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, name: true, phone: true, avatar: true, role: true }
  });

  if (!user) {
    return sendResponse(res, 404, false, 'User not found');
  }

  let companyData = null;
  if (user.role && user.role.name === 'BUYER') {
    const buyer = await prisma.buyer.findFirst({
      where: { email: user.email },
      include: { firm: { include: { company: true } } }
    });
    
    if (buyer && buyer.firm) {
      companyData = {
        firmName: buyer.firm.name,
        companyName: buyer.firm.company ? buyer.firm.company.name : buyer.firm.name,
        logo: (buyer.firm.company && buyer.firm.company.logo) ? buyer.firm.company.logo : (buyer.firm.logo || null)
      };
    }
  }

  const profileResponse = {
    ...user,
    role: user.role?.name || user.role,
    firmName: companyData ? companyData.firmName : null,
    companyName: companyData ? companyData.companyName : null,
    companyLogo: companyData ? companyData.logo : null,
  };

  return sendResponse(res, 200, true, 'Profile fetched successfully', profileResponse);
};

export const updateProfile = async (req, res) => {
  const { name, phone } = req.body;
  
  let avatarPath;
  if (req.file) {
     const date = new Date();
     const year = date.getFullYear();
     const month = String(date.getMonth() + 1).padStart(2, '0');
     avatarPath = `/uploads/users/${year}/${month}/${req.file.filename}`;
  }

  const updateData = { name, phone };
  if (avatarPath) {
    updateData.avatar = avatarPath;
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: updateData,
    select: { id: true, email: true, name: true, phone: true, avatar: true, role: true }
  });

  const profileResponse = {
    ...user,
    role: user.role?.name || user.role,
  };

  return sendResponse(res, 200, true, 'Profile updated successfully', profileResponse);
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return sendResponse(res, 400, false, 'Current and new password are required');
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return sendResponse(res, 404, false, 'User not found');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return sendResponse(res, 400, false, 'Incorrect current password');
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedNewPassword }
  });

  return sendResponse(res, 200, true, 'Password changed successfully');
};
