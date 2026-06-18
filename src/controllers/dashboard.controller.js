import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';

export const getAdminDashboard = async (req, res) => {
  try {
    const totalBuyers = await prisma.buyer.count({ where: { deletedAt: null } });
    const totalOrders = await prisma.order.count({ where: { deletedAt: null } });
    const pendingOrders = await prisma.order.count({ where: { status: 'PENDING', deletedAt: null } });
    const completedOrders = await prisma.order.count({ where: { status: 'COMPLETED', deletedAt: null } });
    const cancelledOrders = await prisma.order.count({ where: { status: 'CANCELLED', deletedAt: null } });

    const orders = await prisma.order.findMany({ where: { deletedAt: null } });
    
    let totalSales = 0;
    let monthlySales = 0;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    orders.forEach(o => {
      if (o.status !== 'CANCELLED') {
        totalSales += o.grandTotal;
        const d = new Date(o.orderDate);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          monthlySales += o.grandTotal;
        }
      }
    });

    const lowStockThreshold = 10;
    const lowStockProducts = await prisma.design.count({
      where: { availableStock: { lt: lowStockThreshold }, deletedAt: null }
    });

    // Mock data for charts if DB queries are too complex for SQLite/MySQL right now
    // In production, we'd use groupBy or raw queries
    const orderStatusDistribution = [
      { name: 'Pending', value: pendingOrders },
      { name: 'Approved', value: await prisma.order.count({ where: { status: 'APPROVED', deletedAt: null } }) },
      { name: 'Processing', value: await prisma.order.count({ where: { status: 'PROCESSING', deletedAt: null } }) },
      { name: 'Completed', value: completedOrders },
      { name: 'Cancelled', value: cancelledOrders },
    ];

    return sendResponse(res, 200, true, 'Admin Dashboard', {
      kpi: {
        totalBuyers, totalOrders, pendingOrders, completedOrders,
        totalSales, monthlySales, lowStockProducts, cancelledOrders
      },
      charts: {
        orderStatusDistribution
      }
    });
  } catch (err) {
    return sendResponse(res, 500, false, 'Dashboard error', err.message);
  }
};

export const getBuyerDashboard = async (req, res) => {
  try {
    const buyer = await prisma.buyer.findFirst({ where: { email: req.user.email } });
    if (!buyer) return sendResponse(res, 404, false, 'Buyer not found');

    const totalOrders = await prisma.order.count({ where: { buyerId: buyer.id, deletedAt: null } });
    const pending = await prisma.order.count({ where: { buyerId: buyer.id, status: 'PENDING', deletedAt: null } });
    const approved = await prisma.order.count({ where: { buyerId: buyer.id, status: 'APPROVED', deletedAt: null } });
    const completed = await prisma.order.count({ where: { buyerId: buyer.id, status: 'COMPLETED', deletedAt: null } });

    const recentOrders = await prisma.order.findMany({
      where: { buyerId: buyer.id, deletedAt: null },
      orderBy: { orderDate: 'desc' },
      take: 3
    });

    const newArrivals = await prisma.design.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 8
    });

    // Chart Data Generation
    const allOrders = await prisma.order.findMany({ where: { buyerId: buyer.id, deletedAt: null } });
    const cancelled = await prisma.order.count({ where: { buyerId: buyer.id, status: 'CANCELLED', deletedAt: null } });
    const processing = await prisma.order.count({ where: { buyerId: buyer.id, status: 'PROCESSING', deletedAt: null } });
    
    // 1. Order Status Distribution
    const orderStatusDistribution = [
      { name: 'Pending', value: pending },
      { name: 'Approved', value: approved },
      { name: 'Processing', value: processing },
      { name: 'Completed', value: completed },
      { name: 'Cancelled', value: cancelled },
    ].filter(item => item.value > 0);

    // 2 & 3. Monthly Trends (Spend & Count)
    const monthlyDataMap = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleString('default', { month: 'short' });
        monthlyDataMap[monthName] = { name: monthName, orders: 0, amount: 0 };
    }

    allOrders.forEach(o => {
      const d = new Date(o.orderDate);
      const monthName = d.toLocaleString('default', { month: 'short' });
      if (monthlyDataMap[monthName]) {
        monthlyDataMap[monthName].orders += 1;
        monthlyDataMap[monthName].amount += o.grandTotal;
      }
    });
    const monthlyTrends = Object.values(monthlyDataMap);

    // 4. Recent Order Values
    const recentOrderValues = allOrders.sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate)).slice(-10).map(o => ({
      name: o.orderNumber,
      amount: o.grandTotal
    }));

    return sendResponse(res, 200, true, 'Buyer Dashboard', {
      summary: { totalOrders, pending, approved, completed },
      recentOrders,
      newArrivals,
      charts: {
        orderStatusDistribution,
        monthlyTrends,
        recentOrderValues
      }
    });
  } catch (err) {
    return sendResponse(res, 500, false, 'Dashboard error', err.message);
  }
};
