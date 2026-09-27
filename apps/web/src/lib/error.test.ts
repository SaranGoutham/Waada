import { describe, expect, it } from "vitest";
import { routeErrorMessage } from "./error";

describe("routeErrorMessage", () => {
  it("uses the server function's user-safe error message", () => {
    expect(routeErrorMessage(new Error("Couldn't reach Hindsight."))).toBe(
      "Couldn't reach Hindsight.",
    );
  });

  it("uses a friendly fallback for non-Error failures", () => {
    expect(routeErrorMessage(undefined)).toBe("Something went wrong. Check the server log.");
  });
});
