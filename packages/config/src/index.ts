import { z } from 'zod';

export const EnvSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  VITE_COMPANY_URL: z.string().default('/'),
  VITE_CHAT_APP_URL: z.string().default('/chat'),
  INFERENCE_BACKEND: z.enum(['nim', 'openai', 'gemini', 'mock']).default('mock'),
  NVIDIA_NIM_API_KEY: z.string().optional().default(''),
  NVIDIA_NIM_BASE_URL: z.string().default('https://integrate.api.nvidia.com/v1'),
  OPENAI_API_BASE: z.string().default('http://localhost:8000/v1'),
  OPENAI_API_KEY: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

export function getAppUrls() {
  const isProd = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
  return {
    company: (typeof process !== 'undefined' && process.env?.VITE_COMPANY_URL) || '/',
    chat: (typeof process !== 'undefined' && process.env?.VITE_CHAT_APP_URL) || '/chat',
    isProduction: isProd,
  };
}
