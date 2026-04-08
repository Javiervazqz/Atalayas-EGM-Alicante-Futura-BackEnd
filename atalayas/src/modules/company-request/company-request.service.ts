import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateCompanyRequestDto } from './dto/create-company-request.dto';
import { UpdateCompanyRequestDto } from './dto/update-company-request.dto';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class CompanyRequestService {
  private supabaseAdmin: ReturnType<typeof createClient>;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailerService: MailerService,
  ) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey!);
  }

  async create(
    createCompanyRequestDto: CreateCompanyRequestDto,
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('El documento es obligatorio');

    const fileName = `company-request/${Date.now()}-${file.originalname}`;
    const { error } = await this.supabaseAdmin.storage
      .from('uploads')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
      });

    if (error)
      throw new InternalServerErrorException('Error al subir el documento');

    const { data: urlData } = this.supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(fileName);

    return this.prismaService.companyRequest.create({
      data: {
        companyName: createCompanyRequestDto.companyName,
        cif: createCompanyRequestDto.cif,
        contactName: createCompanyRequestDto.contactName,
        contactEmail: createCompanyRequestDto.contactEmail,
        phone: createCompanyRequestDto.phone,
        address: createCompanyRequestDto.address,
        activity: createCompanyRequestDto.activity,
        documentUrl: urlData.publicUrl,
        status: 'PENDING',
      },
    });
  }

  async findAll(showArchived = false) {
    const request = this.prismaService.companyRequest.findMany({
      where: { archivedAt: showArchived ? { not: null } : null },
      orderBy: { created_at: 'desc' },
    });
    console.log('Primera solicitud:', JSON.stringify(request, null, 2));
    return request;
  }

  async findOne(id: string) {
    const request = await this.prismaService.companyRequest.findUnique({
      where: { id },
    });

    if (!id) throw new NotFoundException('Solicitud no encontrada');
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    return request;
  }

  async approve(id: string) {
    const request = await this.findOne(id);

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Esta solicitud ya ha sido procesada');
    }

    const company = await this.prismaService.company.create({
      data: { name: request.companyName },
    });

    const password = Math.random().toString(36).slice(-8);

    const { data: authUser, error } =
      await this.supabaseAdmin.auth.admin.createUser({
        email: request.contactEmail,
        password,
        email_confirm: true,
      });

    if (error)
      throw new InternalServerErrorException('Error al crear el usuario');

    await this.prismaService.user.create({
      data: {
        id: authUser.user.id,
        email: request?.contactEmail,
        name: request?.companyName,
        role: 'ADMIN',
        companyId: company.id,
      },
    });

    await this.prismaService.companyRequest.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    await this.mailerService.sendMail({
      to: request.contactEmail,
      subject: 'Solicitud aprobada - Atalayas EGM',
      html: `
      <h2>¡Bienvenido a Atalayas, ${request.contactName}!</h2>
      <p>Tu solicitud para la empresa <strong>${request.companyName}</strong> ha sido aprobada</p>
      <p>Tus credenciales de acceso son:</p>
      <ul>
        <li><strong>Email:</strong> ${request.contactEmail}</li>
        <li><strong>Contraseña provisional:</strong> ${password}</li>
      </ul>
      <p>Por seguridad, cambia tu contraseña al iniciar sesión por primera vez.</p>
      <a href="http://localhost:5173/login">Acceder a la plataforma</a>
      `,
    });

    return { message: 'Solicitud aprovada', provisionalPassword: password };
  }

  async reject(id: string, rejectReason: string) {
    const request = await this.findOne(id);

    if (request.status !== 'PENDING')
      throw new BadRequestException('Esta solicitud ya ha sido procesada');

    await this.prismaService.companyRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectReason,
      },
    });

    await this.mailerService.sendMail({
      to: request.contactEmail,
      subject: 'Solicitud rechazada - Atalayas EGM',
      html: `
      <h2>Solicitud rechazada</h2>
      <p>Lamentamos informarle que tu solicitud para <strong>${request.companyName}</strong> ha sido rechazada.</p>
      <p><strong>Motivo:</strong> ${rejectReason}</p>
      <p>Si cree que es un error, contacta con nosotros.</p>
      `,
    });

    return { message: 'Solicitud rechazada' };
  }

  update(id: string, updateCompanyRequestDto: UpdateCompanyRequestDto) {
    return `This action updates a #${id} companyRequest`;
  }

  async remove(id: string) {
    const request = await this.findOne(id);

    await this.prismaService.companyRequest.delete({
      where: { id },
    });
    return `Solicitud borrada con éxito`;
  }

  async archive(id: string) {
    const request = await this.findOne(id);

    if (request.status === 'PENDING') {
      throw new BadRequestException(
        'No puedes archivar una solicitud pendiente',
      );
    }

    return this.prismaService.companyRequest.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  async unarchive(id: string) {
    await this.findOne(id);

    return this.prismaService.companyRequest.update({
      where: { id },
      data: { archivedAt: null },
    });
  }
}
