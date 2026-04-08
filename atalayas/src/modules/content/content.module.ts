import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuthModule } from '../../modules/auth/auth.module';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule],
  controllers: [ContentController],
  providers: [ContentService, PrismaService],
})
export class ContentModule {}
