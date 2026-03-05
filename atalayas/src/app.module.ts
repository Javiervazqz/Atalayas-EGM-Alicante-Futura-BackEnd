import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseService } from './supabase/supabase.service';

@Module({
  imports: [SupabaseModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService, SupabaseService],
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
})
export class AppModule {}
