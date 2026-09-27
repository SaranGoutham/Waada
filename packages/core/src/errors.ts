// Core code throws these; surfaces (web, MCP, API routes) catch them and show `message`.
// Messages must be safe to show users: no secrets, no stack traces.

export class WaadaError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class ConfigError extends WaadaError {}

export class ExternalServiceError extends WaadaError {}
