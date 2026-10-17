import { config } from '../config.ts';
import { InferenceBackend } from './types.ts';
import { MockBackend, setMockScenario, getMockScenario } from './mock_adapter.ts';
import { NvidiaNimBackend } from './nim_adapter.ts';
import { OpenAICompatibleBackend } from './openai_adapter.ts';
import { GeminiBackend } from './gemini_adapter.ts';

let activeBackend: InferenceBackend | null = null;
let activeBackendName: string = config.INFERENCE_BACKEND;

export function initializeBackend(): InferenceBackend {
  const backendType = activeBackendName;

  if (backendType === 'nim' && config.NVIDIA_NIM_API_KEY) {
    activeBackend = new NvidiaNimBackend({
      apiKey: config.NVIDIA_NIM_API_KEY,
      baseUrl: config.NVIDIA_NIM_BASE_URL,
    });
  } else if (backendType === 'openai') {
    activeBackend = new OpenAICompatibleBackend({
      baseUrl: config.OPENAI_API_BASE,
      apiKey: config.OPENAI_API_KEY,
    });
  } else if (backendType === 'gemini' && config.GEMINI_API_KEY) {
    activeBackend = new GeminiBackend(config.GEMINI_API_KEY);
  } else {
    // Default to Mock for rock-solid stability and zero missing key crashes
    activeBackend = new MockBackend();
    activeBackendName = 'mock';
  }

  return activeBackend;
}

export function getInferenceBackend(): InferenceBackend {
  if (!activeBackend) {
    initializeBackend();
  }
  return activeBackend!;
}

export function switchBackend(name: 'nim' | 'openai' | 'gemini' | 'mock'): InferenceBackend {
  activeBackendName = name;
  return initializeBackend();
}

export function getBackendStatus() {
  return {
    activeBackend: activeBackendName,
    isMock: activeBackendName === 'mock',
    mockScenario: getMockScenario(),
    routerModel: config.ROUTER_MODEL,
    fastModel: config.FAST_MODEL,
    deepModel: config.DEEP_MODEL,
    nimConfigured: Boolean(config.NVIDIA_NIM_API_KEY),
    geminiConfigured: Boolean(config.GEMINI_API_KEY),
    openaiConfigured: Boolean(config.OPENAI_API_KEY || config.OPENAI_API_BASE),
  };
}

export { setMockScenario, getMockScenario };
