import { describe, expect, it } from "vitest";
import { getDefaultScheduleDate, resolveSchedule } from "./scheduling";

describe("scheduling", () => {
  it("chooses tomorrow for the default schedule date", () => {
    expect(getDefaultScheduleDate(new Date("2026-05-03T00:00:00.000Z"))).toBe("2026-05-04");
  });

  it("resolves an exact time", () => {
    expect(resolveSchedule({ mode: "exact", exactAt: "2026-05-04T05:00:00.000Z" })).toBe("2026-05-04T05:00:00.000Z");
  });
});
