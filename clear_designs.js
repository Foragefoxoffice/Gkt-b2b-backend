import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDesigns() {
  try {
    console.log('Clearing dispatch items...');
    await prisma.dispatchitem.deleteMany({});
    
    console.log('Clearing dispatches...');
    await prisma.dispatch.deleteMany({});
    
    console.log('Clearing order items...');
    await prisma.orderitem.deleteMany({});
    
    console.log('Clearing approvals...');
    await prisma.approval.deleteMany({});
    
    console.log('Clearing cart items...');
    await prisma.cartitem.deleteMany({});

    console.log('Clearing cart...');
    await prisma.cart.deleteMany({});
    
    console.log('Clearing orders...');
    await prisma.order.deleteMany({});

    console.log('Clearing inventory transactions...');
    await prisma.inventorytransaction.deleteMany({});

    console.log('Clearing product request items...');
    await prisma.productrequestitem.deleteMany({});

    console.log('Clearing product requests...');
    await prisma.productrequest.deleteMany({});
    
    console.log('Clearing looms...');
    await prisma.loom.deleteMany({});

    console.log('Clearing designs...');
    await prisma.design.deleteMany({});
    
    console.log('Successfully emptied design table (and dependent tables)!');
  } catch (err) {
    console.error('Error clearing tables:', err);
  } finally {
    await prisma.$disconnect();
  }
}

clearDesigns();
