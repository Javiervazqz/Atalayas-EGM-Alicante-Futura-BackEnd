import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { User } from '@prisma/client';
import { AnnouncementService } from './announcement.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Announcement')
@Controller('announcement')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Get('public')
  async findPublic() {
    return this.announcementService.findPublic();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Get()
  async findAll(@Req() req: Request & { user: User }) {
    return this.announcementService.findAll(req.user);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('GENERAL_ADMIN', 'ADMIN')
  @Post()
  async create(
    @Body()
    dto: {
      title: string;
      body: string;
      isPublic: boolean;
      companyId?: string | null;
    },
    @Req() req: Request & { user: User },
  ) {
    return this.announcementService.create(dto, req.user);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('GENERAL_ADMIN', 'ADMIN')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: Request & { user: User },
  ) {
    return this.announcementService.remove(id, req.user);
  }
}
