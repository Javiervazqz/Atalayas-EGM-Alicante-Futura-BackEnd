import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { DocumentModule } from './document/document.module';
import { CompanyModule } from './company/company.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { StorageModule } from './storage/storage.module';
import { ContentModule } from './content/content.module';
import { ServicesModule } from './services/services.module';
import {MailerModule} from '@nestjs-modules/mailer';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CompanyModule,
    CoursesModule,
    DocumentModule,
    EnrollmentModule,
    StorageModule,
    ContentModule,
    ServicesModule,
    MailerModule.forRoot({
      transport: {
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "551f1f8284f530",
    pass: "b194cce3ad7aa3"
  },
},
      defaults: {
        from: '"Atalayas" <noreply@atalayas.com>'
      },
}),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
