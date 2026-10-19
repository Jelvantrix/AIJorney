export interface SpanRecord {
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  attributes?: Record<string, unknown>;
}

export interface TurnTelemetry {
  turnId: string;
  t_route: number;
  t_first_token: number;
  t_total: number;
  tokens_in: number;
  tokens_out: number;
  cached_tokens: number;
  pre_router_hit: boolean;
  specialist: string;
  spans: SpanRecord[];
}

class TelemetryCollector {
  private turnRecords: TurnTelemetry[] = [];
  private errorCounts: Map<string, number> = new Map();

  public recordTurn(telemetry: TurnTelemetry) {
    this.turnRecords.push(telemetry);
    if (this.turnRecords.length > 500) {
      this.turnRecords.shift();
    }
  }

  public recordError(code: string) {
    this.errorCounts.set(code, (this.errorCounts.get(code) || 0) + 1);
  }

  public getSummary() {
    const total = this.turnRecords.length;
    if (total === 0) {
      return {
        totalTurns: 0,
        p50FirstTokenMs: 0,
        p95FirstTokenMs: 0,
        p50TotalMs: 0,
        p95TotalMs: 0,
        avgTokensIn: 0,
        avgTokensOut: 0,
        avgCachedTokens: 0,
        cacheHitRatio: 0,
        errorRates: Object.fromEntries(this.errorCounts.entries()),
      };
    }

    const firstTokenTimes = this.turnRecords.map((t) => t.t_first_token).sort((a, b) => a - b);
    const totalTimes = this.turnRecords.map((t) => t.t_total).sort((a, b) => a - b);

    const p50Idx = Math.floor(total * 0.5);
    const p95Idx = Math.min(total - 1, Math.floor(total * 0.95));

    const totalTokensIn = this.turnRecords.reduce((sum, t) => sum + t.tokens_in, 0);
    const totalTokensOut = this.turnRecords.reduce((sum, t) => sum + t.tokens_out, 0);
    const totalCached = this.turnRecords.reduce((sum, t) => sum + t.cached_tokens, 0);

    return {
      totalTurns: total,
      p50FirstTokenMs: firstTokenTimes[p50Idx] || 0,
      p95FirstTokenMs: firstTokenTimes[p95Idx] || 0,
      p50TotalMs: totalTimes[p50Idx] || 0,
      p95TotalMs: totalTimes[p95Idx] || 0,
      avgTokensIn: Math.round(totalTokensIn / total),
      avgTokensOut: Math.round(totalTokensOut / total),
      avgCachedTokens: Math.round(totalCached / total),
      cacheHitRatio: totalTokensIn > 0 ? Number(((totalCached / totalTokensIn) * 100).toFixed(1)) : 0,
      errorRates: Object.fromEntries(this.errorCounts.entries()),
    };
  }
}

export const Telemetry = new TelemetryCollector();
