import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthGuard } from '../../common/guards/auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
@ApiTags('Content')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('courses/:courseId/content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @Roles('ADMIN', 'GENERAL_ADMIN')
  async create(
    @Body() createContentDto: CreateContentDto,
    @Req() req: Request,
    @Param('courseId') courseId: string,
  ) {
    return this.contentService.create(createContentDto, req['user'], courseId);
  }

  @Get()
  async findAll(
    @Req() req: Request,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.contentService.findAll(req['user'], courseId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.contentService.findOne(id, req['user']);
  }

  @Patch(':id')
  @Roles('ADMIN', 'GENERAL_ADMIN')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateContentDto: UpdateContentDto,
    @Req() req: Request,
  ) {
    return this.contentService.update(id, updateContentDto, req['user']);
  }

  @Delete(':id')
  @Roles('ADMIN', 'GENERAL_ADMIN')
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.contentService.remove(id, req['user']);
  }
}
