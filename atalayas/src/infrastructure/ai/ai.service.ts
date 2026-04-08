import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';
import axios from 'axios';
import { extractText } from 'unpdf'; // 🚀 ¡Librería moderna al rescate!

@Injectable()
export class AiService {
  // Le cambiamos el nombre a la variable para que no confunda
  private aiClient: OpenAI;

  constructor() {
    this.aiClient = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY, // 👈 Usando la llave de tu compañero
    });
  }

  async generatePodcastFromPdf(
    pdfBuffer: Buffer,
  ): Promise<{ script: string; audioBase64: string }> {
    try {
      console.log('📄 1/3 Extrayendo texto del PDF...');

      // 🛠️ unpdf usa estándares modernos, así que pasamos el Buffer a Uint8Array
      const pdfBytes = new Uint8Array(pdfBuffer);

      // Extraemos el texto y le pedimos que una todas las páginas en un solo string
      const pdfData = await extractText(pdfBytes, { mergePages: true });
      const rawText = pdfData.text; // Ya viene tipado como string

      if (!rawText || rawText.trim().length === 0) {
        throw new Error('El PDF está vacío o no se pudo leer el texto.');
      }

      console.log('🧠 2/3 Generando guion con Groq...');
      const completion = await this.aiClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile', // 👈 Ponemos el modelo que usa tu ChatBot
        messages: [
          {
            role: 'system',
            content:
              'Eres un experto creador de contenido educativo. Voy a pasarte un texto aburrido. Tu objetivo es resumirlo y convertirlo en un monólogo de audio (estilo podcast) muy ameno, directo y fácil de entender. Usa un tono profesional pero cercano. No pongas acotaciones de sonido ni notas de autor, solo el texto exacto que debe leer el locutor. Máximo 2 párrafos.',
          },
          { role: 'user', content: rawText },
        ],
      });

      const script =
        completion.choices[0].message.content ||
        'Error: La IA no generó texto.';

      console.log('🎙️ 3/3 Generando audio con ElevenLabs...');
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

      const voiceId = 'IKne3meq5aSn9XLyUdCD';

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

      const audioBase64 = Buffer.from(
        audioResponse.data as ArrayBuffer,
      ).toString('base64');

      return {
        script: script,
        audioBase64: audioBase64,
      };
    } catch (error) {
      console.error('🚨 Error en el pipeline de IA:', error);
      throw new InternalServerErrorException(
        'Error al generar el contenido de IA',
      );
    }
  }
}
