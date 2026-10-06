import { handleInfo, handleOptions, handlePost } from '@/lib/copilotkit-runtime';

export const GET = handleInfo;
export const POST = handlePost;
export const OPTIONS = handleOptions;