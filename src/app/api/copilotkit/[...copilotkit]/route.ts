import { handleInfo, handleOptions, handlePost } from '@/lib/copilotkit-runtime';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const GET = handleInfo;
export const POST = handlePost;
export const OPTIONS = handleOptions;
