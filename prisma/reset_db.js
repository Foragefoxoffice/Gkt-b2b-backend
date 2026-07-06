import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Truncating all tables EXCEPT role...');

  // Disable foreign key checks
  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`);

  const tables = [
    'approval', 'buyer', 'buyerbranch', 'cart', 'cartitem', 'company',
    'design', 'designcategory', 'dispatch', 'dispatchitem', 'firm',
    'inventorytransaction', 'loom', 'notification', 'order', 'orderitem',
    'productrequest', 'productrequestitem', 'transporter', 'user', 'weaver'
  ]; // Excluded 'role'

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

  console.log('Fetching super admin role...');
  
  // Find or Create Super Admin Role
  let superAdminRole = await prisma.role.findUnique({
    where: { name: 'SUPER_ADMIN' }
  });

  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: { name: 'SUPER_ADMIN' },
    });
    console.log('Created SUPER_ADMIN role.');
  }

  // Create Admin User
  console.log('Creating Admin User...');
  const hashedPassword = await bcrypt.hash('Ambigaasilks@#2k26', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'ambigaasilks@gmail.com',
      password: hashedPassword,
      name: 'System Admin',
      roleId: superAdminRole.id,
    },
  });

  console.log('Database operation completed successfully!');
  console.log('---');
  console.log('Admin Account:');
  console.log('Email: ambigaasilks@gmail.com');
  console.log('Password: Ambigaasilks@#2k26');
  console.log(`Role: ${superAdminRole.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
