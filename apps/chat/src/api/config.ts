import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

export const ConfigSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  INFERENCE_BACKEND: z.enum(['nim', 'openai', 'gemini', 'mock']).default(
    process.env.NVIDIA_NIM_API_KEY
      ? 'nim'
      : process.env.OPENAI_API_KEY || process.env.OPENAI_API_BASE
      ? 'openai'
      : process.env.GEMINI_API_KEY
      ? 'gemini'
      : 'mock'
  ),
  ROUTER_MODEL: z.string().default(
    process.env.GEMINI_API_KEY ? 'gemini-3.8-flash' : 'meta/llama-3.2-3b-instruct'
  ),
  FAST_MODEL: z.string().default(
    process.env.GEMINI_API_KEY ? 'gemini-3.8-flash' : 'meta/llama-3.1-8b-instruct'
  ),
  DEEP_MODEL: z.string().default(
    process.env.GEMINI_API_KEY ? 'gemini-3.8-flash' : 'meta/llama-3.1-70b-instruct'
  ),
  NVIDIA_NIM_API_KEY: z.string().optional().default(process.env.NVIDIA_NIM_API_KEY || ''),
  NVIDIA_NIM_BASE_URL: z.string().default(
    process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1'
  ),
  OPENAI_API_BASE: z.string().default(
    process.env.OPENAI_API_BASE || 'http://localhost:8000/v1'
  ),
  OPENAI_API_KEY: z.string().optional().default(process.env.OPENAI_API_KEY || ''),
  GEMINI_API_KEY: z.string().optional().default(process.env.GEMINI_API_KEY || ''),
  CODE_EXEC_ENABLED: z.coerce.boolean().default(false),
  ROUTER_TIMEOUT_MS: z.coerce.number().default(1500),
  SPECIALIST_TIMEOUT_MS: z.coerce.number().default(8000),
  STORAGE_DIR: z.string().default('./data'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Config = z.infer<typeof ConfigSchema>;

let parsedConfig: Config;
try {
  parsedConfig = ConfigSchema.parse(process.env);
} catch (err) {
  console.warn('Config validation warning, using fallback defaults:', err);
  parsedConfig = ConfigSchema.parse({});
}

export const config = parsedConfig;
