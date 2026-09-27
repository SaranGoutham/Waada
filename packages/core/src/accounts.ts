// Account registry in .waada/accounts.json (AGENTS.md §6.3).
import { z } from "zod";
import { slugify } from "./config.ts";
import { WaadaError } from "./errors.ts";
import { readJson, writeJson } from "./store.ts";

const FILE = "accounts.json";

export const Account = z.object({
  slug: z.string(),
  name: z.string(),
  createdAt: z.string().datetime(),
});
export type Account = z.infer<typeof Account>;

const Accounts = z.array(Account);

export function listAccounts(): Promise<Account[]> {
  return readJson(FILE, Accounts, []);
}

// Serialise read-modify-write within this process so concurrent upserts don't lose each other.
let queue: Promise<unknown> = Promise.resolve();

/** Creates the account, or renames it if the slug exists (createdAt is kept). Slug defaults to slugify(name). */
export function upsertAccount(a: { name: string; slug?: string }): Promise<Account> {
  const run = async (): Promise<Account> => {
    const name = a.name.trim();
    if (name === "") throw new WaadaError("Account name can't be empty.");
    const slug = slugify(a.slug ?? name);
    const accounts = await listAccounts();
    const existing = accounts.find((x) => x.slug === slug);
    const account: Account = existing
      ? { ...existing, name }
      : { slug, name, createdAt: new Date().toISOString() };
    const next = existing
      ? accounts.map((x) => (x.slug === slug ? account : x))
      : [...accounts, account];
    await writeJson(FILE, next);
    return account;
  };
  const result = queue.then(run, run);
  queue = result.catch(() => {});
  return result;
}
