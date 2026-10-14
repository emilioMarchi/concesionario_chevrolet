import { TranscriptionService, type TranscribeFileOptions } from '@copilotkit/runtime/v2';
import { buildAgentHeaders, resolveAgentUrl } from '@/lib/ovni-agent';

// Opción 5A: reusa el STT de `ovni-agent` (Google Cloud Speech) en lugar de
// configurar un proveedor nuevo. El endpoint `/api/chat/transcribe` recibe el
// audio en base64 y devuelve `{ data: { transcript } }`.
export class OvniTranscriptionService extends TranscriptionService {
  async transcribeFile({ audioFile, mimeType }: TranscribeFileOptions): Promise<string> {
    const agentUrl = resolveAgentUrl();
    const buffer = Buffer.from(await audioFile.arrayBuffer());

    const response = await fetch(`${agentUrl}/api/chat/transcribe`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...buildAgentHeaders(agentUrl),
      },
      body: JSON.stringify({
        audio: buffer.toString('base64'),
        audioMimeType: mimeType || audioFile.type || undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`Transcription request failed: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as { data?: { transcript?: string } };
    return payload.data?.transcript ?? '';
  }
}
