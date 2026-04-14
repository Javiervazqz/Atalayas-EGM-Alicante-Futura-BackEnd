import { Module, forwardRef } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from '../../modules/storage/storage.controller';
import { AuthModule } from '../../modules/auth/auth.module'; // Lo volvemos a importar
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthModule), // 👈 Magia anti-bucles infinitos
  ],
  providers: [StorageService],
  controllers: [StorageController],
  exports: [StorageService],
})
export class StorageModule {}
