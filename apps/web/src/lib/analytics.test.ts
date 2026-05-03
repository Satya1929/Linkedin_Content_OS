import { describe, expect, it } from "vitest";
import { parseAnalyticsCsv } from "./analytics";

describe("analytics import", () => {
  it("parses manual CSV metrics", () => {
    const rows = parseAnalyticsCsv("draft_id,impressions,likes,comments,reposts,profile_views\nabc,1000,20,5,2,3");

    expect(rows).toHaveLength(1);
    expect(rows[0].impressions).toBe(1000);
    expect(rows[0].comments).toBe(5);
  });
});
