/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-var-requires */

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';
import axios from 'axios';

// Usamos el 'require' clásico de Node.js para esquivar el error TS2349
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

@Injectable()
export class AiService {
  private deepseek: OpenAI;

  constructor() {
    this.deepseek = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }

  async generatePodcastFromPdf(
    pdfBuffer: Buffer,
  ): Promise<{ script: string; audioBuffer: Buffer }> {
    try {
      console.log('📄 1/3 Extrayendo texto del PDF...');

      // Ahora ESLint nos dejará usar pdfParse tranquilamente
      const pdfData = await pdfParse(pdfBuffer);
      const rawText = pdfData.text;

      if (!rawText || rawText.trim().length === 0) {
        throw new Error('El PDF está vacío o no se pudo leer el texto.');
      }

      console.log('🧠 2/3 Generando guion con DeepSeek...');
      const completion = await this.deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content:
              'Eres un experto creador de contenido educativo. Voy a pasarte un texto aburrido. Tu objetivo es resumirlo y convertirlo en un monólogo de audio (estilo podcast) muy ameno, directo y fácil de entender. Usa un tono profesional pero cercano. No pongas acotaciones de sonido ni notas de autor, solo el texto exacto que debe leer el locutor. Máximo 2 párrafos.',
          },
          { role: 'user', content: String(rawText) },
        ],
      });

      const script =
        completion.choices[0].message.content ||
        'Error: La IA no generó texto.';

      console.log('🎙️ 3/3 Generando audio con ElevenLabs...');
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

      const voiceId = 'pNInz6obpgDQGcFmaJcg';

      const audioResponse = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          text: script,
          model_id: 'eleven_multilingual_v2',
        },
        {
          headers: {
            'xi-api-key': elevenLabsApiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        },
      );

      console.log('✅ ¡Podcast generado con éxito!');

      return {
        script: script,
        audioBuffer: Buffer.from(audioResponse.data as ArrayBuffer),
      };
    } catch (error) {
      console.error('Error en el pipeline de IA:', error);
      throw new InternalServerErrorException(
        'Error al generar el contenido de IA',
      );
    }
  }
}
