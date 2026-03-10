import { Module } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [ConfigModule],
  controllers: [EnrollmentController],
  providers: [EnrollmentService, PrismaService],
})
export class EnrollmentModule {}
