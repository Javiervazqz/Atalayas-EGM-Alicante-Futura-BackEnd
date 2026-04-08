import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import OpenAI from 'openai';

// ── Tipos ─────────────────────────────────────────────────────────────────────
export type ChatMessage = { role: 'user' | 'assistant'; content: string };

// ── Límites para no explotar el contexto ─────────────────────────────────────
const MAX_PDF_CHARS = 6_000; // ~1500 tokens por PDF
const MAX_PDFS = 5; // Máximo PDFs a extraer por petición

@Injectable()
export class ChatBotService {
  private readonly logger = new Logger(ChatBotService.name);
  private client: OpenAI;
  private model: string;

  constructor(private readonly prisma: PrismaService) {
    const provider = process.env.CHAT_PROVIDER;

    this.client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
    this.model = 'llama-3.3-70b-versatile'; // 128k contexto, gratuito

    this.logger.log(
      `ChatService iniciado → provider: ${provider} | modelo: ${this.model}`,
    );
  }

  // ── Punto de entrada ────────────────────────────────────────────────────────
  async chat(userId: string, messages: ChatMessage[]) {
    // Fetch todo en paralelo para minimizar latencia
    const [user, services, courses, documents] = await Promise.all([
      this.fetchUser(userId),
      this.fetchServices(userId),
      this.fetchCourses(userId),
      this.fetchDocuments(userId),
    ]);

    // Extracción de PDFs también en paralelo
    const docsWithText = await this.extractPdfTexts(documents);

    const systemPrompt = this.buildSystemPrompt(
      user,
      services,
      courses,
      docsWithText,
    );

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 1024,
      temperature: 0.5, // Más bajo para respuestas más factuales
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    });

    const reply = response.choices[0].message.content ?? '';
    return { reply };
  }

  // ── Fetchers ────────────────────────────────────────────────────────────────
  private async fetchUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { Company: true },
    });
  }

  private async fetchServices(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    return this.prisma.service.findMany({
      where: {
        OR: [
          { isPublic: true },
          ...(user?.companyId ? [{ companyId: user.companyId }] : []),
        ],
      },
      orderBy: { isPublic: 'desc' },
    });
  }

  private async fetchCourses(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    return this.prisma.course.findMany({
      where: {
        OR: [
          { isPublic: true },
          ...(user?.companyId ? [{ companyId: user.companyId }] : []),
        ],
      },
      include: {
        Enrollment: { where: { userId } },
        Content: { select: { id: true } },
      },
    });
  }

  private async fetchDocuments(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    return this.prisma.document.findMany({
      where: {
        OR: [
          { isPublic: true },
          ...(user?.companyId ? [{ companyId: user.companyId }] : []),
          { userId }, // Documentos propios del empleado
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_PDFS,
    });
  }

  // ── Extracción de PDFs ──────────────────────────────────────────────────────
  private async extractPdfTexts(
    documents: any[],
  ): Promise<Array<{ title: string; text: string }>> {
    const pdfReader = require('pdf-parse-fork');

    const pdfs = documents.filter((d) =>
      d.fileUrl?.toLowerCase().endsWith('.pdf'),
    );

    const results = await Promise.allSettled(
      pdfs.map(async (doc) => {
        try {
          const res = await fetch(doc.fileUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          // Convertimos a Buffer de Node.js
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const parse =
            typeof pdfReader === 'function' ? pdfReader : pdfReader.default;

          if (typeof parse !== 'function') {
            throw new Error(
              'No se pudo encontrar la función de parseo en la librería',
            );
          }

          // Con pdf-parse-fork la llamada es directa y estable
          const data = await parse(buffer);
          this.logger.log(`PDF "${doc.title}": ${data.text.slice(0, 100)}...`);

          const text = data.text
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, MAX_PDF_CHARS);

          return { title: doc.title, text };
        } catch (err) {
          this.logger.warn(
            `Error procesando PDF "${doc.title}": ${err.message}`,
          );
          return {
            title: doc.title,
            text: '[Contenido no extraíble]',
          };
        }
      }),
    );

    return results
      .filter((r) => r.status === 'fulfilled')
      .map(
        (r) =>
          (r as PromiseFulfilledResult<{ title: string; text: string }>).value,
      );
  }

  // ── System prompt ───────────────────────────────────────────────────────────
  private buildSystemPrompt(
    user: any,
    services: any[],
    courses: any[],
    docs: Array<{ title: string; text: string }>,
  ): string {
    const company = user?.Company;

    const servicesText = services.length
      ? services
          .map((s) => {
            const lines = [
              `• ID: ${s.id} - ${s.title}${s.isPublic ? ' [Público]' : ' [Tu empresa]'}`,
            ];
            if (s.description) lines.push(`  Descripción: ${s.description}`);
            if (s.providerName) lines.push(`  Proveedor: ${s.providerName}`);
            if (s.phone) lines.push(`  Teléfono: ${s.phone}`);
            if (s.email) lines.push(`  Email: ${s.email}`);
            if (s.address) lines.push(`  Dirección: ${s.address}`);
            if (s.schedule) lines.push(`  Horario: ${s.schedule}`);
            if (s.price) lines.push(`  Precio: ${s.price}`);
            if (s.externalUrl) lines.push(`  Más info: ${s.externalUrl}`);
            return lines.join('\n');
          })
          .join('\n\n')
      : 'No hay servicios disponibles actualmente.';

    const coursesText = courses.length
      ? courses
          .map((c) => {
            const enrollment = c.Enrollment?.[0];
            const total = c.Content?.length ?? 0;
            const progress = enrollment?.progress ?? 0;
            const status = !enrollment
              ? '📚 Sin comenzar'
              : progress === 100
                ? '✅ Completado'
                : `🔄 En progreso (${progress}%)`;
            return `• ID: ${c.id} - ${c.title} — ${status} — ${total} lección${total !== 1 ? 'es' : ''}`;
          })
          .join('\n')
      : 'No hay cursos disponibles.';

    const companyText = company
      ? [
          `Nombre: ${company.name}`,
          company.activity && `Actividad: ${company.activity}`,
          company.address && `Dirección: ${company.address}`,
          company.contactEmail && `Email: ${company.contactEmail}`,
          company.contactPhone && `Teléfono: ${company.contactPhone}`,
          company.website && `Web: ${company.website}`,
          company.description && `Descripción: ${company.description}`,
        ]
          .filter(Boolean)
          .join('\n')
      : 'Sin empresa asignada.';

    const docsText = docs.length
      ? docs
          .map((d) => `### Documento: "${d.title}"\n${d.text}`)
          .join('\n\n---\n\n')
      : 'No hay documentos disponibles.';

    return `
Eres el asistente virtual de Atalayas Ciudad Empresarial, un polígono industrial en Alicante gestionado por EGM Atalayas.
Tu función es ayudar a los empleados con información sobre servicios, cursos, documentos corporativos y onboarding.

════ INFORMACIÓN GENERAL ════
- Dirección: C/ Chelín, Parcela R22, Oficina 4, 03114 Alicante
- Email: info@atalayas.com | Web: https://atalayas.com
- Más de 200 empresas en el polígono
- Servicios comunes: seguridad 24h (Wincontrol), limpieza, jardinería, correos, aula de formación, alquiler de oficinas
- Incidencias en zonas comunes: https://www.lokinn.com/incidencias/atalayas

════ EMPRESA DEL EMPLEADO ════
${companyText}

════ SERVICIOS DISPONIBLES ════
${servicesText}

════ CURSOS DISPONIBLES ════
${coursesText}

════ DOCUMENTOS Y ARCHIVOS PDF ════
${docsText}

════ REGLAS DE ENLACES Y NAVEGACIÓN ════
- Cuando menciones un SERVICIO, debes poner su nombre como un hipervínculo utilizando Markdown.
- La estructura de la URL para SERVICIOS es: http://localhost:5173/dashboard/employee/services/[ID_DEL_SERVICIO]
- La estructura de la URL para CURSOS es: http://localhost:5173/dashboard/employee/courses/[ID_DEL_CURSO]
- Ejemplo: "Puedes consultar el [Servicio de Seguridad](http://localhost:5173/dashboard/employee/services/uuid-aqui) para más detalles."
- IMPORTANTE: Usa siempre el ID real que aparece en la lista de servicios/cursos proporcionada.

════ INSTRUCCIONES ════
- Responde SIEMPRE en español, de forma amable y concisa
- Basa tus respuestas EXCLUSIVAMENTE en el contexto anterior; nunca inventes datos
- Si no tienes información, dilo y sugiere contactar con info@atalayas.com
- Cuando menciones teléfonos o emails, formátalos claramente para facilitar el contacto
- Respuestas cortas por defecto; detalla solo si el usuario lo pide explícitamente
- Si preguntan por un documento PDF, cita el contenido relevante con precisión
- Tono profesional pero cercano
- No pongas asteriscos * en las respuestas, a menos que estés citando literalmente un documento que los contenga
- Usa formato Markdown para negritas y enlaces.
- Si el usuario pregunta por un servicio específico, responde con el enlace directo al mismo.
- Ignora los cursos publicos, céntrate en los privados de la empresa del usuario. También ignora los documentos.
`.trim();
  }
}
