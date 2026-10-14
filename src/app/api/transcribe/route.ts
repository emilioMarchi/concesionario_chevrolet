import { NextRequest, NextResponse } from 'next/server';
import { preflightResponse, withCors } from '@/lib/cors';
import { OvniTranscriptionService } from '@/lib/transcription-service';

export const runtime = 'nodejs';

const transcription = new OvniTranscriptionService();

// El cliente móvil sube el blob de audio grabado y recibe la transcripción.
export async function POST(req: NextRequest): Promise<Response> {
  const form = await req.formData();
  const file = form.get('audio');

  if (!(file instanceof File)) {
    return withCors(req, NextResponse.json({ error: 'Se requiere el archivo "audio"' }, { status: 400 }));
  }

  try {
    const transcript = await transcription.transcribeFile({
      audioFile: file,
      mimeType: file.type,
      size: file.size,
    });
    return withCors(req, NextResponse.json({ transcript }));
  } catch (error) {
    console.error('[/api/transcribe]', error);
    return withCors(req, NextResponse.json({ error: 'No se pudo transcribir el audio' }, { status: 502 }));
  }
}

export async function OPTIONS(req: NextRequest): Promise<Response> {
  return preflightResponse(req);
}
