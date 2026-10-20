import { handleCopilotOptions, handleCopilotRequest } from '@/lib/copilotkit/proxy';

export const dynamic = 'force-dynamic';

export const GET = handleCopilotRequest;
export const POST = handleCopilotRequest;
export const DELETE = handleCopilotRequest;
export const PATCH = handleCopilotRequest;
export const OPTIONS = handleCopilotOptions;
