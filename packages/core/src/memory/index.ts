// STUB (M00). Owned by M01: replace the body of createMemory() with the Hindsight implementation.
// Only this folder may import @vectorize-io/hindsight-client (AGENTS.md rule 4).
import type { Interaction, MemoryHit } from "../models.ts";

export interface Memory {
  ensureBank(account: string): Promise<string>;
  remember(i: Interaction): Promise<void>;
  search(
    account: string,
    query: string,
    opts?: { budget?: "low" | "mid" | "high"; maxResults?: number },
  ): Promise<MemoryHit[]>;
  reflect(account: string, query: string): Promise<string>;
  deleteBank(account: string): Promise<void>;
}

export function createMemory(): Memory {
  throw new Error("not implemented: memory");
}
