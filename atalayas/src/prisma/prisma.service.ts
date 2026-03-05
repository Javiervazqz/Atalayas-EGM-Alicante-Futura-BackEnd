import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config'; // Asegura que lee tu archivo .env

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    // 1. Leemos tu URL secreta
    const connectionString = process.env.DIRECT_URL;

    // 2. Creamos el "Pool" de conexiones (como HikariCP en Java)
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    // 3. Se lo pasamos a Prisma
    super({ adapter });
  }
}
