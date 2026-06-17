import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client.js';

const generateTokens = (user, roleName) => {
  const payload = { id: user.id, email: user.email, roleId: user.roleId, roleName };
  
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  
  return { accessToken, refreshToken };
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

  const tokens = generateTokens(user, user.role.name);
  
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      avatar: user.avatar,
    },
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
