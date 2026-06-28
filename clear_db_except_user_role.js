import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Truncating all tables except user and role...');

  // Disable foreign key checks
  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`);

  const tables = [
    'approval', 'buyer', 'buyerbranch', 'cart', 'cartitem', 'company',
    'design', 'designcategory', 'dispatch', 'dispatchitem', 'firm',
    'inventorytransaction', 'loom', 'notification', 'order', 'orderitem',
    'productrequest', 'productrequestitem', 'transporter', 'weaver'
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

  console.log('Successfully emptied all tables except user and role!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
