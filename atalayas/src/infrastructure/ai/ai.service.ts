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

  // 2. Generar Resumen
  // ... (imports y constructor iguales)

  // 1. Resumen: Forzamos texto plano sin símbolos extraños
  async generateSummary(text: string): Promise<string> {
    const completion = await this.aiClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'Eres un redactor experto. Crea un resumen educativo del texto. IMPORTANTE: No uses Markdown (ni #, ni *, ni **). Usa solo saltos de línea naturales y mayúsculas para títulos. Además, usa negrita para los títulos',
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
            'Genera un test de 3 preguntas basado en el texto. Devuelve ÚNICAMENTE un objeto JSON con esta estructura exacta: {"questions": [{"question": "...", "options": ["...", "...", "..."], "correctAnswer": "..."}]}. Asegúrate de que la correctAnswer coincida exactamente con una de las opciones.',
        },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    });

    const res = JSON.parse(completion.choices[0].message.content || '');
    // Retornamos solo el array de preguntas
    return res.questions || res;
  }

  // 3. Podcast: Mejoramos el guion para que tenga contenido real
  async generatePodcast(
    text: string,
  ): Promise<{ script: string; audioBuffer: Buffer }> {
    const completion = await this.aiClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'Eres un locutor de radio ameno. Crea un guion de podcast donde expliques los puntos clave del texto de forma narrativa. El guion debe tener al menos 200 palabras para que dure más de un minuto.',
        },
        { role: 'user', content: text },
      ],
    });

    const script = completion.choices[0].message.content || '';

    const audioResponse = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/IKne3meq5aSn9XLyUdCD`, // Voz: Charlie
      {
        text: script,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      },
      {
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
        responseType: 'arraybuffer',
      },
    );

    return { script, audioBuffer: Buffer.from(audioResponse.data) };
  }
}
