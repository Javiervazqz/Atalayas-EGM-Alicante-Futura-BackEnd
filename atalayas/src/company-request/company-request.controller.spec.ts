import { Test, TestingModule } from '@nestjs/testing';
import { CompanyRequestController } from './company-request.controller';
import { CompanyRequestService } from './company-request.service';

describe('CompanyRequestController', () => {
  let controller: CompanyRequestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyRequestController],
      providers: [CompanyRequestService],
    }).compile();

    controller = module.get<CompanyRequestController>(CompanyRequestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
