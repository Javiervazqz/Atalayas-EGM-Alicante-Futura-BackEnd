import { Module } from '@nestjs/common';
import { CompanyRequestService } from './company-request.service';
import { CompanyRequestController } from './company-request.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { AuthModule } from 'src/auth/auth.module';
@Module({
  imports: [PrismaModule, MailerModule, AuthModule],
  controllers: [CompanyRequestController],
  providers: [CompanyRequestService],
})
export class CompanyRequestModule {}
