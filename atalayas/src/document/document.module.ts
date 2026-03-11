import { Module } from '@nestjs/common';
import { DocumentService } from './document.service.js';
import { DocumentController } from './document.controller.js';
import { ConfigModule } from '@nestjs/config';

// Importamos los módulos de seguridad y base de datos
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule],
  controllers: [DocumentController],
  providers: [DocumentService],
})
export class DocumentModule {}
