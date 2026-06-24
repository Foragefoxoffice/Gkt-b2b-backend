import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Truncating all tables...');

  // Disable foreign key checks
  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`);

  const tables = [
    'approval', 'buyer', 'buyerbranch', 'cart', 'cartitem', 'company',
    'design', 'designcategory', 'dispatch', 'dispatchitem', 'firm',
    'inventorytransaction', 'loom', 'notification', 'order', 'orderitem',
    'productrequest', 'productrequestitem', 'role', 'transporter', 'user', 'weaver'
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\`;`);
      console.log(`Truncated ${table}`);
    } catch (e) {
      console.error(`Failed to truncate ${table}:`, e.message);
    }
  }

  // Re-enable foreign key checks
  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1;`);

  console.log('Creating Roles...');
  
  // Create Roles
  const adminRole = await prisma.role.create({
    data: { name: 'ADMIN' },
  });

  const buyerRole = await prisma.role.create({
    data: { name: 'BUYER' },
  });

  // Create Admin User
  console.log('Creating Admin User...');
  const hashedPassword = await bcrypt.hash('Ambigaasilks@#2k26', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'ambigaasilks@gmail.com',
      password: hashedPassword,
      name: 'Admin',
      roleId: adminRole.id,
    },
  });

  console.log('Database seeded successfully!');
  console.log('---');
  console.log('Admin Account:');
  console.log('Email: ambigaasilks@gmail.com');
  console.log('Password: Ambigaasilks@#2k26');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
