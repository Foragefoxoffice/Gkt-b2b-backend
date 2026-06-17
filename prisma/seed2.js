import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding Firm and Buyer record...');

  // Create Firm
  const firm = await prisma.firm.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Test Firm Inc',
      email: 'firm@gkt.com',
      mobile: '1234567890',
    },
  });

  // Create Buyer linked to firm and user email
  const buyer = await prisma.buyer.upsert({
    where: { code: 'BUYER001' },
    update: { email: 'buyer@gkt.com' },
    create: {
      code: 'BUYER001',
      name: 'Test Buyer',
      email: 'buyer@gkt.com',
      firmId: firm.id,
      mobile: '9876543210'
    },
  });

  // Since I saw in the screenshot that the user used `actewpdeveloper1@gmail.com`, 
  // I will also create a buyer for that email just in case they are logged in with it.
  const user = await prisma.user.findFirst({ where: { email: 'actewpdeveloper1@gmail.com' }});
  
  if (user) {
    await prisma.buyer.upsert({
      where: { code: 'BUYER002' },
      update: { email: 'actewpdeveloper1@gmail.com' },
      create: {
        code: 'BUYER002',
        name: 'Actewp Developer',
        email: 'actewpdeveloper1@gmail.com',
        firmId: firm.id,
      },
    });
    console.log('Added buyer for actewpdeveloper1@gmail.com');
  }

  console.log('Successfully created Firm and Buyer records!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
