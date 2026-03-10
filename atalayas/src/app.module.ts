import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { CompanyModule } from './company/company.module';
import { CourseModule } from './course/course.module';
import { DocumentModule } from './document/document.module';
import { ContentModule } from './content/content.module';
import { EnrollmentModule } from './enrollment/enrollment.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    UserModule,
    CompanyModule,
    CourseModule,
    DocumentModule,
    ContentModule,
    EnrollmentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
