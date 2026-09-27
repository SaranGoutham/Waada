// Audio parser (M03): transcribe via the LLM, then treat the result
// as a transcript with no header. Type `call`, source `audio`.
import { WaadaError } from "../errors.ts";
import type { LLM } from "../llm/index.ts";
import type { FileInput } from "../models.ts";
import { fileHash } from "./eml.ts";
import { parseTranscript, type TranscriptResult } from "./transcript.ts";

function transcriptName(name: string): string {
  return name.replace(/\.[^.]+$/, ".txt");
}

export async function transcribeAudio(
  file: FileInput,
  account: string,
  deps?: { llm?: LLM },
): Promise<TranscriptResult> {
  if (!deps?.llm) {
    throw new WaadaError(`${file.name}: transcription needs a configured LLM; set one up first.`);
  }
  const text = await deps.llm.transcribe(file.data, file.name);
  const { interactions, warnings } = await parseTranscript(
    { name: transcriptName(file.name), data: new TextEncoder().encode(text) },
    account,
    deps,
  );
  const sourceId = `file:${fileHash(file.data)}`;
  return {
    interactions: interactions.map((i) => ({ ...i, type: "call", source: "audio", sourceId })),
    warnings,
  };
}
