import { Module } from '@nestjs/common';
import { DocumentService } from './document.service.js';
import { DocumentController } from './document.controller.js';
import { ConfigModule } from '@nestjs/config';

// Importamos los módulos de seguridad y base de datos
import { PrismaModule } from '../../infrastructure/prisma/prisma.module.js';
import { AuthModule } from '../../modules/auth/auth.module.js';
import { StorageModule } from '../../infrastructure/storage/storage.module.js';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule, StorageModule],
  controllers: [DocumentController],
  providers: [DocumentService],
})
export class DocumentModule {}
