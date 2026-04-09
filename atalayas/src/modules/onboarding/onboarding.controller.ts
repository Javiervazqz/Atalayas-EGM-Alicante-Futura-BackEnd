import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('onboarding')
@UseGuards(AuthGuard, RolesGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  // POST /onboarding/setup (Solo para Admins)
  @Roles('GENERAL_ADMIN', 'ADMIN')
  @Post('setup')
  async setup(@Req() req, @Body() body: { steps: any[] }) {
    // El companyId lo sacamos del token del Admin para mayor seguridad
    return this.onboardingService.savePlan(req.user.companyId, body.steps);
  }

  // GET /onboarding/me (Para el Empleado)
  @Get('me')
  async getMyDashboard(@Req() req) {
    return this.onboardingService.getEmployeeDashboard(
      req.user.id,
      req.user.companyId,
    );
  }

  // POST /onboarding/toggle (Para marcar tareas)
  @Post('toggle')
  async toggle(@Req() req, @Body() body: { taskId: string; done: boolean }) {
    console.log('--- DEBUG TOGGLE ---');
    console.log('Usuario completo en req.user:', req.user);
    console.log('ID que estamos intentando usar:', req.user?.id);
    console.log('Body recibido:', body);
    return this.onboardingService.toggleTask(
      req.user.id,
      body.taskId,
      body.done,
    );
  }
}
