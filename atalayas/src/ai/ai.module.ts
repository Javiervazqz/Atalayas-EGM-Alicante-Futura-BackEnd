import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AiModule, AuthModule],
  providers: [AiService],
  exports: [AiService], // 👈 AÑADIMOS ESTO
})
export class AiModule {}
