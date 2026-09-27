// Tiny leveled logger. Writes to STDERR only: the MCP server uses stdout for the protocol.
// Level from WAADA_LOG_LEVEL (debug | info | warn | error), default info. Secret-looking fields are redacted.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;
type Fields = Record<string, unknown>;

const SECRET_KEY = /key|token|secret|password|authorization|cookie/i;

export interface Logger {
  debug(message: string, fields?: Fields): void;
  info(message: string, fields?: Fields): void;
  warn(message: string, fields?: Fields): void;
  error(message: string, fields?: Fields): void;
}

function threshold(): number {
  const level = process.env.WAADA_LOG_LEVEL?.toLowerCase();
  return level && level in LEVELS ? LEVELS[level as Level] : LEVELS.info;
}

function serialize(fields: Fields): string {
  try {
    return JSON.stringify(fields, (key, value) => {
      if (key !== "" && SECRET_KEY.test(key)) return "[redacted]";
      if (value instanceof Error) return { name: value.name, message: value.message };
      return value;
    });
  } catch {
    return '"[unserializable fields]"';
  }
}

function write(level: Level, scope: string | undefined, message: string, fields?: Fields): void {
  if (LEVELS[level] < threshold()) return;
  const prefix = scope ? ` [${scope}]` : "";
  const extra = fields && Object.keys(fields).length > 0 ? ` ${serialize(fields)}` : "";
  process.stderr.write(
    `${new Date().toISOString()} ${level.toUpperCase()}${prefix} ${message}${extra}\n`,
  );
}

export function createLogger(scope?: string): Logger {
  return {
    debug: (message, fields) => write("debug", scope, message, fields),
    info: (message, fields) => write("info", scope, message, fields),
    warn: (message, fields) => write("warn", scope, message, fields),
    error: (message, fields) => write("error", scope, message, fields),
  };
}

export const log: Logger = createLogger();
