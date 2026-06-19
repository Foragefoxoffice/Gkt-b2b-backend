import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearTables() {
  try {
    console.log('Clearing dispatch items...');
    await prisma.dispatchItem.deleteMany({});
    
    console.log('Clearing dispatches...');
    await prisma.dispatch.deleteMany({});
    
    console.log('Clearing order items...');
    await prisma.orderItem.deleteMany({});
    
    console.log('Clearing approvals...');
    await prisma.approval.deleteMany({});
    
    console.log('Clearing cart items (linked to orders sometimes)...');
    await prisma.cartItem.deleteMany({});

    console.log('Clearing cart...');
    await prisma.cart.deleteMany({});
    
    console.log('Clearing orders...');
    await prisma.order.deleteMany({});
    
    console.log('Successfully emptied order and dispatch tables!');
  } catch (err) {
    console.error('Error clearing tables:', err);
  } finally {
    await prisma.$disconnect();
  }
}

clearTables();
