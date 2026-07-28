import { describe, expect, it } from "vitest";
import { bilingualParagraphs } from "./MeetingSummary";

describe("bilingualParagraphs", () => {
  it("splits blank-line separated paragraphs", () => {
    expect(
      bilingualParagraphs("讨论了发布节奏。\n\nDiscussed the release cadence."),
    ).toEqual(["讨论了发布节奏。", "Discussed the release cadence."]);
  });

  it("splits legacy slash form", () => {
    expect(bilingualParagraphs("发布计划下周上线 / Ship next week")).toEqual([
      "发布计划下周上线",
      "Ship next week",
    ]);
  });

  it("keeps single paragraph intact", () => {
    expect(bilingualParagraphs("只有中文")).toEqual(["只有中文"]);
  });
});
