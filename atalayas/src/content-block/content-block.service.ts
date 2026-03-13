import { Injectable } from '@nestjs/common';
import { CreateContentBlockDto } from './dto/create-content-block.dto';
import { UpdateContentBlockDto } from './dto/update-content-block.dto';

@Injectable()
export class ContentBlockService {
  create(createContentBlockDto: CreateContentBlockDto) {
    return 'This action adds a new contentBlock';
  }

  findAll() {
    return `This action returns all contentBlock`;
  }

  findOne(id: number) {
    return `This action returns a #${id} contentBlock`;
  }

  update(id: number, updateContentBlockDto: UpdateContentBlockDto) {
    return `This action updates a #${id} contentBlock`;
  }

  remove(id: number) {
    return `This action removes a #${id} contentBlock`;
  }
}
