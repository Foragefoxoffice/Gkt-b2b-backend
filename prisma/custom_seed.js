import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing old data...');

  // Delete all users and roles to start fresh
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});

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
