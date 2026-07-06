import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });

  const buyerRole = await prisma.role.upsert({
    where: { name: 'BUYER' },
    update: {},
    create: { name: 'BUYER' },
  });

  // Create Users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@gkt.com' },
    update: { password: hashedPassword },
    create: {
      email: 'admin@gkt.com',
      password: hashedPassword,
      name: 'System Admin',
      roleId: adminRole.id,
    },
  });

  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@gkt.com' },
    update: { password: hashedPassword },
    create: {
      email: 'buyer@gkt.com',
      password: hashedPassword,
      name: 'Test Buyer',
      roleId: buyerRole.id,
    },
  });

  console.log('Database seeded successfully!');
  console.log('---');
  console.log('Admin Account:');
  console.log('Email: admin@gkt.com');
  console.log('Password: password123');
  console.log('---');
  console.log('Buyer Account:');
  console.log('Email: buyer@gkt.com');
  console.log('Password: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
