import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { AuthGuard } from './auth/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prismaService: PrismaService,  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Get('User')
  async getUsers() {
    const users = await this.prismaService.user.findMany();
    return users;
  }
}