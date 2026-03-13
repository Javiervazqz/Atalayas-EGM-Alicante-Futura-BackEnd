import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ContentBlockService } from './content-block.service';
import { CreateContentBlockDto } from './dto/create-content-block.dto';
import { UpdateContentBlockDto } from './dto/update-content-block.dto';

@Controller('courses/:courseId/content/:contentId/content-block')
export class ContentBlockController {
  constructor(private readonly contentBlockService: ContentBlockService) {}

  @Post()
  create(@Body() createContentBlockDto: CreateContentBlockDto) {
    return this.contentBlockService.create(createContentBlockDto);
  }

  @Get()
  findAll() {
    return this.contentBlockService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contentBlockService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateContentBlockDto: UpdateContentBlockDto) {
    return this.contentBlockService.update(+id, updateContentBlockDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contentBlockService.remove(+id);
  }
}
