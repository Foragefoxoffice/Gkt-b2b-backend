import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';

export const getBuyerLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const buyerId = req.query.buyerId;
    const search = req.query.search;
    const action = req.query.action;

    const where = {
      user: {
        role: {
          name: 'BUYER'
        }
      }
    };

    if (search) {
      where.user.OR = [
        { name: { contains: search } }, // Or whatever syntax SQLite/MySQL/Postgres uses for case-insensitive search
        { email: { contains: search } }
      ];
    }

    if (action && action !== 'ALL') {
      where.action = action;
    }

    if (buyerId) {
      where.userId = parseInt(buyerId);
    }

    const [logs, total] = await Promise.all([
      prisma.userlog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.userlog.count({ where })
    ]);

    return sendResponse(res, 200, true, 'Buyer logs retrieved successfully', {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching buyer logs:', error);
    return sendResponse(res, 500, false, 'Failed to fetch buyer logs');
  }
};
