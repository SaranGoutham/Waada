// parseFiles dispatcher (M03): routes each file to its parser by extension.
import type { LLM } from "../llm/index.ts";
import type { FileInput, Interaction } from "../models.ts";
import { transcribeAudio } from "./audio.ts";
import { parseEml } from "./eml.ts";
import { parseSlackExport } from "./slack-export.ts";
import { parseTranscript } from "./transcript.ts";

const AUDIO_EXTS = new Set([".mp3", ".m4a", ".wav", ".webm"]);
const TRANSCRIPT_EXTS = new Set([".txt", ".md", ".vtt"]);

function extension(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? name;
  const at = base.lastIndexOf(".");
  return at < 0 ? "" : base.slice(at).toLowerCase();
}

function fileName(name: string): string {
  return name.replace(/\\/g, "/").split("/").pop()?.toLowerCase() ?? name.toLowerCase();
}

function slackMetadata(files: FileInput[]): {
  channelFallback?: string;
  users: Record<string, string>;
} {
  const channels = new Set<string>();
  const users: Record<string, string> = {};
  for (const file of files) {
    try {
      const parsed: unknown = JSON.parse(new TextDecoder().decode(file.data));
      if (fileName(file.name) === "channels.json" && Array.isArray(parsed)) {
        for (const channel of parsed) {
          if (typeof channel === "object" && channel !== null && "name" in channel) {
            const name = (channel as { name?: unknown }).name;
            if (typeof name === "string" && name.trim()) channels.add(name.trim());
          }
        }
      }
      if (fileName(file.name) === "users.json" && Array.isArray(parsed)) {
        for (const user of parsed) {
          if (typeof user !== "object" || user === null) continue;
          const { id, real_name: realName, name } = user as Record<string, unknown>;
          if (typeof id === "string" && typeof (realName ?? name) === "string") {
            users[id] = (realName ?? name) as string;
          }
        }
      }
    } catch {
      // Metadata is optional; its malformed contents must not block message imports.
    }
  }
  return { channelFallback: channels.size === 1 ? [...channels][0] : undefined, users };
}

/** Dispatches each file to its parser by extension. */
export async function parseFiles(
  files: FileInput[],
  account: string,
  deps?: { llm?: LLM },
): Promise<{ interactions: Interaction[]; errors: string[] }> {
  const interactions: Interaction[] = [];
  const errors: string[] = [];
  const metadata = slackMetadata(files);
  for (const file of files) {
    const name = fileName(file.name);
    if (name === "channels.json" || name === "users.json" || name === "crm.json") continue;
    const ext = extension(file.name);
    try {
      if (ext === ".eml") {
        interactions.push(...(await parseEml(file, account)));
      } else if (ext === ".json") {
        interactions.push(...(await parseSlackExport(file, account, metadata)));
      } else if (TRANSCRIPT_EXTS.has(ext)) {
        const { interactions: parsed, warnings } = await parseTranscript(file, account, deps);
        interactions.push(...parsed);
        errors.push(...warnings);
      } else if (AUDIO_EXTS.has(ext)) {
        const { interactions: parsed, warnings } = await transcribeAudio(file, account, deps);
        interactions.push(...parsed);
        errors.push(...warnings);
      } else if (ext === ".zip") {
        errors.push(
          `${file.name}: Slack .zip exports must be extracted first (one channel-day .json per file); .zip is not read directly.`,
        );
      } else {
        errors.push(`${file.name}: unsupported extension "${ext || "(none)"}"`);
      }
    } catch (err) {
      const message = (err as Error).message;
      errors.push(message.startsWith(`${file.name}:`) ? message : `${file.name}: ${message}`);
    }
  }
  return { interactions, errors };
}
