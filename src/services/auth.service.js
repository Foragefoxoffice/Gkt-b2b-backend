import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client.js';
import { emitToRole } from '../socket.js';

const generateTokens = (user, roleName) => {
  const payload = { id: user.id, email: user.email, roleId: user.roleId, roleName };
  
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  
  return { accessToken, refreshToken };
};

const getUserResponseData = async (user) => {
  let companyData = null;
  if (user.role.name === 'BUYER') {
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

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role.name,
    avatar: user.avatar,
    firmName: companyData ? companyData.firmName : null,
    companyName: companyData ? companyData.companyName : null,
    companyLogo: companyData ? companyData.logo : null,
  };
};

export const login = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true }
  });

  if (!user || user.deletedAt) {
    throw { status: 401, message: 'Invalid credentials or account disabled' };
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw { status: 401, message: 'Invalid credentials' };
  }

  // OTP Verification logic for BUYER role
  if (user.role.name === 'BUYER') {
    const now = new Date();
    // Check if lastLoginAt is null or more than 24 hours ago
    const hoursSinceLastLogin = user.lastLoginAt 
      ? (now.getTime() - new Date(user.lastLoginAt).getTime()) / (1000 * 60 * 60)
      : Infinity;

    if (hoursSinceLastLogin >= 24) {
      // Generate a 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now

      // Save OTP to user
      await prisma.user.update({
        where: { id: user.id },
        data: { otpCode, otpExpiresAt }
      });

      // Import inside the block to avoid circular dependencies or top-level issues if any
      const { sendEmailOtp } = await import('./email.service.js');
      await sendEmailOtp(user.email, otpCode);

      if (user.phone) {
        const { sendWhatsappOtp } = await import('./whatsapp.service.js');
        await sendWhatsappOtp(user.phone, otpCode);
      }

      return {
        requiresOtp: true,
        user: {
          id: user.id,
          email: user.email
        }
      };
    }
  }

  // Normal login flow (or after OTP verification)
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  await prisma.userlog.create({
    data: {
      userId: user.id,
      action: 'LOGIN',
      ipAddress: null, // Note: To get IP we would need to pass it from the controller, but this is fine for now or we can update later
    }
  });

  if (user.role.name === 'BUYER') {
    emitToRole('SUPER_ADMIN', 'newBuyerLog', { userId: user.id, action: 'LOGIN' });
    emitToRole('ADMIN', 'newBuyerLog', { userId: user.id, action: 'LOGIN' });
  }

  const tokens = generateTokens(user, user.role.name);
  const userResponse = await getUserResponseData(user);
  
  return {
    user: userResponse,
    tokens
  };
};

export const verifyOtp = async (userId, otpCode) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true }
  });

  if (!user || user.deletedAt) {
    throw { status: 401, message: 'User not found or disabled' };
  }

  if (!user.otpCode || user.otpCode !== otpCode) {
    throw { status: 400, message: 'Invalid OTP' };
  }

  const now = new Date();
  if (!user.otpExpiresAt || new Date(user.otpExpiresAt) < now) {
    throw { status: 400, message: 'OTP has expired' };
  }

  // OTP is valid, clear it and update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { 
      otpCode: null, 
      otpExpiresAt: null,
      lastLoginAt: now 
    }
  });

  await prisma.userlog.create({
    data: {
      userId: user.id,
      action: 'LOGIN',
    }
  });

  if (user.role.name === 'BUYER') {
    emitToRole('SUPER_ADMIN', 'newBuyerLog', { userId: user.id, action: 'LOGIN' });
    emitToRole('ADMIN', 'newBuyerLog', { userId: user.id, action: 'LOGIN' });
  }

  const tokens = generateTokens(user, user.role.name);
  const userResponse = await getUserResponseData(user);

  return {
    user: userResponse,
    tokens
  };
};

export const refreshToken = async (token) => {
  if (!token) {
    throw { status: 401, message: 'No refresh token provided' };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true }
    });

    if (!user || user.deletedAt) {
      throw { status: 401, message: 'User not found or disabled' };
    }

    const tokens = generateTokens(user, user.role.name);
    return tokens;
  } catch (error) {
    throw { status: 403, message: 'Invalid or expired refresh token' };
  }
};

export const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true }
  });

  if (!user || user.deletedAt) {
    throw { status: 404, message: 'User with this email not found' };
  }

  const now = new Date();
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 mins

  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode, otpExpiresAt }
  });

  const { sendEmailOtp } = await import('./email.service.js');
  await sendEmailOtp(user.email, otpCode);

  if (user.phone) {
    const { sendWhatsappOtp } = await import('./whatsapp.service.js');
    await sendWhatsappOtp(user.phone, otpCode);
  }

  return { userId: user.id };
};

export const resetPassword = async (userId, otpCode, newPassword) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.deletedAt) {
    throw { status: 404, message: 'User not found' };
  }

  if (!user.otpCode || user.otpCode !== otpCode) {
    throw { status: 400, message: 'Invalid OTP' };
  }

  const now = new Date();
  if (!user.otpExpiresAt || new Date(user.otpExpiresAt) < now) {
    throw { status: 400, message: 'OTP has expired' };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      otpCode: null,
      otpExpiresAt: null,
    }
  });

  return { success: true };
};
