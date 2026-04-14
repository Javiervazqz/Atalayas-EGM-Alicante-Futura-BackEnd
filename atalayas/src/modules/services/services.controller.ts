import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { User } from '../../modules/users/entities/user.entity';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @Roles('ADMIN', 'GENERAL_ADMIN')
  async create(
    @Body() createServiceDto: CreateServiceDto,
    @Req() requestUser: User,
  ) {
    return await this.servicesService.create(
      createServiceDto,
      requestUser['user'],
    );
  }

  @Get()
  findAll(@Req() requestUser: User) {
    return this.servicesService.findAll(requestUser['user']);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() requestUser: User) {
    return this.servicesService.findOne(id, requestUser['user']);
  }

  @Patch(':id')
  @Roles('ADMIN', 'GENERAL_ADMIN')
  update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
    @Req() requestUser: User,
  ) {
    return this.servicesService.update(
      id,
      updateServiceDto,
      requestUser['user'],
    );
  }

  @Delete(':id')
  @Roles('ADMIN', 'GENERAL_ADMIN')
  remove(@Param('id') id: string, @Req() requestUser: User) {
    return this.servicesService.remove(id, requestUser['user']);
  }
}
