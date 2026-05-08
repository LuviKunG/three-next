import { isDevelopment } from './node';

const isEnableDebugging = process.env.NEXT_PUBLIC_ENABLE_DEBUGGING === 'true';

const isDebugging = isDevelopment && isEnableDebugging;

export { isDebugging };
