import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule, StorageModule],
  controllers: [CompanyController],
  providers: [CompanyService],
})
export class CompanyModule {}
