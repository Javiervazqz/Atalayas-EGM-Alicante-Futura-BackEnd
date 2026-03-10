import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigModule } from '@nestjs/config/dist/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [ContentController],
  providers: [ContentService, PrismaService],
})
export class ContentModule {}
