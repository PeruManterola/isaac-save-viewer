import { describe, expect, test } from "vitest";
import {
  getPercent,
  percentText,
  progressText,
  remainingText,
} from "../src/view/progress.js";

describe("percentText", () => {
  test("uses one decimal", () => {
    expect(percentText({ unlocked: 592, total: 641 })).toBe("92.4%");
    expect(percentText({ unlocked: 701, total: 720 })).toBe("97.4%");
    expect(percentText({ unlocked: 1, total: 3 })).toBe("33.3%");
    expect(percentText({ unlocked: 0, total: 641 })).toBe("0.0%");
  });

  test("only says 100% when everything is done", () => {
    expect(percentText({ unlocked: 408, total: 408 })).toBe("100%");
    // 99.95% would round up to 100.0%.
    expect(percentText({ unlocked: 1999, total: 2000 })).toBe("99.9%");
    expect(percentText({ unlocked: 640, total: 641 })).toBe("99.8%");
  });

  test("handles an empty total", () => {
    expect(percentText({ unlocked: 0, total: 0 })).toBe("0.0%");
    expect(getPercent({ unlocked: 0, total: 0 })).toBe(0);
  });
});

describe("getPercent", () => {
  test("is the exact share", () => {
    expect(getPercent({ unlocked: 1, total: 4 })).toBe(25);
    expect(getPercent({ unlocked: 4, total: 4 })).toBe(100);
  });
});

describe("remainingText", () => {
  test("says how many are left", () => {
    expect(remainingText({ unlocked: 592, total: 641 }, "unlock")).toBe(
      "49 to unlock",
    );
    expect(remainingText({ unlocked: 700, total: 720 }, "touch")).toBe(
      "20 to touch",
    );
  });

  test("is undefined when nothing is left", () => {
    expect(remainingText({ unlocked: 408, total: 408 }, "do")).toBeUndefined();
  });
});

describe("progressText", () => {
  test("shows done / total", () => {
    expect(progressText({ unlocked: 592, total: 641 })).toBe("592 / 641");
  });
});
