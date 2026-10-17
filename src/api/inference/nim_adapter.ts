import { OpenAICompatibleBackend } from './openai_adapter.ts';

export interface NvidiaNimConfig {
  apiKey: string;
  baseUrl?: string;
}

export class NvidiaNimBackend extends OpenAICompatibleBackend {
  constructor(cfg: NvidiaNimConfig) {
    super({
      name: 'nvidia-nim',
      baseUrl: cfg.baseUrl || 'https://integrate.api.nvidia.com/v1',
      apiKey: cfg.apiKey,
      defaultHeaders: {
        'User-Agent': 'Noevix-Orchestration/1.0',
      },
    });
  }
}
