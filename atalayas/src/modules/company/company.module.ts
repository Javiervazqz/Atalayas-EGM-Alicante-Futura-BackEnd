import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuthModule } from '../../modules/auth/auth.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule, StorageModule],
  controllers: [CompanyController],
  providers: [CompanyService],
})
export class CompanyModule {}
