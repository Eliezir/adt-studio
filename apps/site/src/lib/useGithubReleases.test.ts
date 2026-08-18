import { afterEach, describe, expect, it, vi } from "vitest";
import { formatAbsoluteDate, formatRelativeDate } from "./useGithubReleases";

describe("release date formatting", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uses the selected locale for absolute dates", () => {
    expect(formatAbsoluteDate("2026-07-08T12:00:00Z", "fr")).toBe(
      "8 juillet 2026",
    );
  });

  it("uses the selected locale for relative dates", () => {
    vi.spyOn(Date, "now").mockReturnValue(
      new Date("2026-07-10T12:00:00Z").getTime(),
    );
    expect(formatRelativeDate("2026-07-08T12:00:00Z", "fr")).toBe(
      "avant-hier",
    );
  });
});
