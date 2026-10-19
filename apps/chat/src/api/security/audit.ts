import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.ts';

export interface AuditLogEvent {
  timestamp: string;
  action: string;
  ip?: string;
  userId?: string;
  status: 'success' | 'failure' | 'blocked';
  details?: Record<string, unknown>;
}

const auditLogFile = path.resolve(process.cwd(), config.STORAGE_DIR, 'audit.log');

export function logAudit(event: Omit<AuditLogEvent, 'timestamp'>) {
  const fullEvent: AuditLogEvent = {
    timestamp: new Date().toISOString(),
    ...event,
  };

  const line = JSON.stringify(fullEvent) + '\n';
  try {
    fs.appendFileSync(auditLogFile, line);
  } catch (err) {
    console.warn('[Audit] Could not write audit log:', err);
  }
}
