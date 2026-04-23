import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';
import axios from 'axios';
import { extractText } from 'unpdf';

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
    const completion = await this.aiClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Resume el texto de forma clara y estructurada.',
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
            'Genera un test de 4 preguntas y devuelve SOLO JSON con formato {"questions":[...]}',
        },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content || '{}';

    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'questions' in parsed
    ) {
      return parsed as QuizResult;
    }

    return { questions: [] };
  }

  async generatePodcast(text: string): Promise<PodcastResult> {
    try {
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
}
