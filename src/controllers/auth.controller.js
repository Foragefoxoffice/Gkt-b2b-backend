import * as authService from '../services/auth.service.js';
import { sendResponse } from '../utils/response.js';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client.js';
import { emitToRole } from '../socket.js';

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return sendResponse(res, 400, false, 'Email and password are required');
  }

  const result = await authService.login(email, password);
  
  if (result.requiresOtp) {
    return sendResponse(res, 200, true, 'OTP required', result);
  }

  // Set refresh token in HTTP-only cookie
  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return sendResponse(res, 200, true, 'Login successful', {
    user: result.user,
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken
  });
};

export const verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;
  if (!userId || !otp) {
    return sendResponse(res, 400, false, 'User ID and OTP are required');
  }

  const result = await authService.verifyOtp(userId, otp);

  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return sendResponse(res, 200, true, 'OTP verified successfully', {
    user: result.user,
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken
  });
};

export const refreshToken = async (req, res) => {
  // Try to get token from cookies or body
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  
  const tokens = await authService.refreshToken(token);

  // Set new refresh token
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return sendResponse(res, 200, true, 'Token refreshed', {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken
  });
};

export const logout = async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      if (decoded && decoded.id) {
        await prisma.userlog.create({
          data: {
            userId: decoded.id,
            action: 'LOGOUT',
            ipAddress: req.ip || req.connection.remoteAddress,
          }
        });
        
        if (decoded.roleName === 'BUYER') {
          emitToRole('SUPER_ADMIN', 'newBuyerLog', { userId: decoded.id, action: 'LOGOUT' });
          emitToRole('ADMIN', 'newBuyerLog', { userId: decoded.id, action: 'LOGOUT' });
        }
      }
    } catch (error) {
      // Ignore token verification errors on logout
    }
  }

  res.clearCookie('refreshToken');
  return sendResponse(res, 200, true, 'Logged out successfully');
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return sendResponse(res, 400, false, 'Email is required');
  }

  const result = await authService.forgotPassword(email);
  return sendResponse(res, 200, true, 'OTP sent to registered email', result);
};

export const resetPassword = async (req, res) => {
  const { userId, otp, newPassword } = req.body;
  if (!userId || !otp || !newPassword) {
    return sendResponse(res, 400, false, 'User ID, OTP and new password are required');
  }

  await authService.resetPassword(userId, otp, newPassword);
  return sendResponse(res, 200, true, 'Password reset successfully');
};
