import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CompanyService } from './company.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { Request } from 'express';

// 1. IMPORTAMOS TU PROPIO GUARD
import { AuthGuard } from '../auth/auth.guard.js';
import { User } from '@prisma/client';

@ApiTags('Company')
@ApiBearerAuth() // Pone el candado en Swagger para todas las rutas
@UseGuards(AuthGuard) // 🔒 USAMOS TU GUARD PARA PROTEGER TODO EL CONTROLADOR
@Controller('company')
export class CompanyController {
  constructor(private readonly companiesService: CompanyService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una empresa nueva (Solo General Admin)' })
  create(
    @Body() createCompanyDto: CreateCompanyDto,
    @Req() req: Request & { user: User }, // 2. Capturamos la request
  ) {
    const requestUser = req.user; // 3. Sacamos el usuario que metió tu AuthGuard
    return this.companiesService.create(createCompanyDto, requestUser);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las empresas (Solo General Admin)' })
  findAll(@Req() req: Request & { user: User }) {
    const requestUser = req.user;
    return this.companiesService.findAll(requestUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalles de una empresa por ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: User },
  ) {
    const requestUser = req.user;
    return this.companiesService.findOne(id, requestUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modificar una empresa' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @Req() req: Request & { user: User },
  ) {
    const requestUser = req.user;
    return this.companiesService.update(id, updateCompanyDto, requestUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Borrar una empresa (Solo General Admin)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: User },
  ) {
    const requestUser = req.user;
    return this.companiesService.remove(id, requestUser);
  }
}
