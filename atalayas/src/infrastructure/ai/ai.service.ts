// ai.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';
import axios from 'axios';
import { extractText } from 'unpdf';

@Injectable()
export class AiService {
  private aiClient: OpenAI;

  constructor() {
    this.aiClient = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  // 1. Extraer texto para reutilizarlo en varias funciones
  async extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
    const pdfBytes = new Uint8Array(pdfBuffer);
    const pdfData = await extractText(pdfBytes, { mergePages: true });
    return pdfData.text || '';
  }

  // 1. Resumen: Forzamos texto plano sin símbolos extraños
  async generateSummary(text: string): Promise<string> {
    const completion = await this.aiClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'Eres un redactor experto en síntesis de información corporativa. Tu objetivo es transformar el contenido del documento en un resumen ejecutivo estructurado por puntos clave. Si hay imágenes, interpretalas segun el contexto y proporciona información relevante que no se vea en el texto del documento.\n' +
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

  // 2. Quiz: Forzamos el formato JSON para que el frontend pueda iterarlo
  async generateQuiz(text: string): Promise<any> {
    const completion = await this.aiClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'Genera un test de 4 preguntas basado en el texto. Devuelve ÚNICAMENTE un objeto JSON con esta estructura exacta: {"questions": [{"question": "...", "options": ["...", "...", "..."], "correctAnswer": "..."}]}. Asegúrate de que la correctAnswer coincida exactamente con una de las opciones.',
        },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    });

    const res = JSON.parse(completion.choices[0].message.content || '{}');
    return res.questions || res;
  }

  // 3. Podcast: Generación de guion con Groq y Audio con ElevenLabs
  async generatePodcast(
    text: string,
  ): Promise<{ script: string; audioBuffer: Buffer }> {
    try {
      // 1. Generar el guion con Groq
      const completion = await this.aiClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'Eres un locutor de contenidos formativos ameno. Crea un guion narrativo de 150-200 palabras sin Markdown.',
          },
          { role: 'user', content: text },
        ],
      });

      const rawScript = completion.choices[0].message.content || '';

      // 2. Limpieza de texto
      const cleanScript = rawScript
        .replace(/\*\*|__/g, '')
        .replace(/#+/g, '')
        .replace(/\[.*?\]/g, '')
        .trim();

      // 3. Llamada a ElevenLabs
      const audioResponse = await axios.post(
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

      // RETORNO DE ÉXITO
      return {
        script: cleanScript,
        audioBuffer: Buffer.from(audioResponse.data),
      };
    } catch (error: any) {
      // RETORNO DE ERROR: Al usar 'throw', TS entiende que la función "sale" de forma segura.
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 402) {
          throw new InternalServerErrorException(
            'Cuota de ElevenLabs agotada.',
          );
        }
        if (error.response?.status === 404) {
          throw new InternalServerErrorException(
            'Voz no encontrada en ElevenLabs.',
          );
        }
      }

      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'Error crítico en el proceso de Podcast',
      );
    }
  }
}
