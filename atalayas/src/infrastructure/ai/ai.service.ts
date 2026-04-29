import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';
import axios from 'axios';
import { extractText } from 'unpdf';
import { Express } from 'express';


type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
};

type PodcastResult = {
  script: string;
  audioBuffer: Buffer;
};

@Injectable()
export class AiService {
  private aiClient: OpenAI;

  constructor() {
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
    console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY);
    const completion = await this.aiClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'Eres un redactor experto en síntesis corporativa. Genera un resumen ejecutivo estructurado por puntos clave sin usar encabezados Markdown (#).',
        },
        { role: 'user', content: text },
      ],
    });
    return completion.choices[0].message.content || '';
  }

  async generateQuizFromText(summaryText: string): Promise<QuizQuestion[]> {
    try {
      const prompt = `
        Eres un profesor experto. Genera un test de 4 preguntas de opción múltiple.
        REGLA ESTRICTA: Responde ÚNICAMENTE con un Array JSON. 
        No incluyas explicaciones.
        Formato: [{"question": "...", "options": ["...", "..."], "correctAnswer": "..."}]
        Texto: "${summaryText}"
      `;

      const response = await this.aiClient.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        response_format: { type: 'json_object' }, // Groq soporta JSON mode
      });

      let content = response.choices[0].message.content || '[]';

      // Limpieza por si el modelo incluye Markdown
      content = content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(content) as
        | { questions?: QuizQuestion[] }
        | QuizQuestion[];
      // Si el modelo envuelve el array en un objeto { "questions": [...] }
      return Array.isArray(parsed) ? parsed : parsed.questions || [];
    } catch (error) {
      console.error('🚨 Error generando el Quiz:', error);
      return [];
    }
  }

  async generatePodcast(text: string): Promise<PodcastResult> {
    try {
      // 1. Generar guion ameno
      const completion = await this.aiClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'Eres un locutor de podcast. Resume el texto de forma amena y directa. Máximo 2 párrafos. No incluyas acotaciones.',
          },
          { role: 'user', content: text },
        ],
      });

      const rawScript = completion.choices[0].message.content || '';
      const cleanScript = rawScript.replace(/\*\*|__|#+|\[.*?\]/g, '').trim();

      // 2. Generar audio con ElevenLabs (URL corregida)
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

      return {
        script: cleanScript,
        audioBuffer: Buffer.from(audioResponse.data as ArrayBuffer),
      };
    } catch (error: any) {
      console.error('🚨 Error en Podcast Pipeline:', error);

      if (axios.isAxiosError(error) && error.response?.status === 402) {
        throw new InternalServerErrorException('Cuota de ElevenLabs agotada.');
      }

      throw new InternalServerErrorException(
        'Error al generar contenido de audio.',
      );
    }
  }

async generatePodcastFromPdf(
  file: Express.Multer.File,
): Promise<{ script: string; audioBuffer: Buffer }> {
  // 1. Extraer texto del PDF
  const text = await this.extractTextFromPdf(file.buffer);

  // 2. Reutilizar lo que ya funciona
  return this.generatePodcast(text);
}
  

 
}
