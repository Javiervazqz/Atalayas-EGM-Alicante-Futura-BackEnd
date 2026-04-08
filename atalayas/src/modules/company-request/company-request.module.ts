import { Module } from '@nestjs/common';
import { CompanyRequestService } from './company-request.service';
import { CompanyRequestController } from './company-request.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { AuthModule } from '../../modules/auth/auth.module';
@Module({
  imports: [PrismaModule, MailerModule, AuthModule],
  controllers: [CompanyRequestController],
  providers: [CompanyRequestService],
})
export class CompanyRequestModule {}
