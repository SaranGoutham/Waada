// landmines (M05): recall objections/resolutions → extract Landmine[].
import { z } from "zod";
import { createLLM } from "../llm/index.ts";
import { createLogger } from "../log.ts";
import { createMemory } from "../memory/index.ts";
import type { Landmine as LandmineT } from "../models.ts";
import { Landmine } from "../models.ts";
import { buildEvidence } from "./evidence.ts";
import type { AgentDeps } from "./index.ts";
import { LANDMINES_SYSTEM, landminesUser } from "./prompts.ts";

const log = createLogger("agent");

const LANDMINE_QUERIES = [
  "objections the customer raised and how they were resolved",
  "topics the customer is sensitive or negative about",
  "things the customer explicitly accepted or agreed to",
];

export async function landmines(account: string, deps?: AgentDeps): Promise<LandmineT[]> {
  const memory = deps?.memory ?? createMemory();
  const llm = deps?.llm ?? (await createLLM());
  const recalls = await Promise.all(
    LANDMINE_QUERIES.map((query) => memory.search(account, query, { budget: "high" })),
  );
  const { text: evidence, truncated } = buildEvidence(recalls);
  if (truncated) log.info("landmines: evidence truncated to the budget", { account });
  const result = await llm.extract({
    system: LANDMINES_SYSTEM,
    user: landminesUser(evidence),
    schema: z.object({ landmines: z.array(Landmine) }),
    name: "landmines",
    description: "Resolved customer objections not to re-open",
  });
  if (!result) {
    log.warn("landmines: extract returned no valid object", { account });
    return [];
  }
  return result.landmines;
}
