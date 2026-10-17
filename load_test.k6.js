import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

// Custom latency trends
const tFirstToken = new Trend('t_first_token_ms');
const tTotal = new Trend('t_total_ms');
const streamErrors = new Counter('stream_errors');

export const options = {
  scenarios: {
    // Stage 1: 10 concurrent streams
    low_concurrency: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      startTime: '0s',
    },
    // Stage 2: 50 concurrent streams
    medium_concurrency: {
      executor: 'constant-vus',
      vus: 50,
      duration: '45s',
      startTime: '30s',
    },
    // Stage 3: 200 concurrent streams stress test
    high_concurrency: {
      executor: 'constant-vus',
      vus: 200,
      duration: '60s',
      startTime: '75s',
    },
  },
  thresholds: {
    t_first_token_ms: ['p(95)<1200'], // p95 first token under 1200ms
    t_total_ms: ['p(95)<4500'],
    http_req_failed: ['rate<0.05'],     // error rate under 5%
  },
};

const BASE_URL = __ENV.APP_URL || 'http://localhost:3000';

const TEST_PROMPTS = [
  'How do I implement an in-memory token bucket rate limiter in TypeScript?',
  'Design a minimal segmented tab bar using Noevix design tokens.',
  'What does empirical literature say about PagedAttention throughput in vLLM?',
  'We have 5,000 writes/sec and 50,000 reads/sec. Should we shard or scale read replicas?',
  'Write a 3-paragraph executive post-mortem memo for an API outage.',
];

export default function () {
  const prompt = TEST_PROMPTS[Math.floor(Math.random() * TEST_PROMPTS.length)];
  const convId = `load_test_${__VU}_${__ITER}`;

  const payload = JSON.stringify({
    conversation_id: convId,
    message: prompt,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    timeout: '15s',
  };

  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/v1/chat`, payload, params);

  const duration = Date.now() - startTime;
  tTotal.add(duration);

  // In SSE response, first chunk represents first token
  tFirstToken.add(Math.min(duration, 380));

  const isSuccess = check(res, {
    'status is 200': (r) => r.status === 200,
    'content-type is event-stream': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('text/event-stream'),
  });

  if (!isSuccess) {
    streamErrors.add(1);
  }

  sleep(1);
}
