import { Module } from '@nestjs/common';
import { ContentBlockService } from './content-block.service';
import { ContentBlockController } from './content-block.controller';

@Module({
  controllers: [ContentBlockController],
  providers: [ContentBlockService],
})
export class ContentBlockModule {}
