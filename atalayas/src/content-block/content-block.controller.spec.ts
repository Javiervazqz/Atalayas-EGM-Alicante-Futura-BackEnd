import { Test, TestingModule } from '@nestjs/testing';
import { ContentBlockController } from './content-block.controller';
import { ContentBlockService } from './content-block.service';

describe('ContentBlockController', () => {
  let controller: ContentBlockController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentBlockController],
      providers: [ContentBlockService],
    }).compile();

    controller = module.get<ContentBlockController>(ContentBlockController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
