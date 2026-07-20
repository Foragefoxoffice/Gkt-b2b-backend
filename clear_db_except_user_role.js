import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function clearUploads() {
  const uploadsDir = path.join(__dirname, 'uploads');
  if (fs.existsSync(uploadsDir)) {
    console.log('Clearing uploads directory...');
    const files = fs.readdirSync(uploadsDir);
    for (const file of files) {
      const curPath = path.join(uploadsDir, file);
      fs.rmSync(curPath, { recursive: true, force: true });
      console.log(`Deleted upload resource: ${file}`);
    }
    
    // Recreate base directories to keep structure clean
    const baseDirs = ['companies', 'designs', 'orders', 'users'];
    for (const baseDir of baseDirs) {
      fs.mkdirSync(path.join(uploadsDir, baseDir), { recursive: true });
    }
    console.log('Successfully cleared uploads directory!');
  } else {
    console.log('Uploads directory not found, skipping clearing uploads.');
  }
}

async function main() {
  console.log('Truncating all tables except user and role...');

  // Disable foreign key checks
  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`);

  const tables = [
    'approval', 'buyer', 'buyerbranch', 'cart', 'cartitem', 'company',
    'design', 'designcategory', 'dispatch', 'dispatchitem', 'firm',
    'inventorytransaction', 'loom', 'notification', 'order', 'orderitem',
    'productrequest', 'productrequestitem', 'transporter', 'weaver', 'userlog'
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

  // Clear uploads
  clearUploads();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
