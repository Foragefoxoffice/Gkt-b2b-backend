import jwt from 'jsonwebtoken';
import { sendResponse } from '../utils/response.js';

export const authGuard = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendResponse(res, 401, false, 'Access denied. No token provided.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Contains id, role, email
    next();
  } catch (ex) {
    return sendResponse(res, 401, false, 'Invalid token.');
  }
};

export const roleGuard = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.roleName)) {
      return sendResponse(res, 403, false, 'Access denied. Insufficient permissions.');
    }
    next();
  };
};
