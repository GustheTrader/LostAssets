import { config } from "./config";

const isDev = config.NODE_ENV === "development";

export interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  msg: string;
  meta?: Record<string, any>;
  timestamp: string;
}

const logBuffer: LogEntry[] = [];
const MAX_BUFFER = 500;

function push(entry: LogEntry) {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_BUFFER) logBuffer.shift();
}

function fmt(entry: LogEntry): string {
  const ts = entry.timestamp;
  const meta = entry.meta ? JSON.stringify(entry.meta) : "";
  return `[${ts}] [${entry.level.toUpperCase()}] ${entry.msg} ${meta}`;
}

export const logger = {
  debug(msg: string, meta?: Record<string, any>) {
    const e: LogEntry = { level: "debug", msg, meta, timestamp: new Date().toISOString() };
    push(e);
    if (isDev) console.debug(fmt(e));
  },
  info(msg: string, meta?: Record<string, any>) {
    const e: LogEntry = { level: "info", msg, meta, timestamp: new Date().toISOString() };
    push(e);
    console.log(fmt(e));
  },
  warn(msg: string, meta?: Record<string, any>) {
    const e: LogEntry = { level: "warn", msg, meta, timestamp: new Date().toISOString() };
    push(e);
    console.warn(fmt(e));
  },
  error(msg: string, meta?: Record<string, any>) {
    const e: LogEntry = { level: "error", msg, meta, timestamp: new Date().toISOString() };
    push(e);
    console.error(fmt(e));
  },
  getRecent(limit = 100): LogEntry[] {
    return logBuffer.slice(-limit);
  },
};
