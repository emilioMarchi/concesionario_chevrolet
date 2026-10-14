import { handleGet, handleOptions, handlePost } from '@/lib/copilotkit-runtime';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const GET = handleGet;
export const POST = handlePost;
export const OPTIONS = handleOptions;
