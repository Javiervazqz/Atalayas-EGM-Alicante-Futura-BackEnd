import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { DocumentModule } from './document/document.module';
import { CompanyModule } from './company/company.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    CompanyModule,
    CoursesModule,
    DocumentModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
