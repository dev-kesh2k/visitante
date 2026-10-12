// Idempotente: roda a cada publicação. Cria o admin inicial só quando não existe nenhum.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@visitante.app').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || 'Administrador';
  if (!password) throw new Error('SEED_ADMIN_PASSWORD não definido');

  if ((await prisma.user.count({ where: { role: 'admin' } })) === 0) {
    await prisma.user.upsert({
      where: { email },
      update: { role: 'admin' },
      create: { email, name, role: 'admin', jobTitle: 'Administrador', passwordHash: await bcrypt.hash(password, 10) },
    });
    console.log(`Admin criado: ${email}`);
  }
  await prisma.setting.upsert({ where: { key: 'companyName' }, update: {}, create: { key: 'companyName', value: 'Minha Empresa' } });
  await prisma.setting.upsert({ where: { key: 'allowRegister' }, update: {}, create: { key: 'allowRegister', value: 'false' } });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
