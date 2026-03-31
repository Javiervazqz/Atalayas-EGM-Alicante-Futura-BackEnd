import { Module } from '@nestjs/common';
import { ChatBotController } from './chatbot.controller';
import { ChatBotService } from './chatbot.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ChatBotController],
  providers: [ChatBotService],
})
export class ChatBotModule {}
