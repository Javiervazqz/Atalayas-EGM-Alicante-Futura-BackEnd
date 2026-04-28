import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';
import axios from 'axios';
import { extractText } from 'unpdf';
import { StorageService } from '../storage/storage.service';

type PodcastResult = {
  script: string;
  audioBuffer: Buffer;
};

type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
};

type QuizResult = {
  questions: QuizQuestion[];
};

@Injectable()
export class AiService {
  private aiClient: OpenAI;

  constructor(private readonly storageService: StorageService) {
    this.aiClient = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
    const pdfBytes = new Uint8Array(pdfBuffer);
    const pdfData = await extractText(pdfBytes, { mergePages: true });
    return pdfData.text || '';
  }

  async generateSummary(text: string): Promise<string> {
    const completion = await this.aiClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'Eres un redactor experto en síntesis de información corporativa. Tu objetivo es transformar el contenido del documento en un resumen ejecutivo estructurado por puntos clave. Si hay imágenes, interpretalas segun el contexto y proporciona información relevante que no se vea en el texto del documento. No empieces por Introducción a Atalayas.\n' +
            'NORMAS DE REDACCIÓN:\n' +
            '- **Síntesis profesional**: Extrae la información esencial y preséntala de forma directa y seria.\n' +
            '- **Limpieza de caracteres**: No incluyas ":" al inicio de las frases ni repliques errores de maquetación del original.\n' +
            '- **Unificación de ideas**: Combina frases fragmentadas en oraciones completas y coherentes.\n' +
            'REGLAS DE FORMATO:\n' +
            '- Usa **MAYÚSCULAS EN NEGRITA** para los títulos de cada sección.\n' +
            '- Usa listas con guiones (-) para desglosar los puntos clave.\n' +
            '- Máximo 3-4 puntos por sección para garantizar una lectura ágil.\n' +
            '- No uses negritas dentro de las listas, mantén el texto limpio.\n' +
            '- No utilices encabezados de Markdown (#).',
        },
        { role: 'user', content: text },
      ],
    });

    return completion.choices[0].message.content || '';
  }

  async generateQuiz(text: string): Promise<QuizResult> {
    const completion = await this.aiClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'Eres un generador de cuestionarios educativos. Tu tarea es devolver exclusivamente un objeto JSON. ' +
            'No incluyas texto explicativo, solo el JSON puro. ' +
            'ESTRUCTURA DEL JSON: {"questions": [{"question": "texto", "options": ["op1", "op2", "op3", "op4"], "correctAnswer": "op1"}]} ' +
            'Asegúrate de que la correctAnswer coincida exactamente con una de las opciones.',
        },
        {
          role: 'user',
          content: `Genera un cuestionario de 4 preguntas basado en el siguiente texto: ${text}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2, // Bajamos la temperatura para mayor precisión en el formato
    });

    const content = completion.choices[0].message.content || '{}';

    try {
      const parsed = JSON.parse(content);

      // Validación de seguridad adicional
      if (parsed.questions && Array.isArray(parsed.questions)) {
        return parsed as QuizResult;
      }
    } catch (e) {
      console.error('Error parseando el JSON de Groq:', e);
    }

    return { questions: [] };
  }

  async generatePodcast(text: string): Promise<PodcastResult> {
    try {
      // 1. Generar el guion con Groq
      const completion = await this.aiClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'Eres un locutor formativo. Genera un guion claro y natural de 150-200 palabras.',
          },
          { role: 'user', content: text },
        ],
      });

      const rawScript = completion.choices[0].message.content || '';

      const cleanScript = rawScript
        .replace(/\*\*|__/g, '')
        .replace(/#+/g, '')
        .replace(/\[.*?\]/g, '')
        .trim();

      const audioResponse = await axios.post<ArrayBuffer>(
        `https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL`,
        {
          text: cleanScript,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        },
        {
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        },
      );

      return {
        script: cleanScript,
        audioBuffer: Buffer.from(audioResponse.data),
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 402) {
          throw new InternalServerErrorException(
            'Cuota de ElevenLabs agotada.',
          );
        }
      }

      throw new InternalServerErrorException('Error generando podcast');
    }
  }

  async generateImage(text: string): Promise<string> {
    try {
      // 1. LLM (Groq) analiza el texto corporativo y crea un prompt visual
      const completion = await this.aiClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'Eres un director de arte especializado en diseño gráfico corporativo minimalista. ' +
              'Tu tarea es leer extractos de documentos y crear un PROMPT VISUAL en INGLÉS. ' +
              'REGLAS ESTRICTAS DE ESTILO: Modern corporate flat design illustration, minimalist vector art, SVG style. ' +
              'PALETA DE COLORES: Strict use of corporate blue tones, white background, no gradients. ' +
              'COMPOSICIÓN: Centered flat object or simple scene. Abstract geometric shapes. NO HUMAN BEINGS, NO FACES, NO HANDS. ' +
              'IMPORTANTE: No incluyas texto, logotipos o letras dentro de la imagen. Solo elementos visuales geométricos y limpios.',
          },
          // Pasamos un subconjunto del texto para no saturar el prompt
          {
            role: 'user',
            content: `Analyze and create a visual prompt for: ${text.substring(0, 2500)}`,
          },
        ],
        temperature: 0.5, // Equilibrio entre creatividad y adherencia al texto
      });

      const visualPrompt =
        completion.choices[0].message.content ||
        'Corporate networking illustration';
      console.log(`[AI-Image] Prompt generado: ${visualPrompt}`); // Útil para depurar

      // 2. Generar imagen con Pollinations (API Abierta/Gratis)
      const encodedPrompt = encodeURIComponent(visualPrompt);
      // Usamos el modelo 'flux' en pollinations para mayor calidad, 'turbo' para velocidad
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;

      // 3. Descargar la imagen de la IA como Buffer
      const imageResponse = await axios.get<ArrayBuffer>(imageUrl, {
        responseType: 'arraybuffer',
      });
      const imageBuffer = Buffer.from(imageResponse.data);

      // 4. Guardar permanentemente usando tu StorageService actualizado
      const finalPublicUrl = await this.storageService.uploadBuffer(
        imageBuffer,
        'explanatory-image.png',
        'image/png',
      );

      return finalPublicUrl;
    } catch (error: unknown) {
      console.error('[AI-Image-Error]', error);
      throw new InternalServerErrorException(
        'Error generando o guardando la imagen explicativa',
      );
    }
  }

  private async generateVideoKeywords(text: string): Promise<string> {
    const completion = await this.aiClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'Extract 2 or 3 essential keywords in English for a stock video search. Output ONLY the keywords separated by spaces. Example: "laboratory safety chemicals"',
        },
        {
          role: 'user',
          content: `Topic: ${text.substring(0, 1000)}`,
        },
      ],
      temperature: 0.3,
    });
    return completion.choices[0].message.content || 'corporate training';
  }

  /**
   * ACTUALIZADA: Implementación con Pexels + Descarga Segura
   */
  async generateVideo(rawText: string): Promise<string | null> {
    console.log('--- [DEBUG VIDEO] Inicio del proceso ---');

    try {
      // 1. Keywords
      let keywords = await this.generateVideoKeywords(rawText);
      keywords = keywords.replace(/[".]/g, '').trim();
      console.log(`[DEBUG VIDEO] Keywords generadas: "${keywords}"`);

      // 2. Validación de API Key
      if (!process.env.PEXELS_API_KEY) {
        console.error(
          '[DEBUG VIDEO] ERROR: PEXELS_API_KEY no encontrada en .env',
        );
        return 'https://static.videezy.com/system/resources/previews/000/012/367/original/Pexels_Videos_3938.mp4';
      }

      // 3. Llamada a Pexels
      console.log('[DEBUG VIDEO] Llamando a API de Pexels...');
      const pexelsResponse = await axios.get(
        'https://api.pexels.com/videos/search',
        {
          params: {
            query: keywords,
            per_page: 1,
            orientation: 'landscape',
            size: 'medium',
          },
          headers: { Authorization: process.env.PEXELS_API_KEY },
        },
      );

      const videoData = pexelsResponse.data.videos?.[0];

      if (!videoData) {
        console.warn(
          '[DEBUG VIDEO] Pexels no encontró nada. Usando backup de seguridad.',
        );
        return 'https://static.videezy.com/system/resources/previews/000/012/367/original/Pexels_Videos_3938.mp4';
      }

      console.log(`[DEBUG VIDEO] Video encontrado ID: ${videoData.id}`);

      // 4. Selección de archivo
      const videoFile =
        videoData.video_files.find(
          (f: any) => f.file_type === 'video/mp4' && f.width < 1920,
        ) || videoData.video_files[0];

      if (!videoFile?.link) {
        console.error(
          '[DEBUG VIDEO] No se encontró un link válido en el objeto de Pexels',
        );
        throw new Error('Link de video no disponible');
      }

      // 5. Descarga del Buffer
      console.log('[DEBUG VIDEO] Descargando buffer del video...');
      const response = await axios.get(videoFile.link, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 30000, // 30 segundos
      });

      console.log(
        `[DEBUG VIDEO] Buffer recibido. Tamaño: ${response.data.byteLength} bytes`,
      );

      // 6. Subida a Storage
      console.log('[DEBUG VIDEO] Subiendo a Supabase Storage...');
      const finalUrl = await this.storageService.uploadBuffer(
        Buffer.from(response.data),
        `video-${Date.now()}.mp4`,
        'video/mp4',
      );

      console.log(`[DEBUG VIDEO] ¡ÉXITO! URL Final: ${finalUrl}`);
      return finalUrl;
    } catch (error: any) {
      console.error('--- [DEBUG VIDEO] FALLO GLOBAL EN VIDEO ---');
      console.error('Mensaje:', error.message);
      if (error.response) {
        console.error('Data Error Pexels:', error.response.data);
        console.error('Status Error Pexels:', error.response.status);
      }

      // Retornamos el backup para que el campo videoUrl NO sea null y no rompa la base de datos
      return 'https://static.videezy.com/system/resources/previews/000/012/367/original/Pexels_Videos_3938.mp4';
    }
  }
}
