// commitmentLedger (M05): recall → dedupe → extract → sort.
import { z } from "zod";
import { createLLM } from "../llm/index.ts";
import { createLogger } from "../log.ts";
import { createMemory } from "../memory/index.ts";
import type { Commitment as CommitmentT } from "../models.ts";
import { Commitment } from "../models.ts";
import { buildEvidence } from "./evidence.ts";
import type { AgentDeps } from "./index.ts";
import { LEDGER_SYSTEM, ledgerUser } from "./prompts.ts";

const log = createLogger("agent");

const LEDGER_QUERIES = [
  "commitments or promises our team made to the customer",
  "documents, proposals or materials we sent or delivered",
  "follow-ups we owe the customer",
  "things the customer is still waiting for",
];

const STATUS_RANK = { open: 0, unclear: 1, delivered: 2 } as const;

function sortLedger(commitments: CommitmentT[]): CommitmentT[] {
  return commitments
    .map((c, index) => ({ c, index }))
    .sort((a, b) => {
      const rank = STATUS_RANK[a.c.status] - STATUS_RANK[b.c.status];
      if (rank !== 0) return rank;
      if (a.c.status === "open") {
        if (a.c.date === b.c.date) return a.index - b.index;
        if (a.c.date === null) return 1;
        if (b.c.date === null) return -1;
        return a.c.date > b.c.date ? -1 : 1;
      }
      return a.index - b.index;
    })
    .map((x) => x.c);
}

export async function commitmentLedger(account: string, deps?: AgentDeps): Promise<CommitmentT[]> {
  const memory = deps?.memory ?? createMemory();
  const llm = deps?.llm ?? (await createLLM());
  const recalls = await Promise.all(
    LEDGER_QUERIES.map((query) => memory.search(account, query, { budget: "high" })),
  );
  const { text: evidence, truncated } = buildEvidence(recalls);
  if (truncated) log.info("commitmentLedger: evidence truncated to the budget", { account });
  const result = await llm.extract({
    system: LEDGER_SYSTEM,
    user: ledgerUser(evidence),
    schema: z.object({ commitments: z.array(Commitment) }),
    name: "commitments",
    description: "Commitments our team made to the customer",
    temperature: 0,
  });
  if (!result) {
    log.warn("commitmentLedger: extract returned no valid object", { account });
    return [];
  }
  return sortLedger(result.commitments);
}
