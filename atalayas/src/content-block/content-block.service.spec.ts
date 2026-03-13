import { Test, TestingModule } from '@nestjs/testing';
import { ContentBlockService } from './content-block.service';

describe('ContentBlockService', () => {
  let service: ContentBlockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentBlockService],
    }).compile();

    service = module.get<ContentBlockService>(ContentBlockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
