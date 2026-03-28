import { prisma } from './src/shared/database/prisma';

async function main() {
  const user = await prisma.user.update({
    where: { email: 'admin@acme.test' },
    data: { role: 'super_admin' },
  });
  console.log('Updated user role to:', user.role);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
