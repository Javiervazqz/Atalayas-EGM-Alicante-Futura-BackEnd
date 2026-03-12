import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { DocumentModule } from './document/document.module';
import { CompanyModule } from './company/company.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { ContentModule } from './content/content.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    CompanyModule,
    CoursesModule,
    DocumentModule,
    EnrollmentModule,
    ContentModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
