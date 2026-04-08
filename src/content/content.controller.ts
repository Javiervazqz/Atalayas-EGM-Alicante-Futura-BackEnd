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
  UseInterceptors, // <--- AÑADIR
  UploadedFile, // <--- AÑADIR
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express'; // <--- AÑADIR
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ApiBearerAuth, ApiTags, ApiConsumes } from '@nestjs/swagger'; // <--- Opcional: ApiConsumes para Swagger
import { RolesGuard } from 'src/auth/roles.guard';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/auth/roles.decorator';

@ApiTags('Content')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('courses/:courseId/content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @Roles('ADMIN', 'GENERAL_ADMIN')
  @UseInterceptors(FileInterceptor('file')) // 'file' debe coincidir con data.append('file', ...) de React
  async create(
    @Body() createContentDto: CreateContentDto,
    @Req() req: any,
    @Param('courseId') courseId: string,
    @UploadedFile() file?: Express.Multer.File, // El archivo es opcional (nullable)
  ) {
    console.log('¿Qué llega en el Body?:', createContentDto);
    console.log('¿Llega el archivo?:', file ? 'SÍ' : 'NO');
    // IMPORTANTE: Como envías 'options' como JSON string desde el front,
    // el Service deberá hacer JSON.parse(createContentDto.options) si lo necesitas.

    return this.contentService.create(
      createContentDto,
      req['user'],
      courseId,
      file, // Pasa el archivo al servicio
    );
  }

  // ... El resto de tus métodos (Get, Patch, Delete) se quedan igual
  @Get()
  async findAll(
    @Req() req: any,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.contentService.findAll(req['user'], courseId);
  }

  @Get('/:id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.contentService.findOne(id, req['user']);
  }

  @Patch(':id')
  @Roles('ADMIN', 'GENERAL_ADMIN')
  @UseInterceptors(FileInterceptor('file')) // También aquí si permites actualizar el PDF
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateContentDto: UpdateContentDto,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.contentService.update(id, updateContentDto, req['user'], file);
  }

  @Delete(':id')
  @Roles('ADMIN', 'GENERAL_ADMIN')
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.contentService.remove(id, req['user']);
  }
}
