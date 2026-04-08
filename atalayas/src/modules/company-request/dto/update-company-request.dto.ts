import { PartialType } from '@nestjs/swagger';
import { CreateCompanyRequestDto } from './create-company-request.dto';

export class UpdateCompanyRequestDto extends PartialType(CreateCompanyRequestDto) {}
