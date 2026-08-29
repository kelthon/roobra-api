import 'dotenv/config';
import { hash } from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const user = await prisma.user.create({
    data: {
      username: 'Alice',
      email: 'alice@example.com',
      hashedPassword: await hash('password!123'),
    },
  });

  console.log('Created user:', user);
}

void main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
