import { describe, expect, test } from "vitest";
import { nextSegmentIndex } from "../src/view/ui.js";

describe("nextSegmentIndex", () => {
  test("arrow keys move to the next and previous button, wrapping around", () => {
    expect(nextSegmentIndex("ArrowRight", 0, 3)).toBe(1);
    expect(nextSegmentIndex("ArrowDown", 1, 3)).toBe(2);
    expect(nextSegmentIndex("ArrowRight", 2, 3)).toBe(0);
    expect(nextSegmentIndex("ArrowLeft", 1, 3)).toBe(0);
    expect(nextSegmentIndex("ArrowUp", 0, 3)).toBe(2);
  });

  test("Home and End go to the first and last button", () => {
    expect(nextSegmentIndex("Home", 2, 3)).toBe(0);
    expect(nextSegmentIndex("End", 0, 3)).toBe(2);
  });

  test("other keys are ignored", () => {
    expect(nextSegmentIndex("Enter", 0, 3)).toBeUndefined();
    expect(nextSegmentIndex("a", 0, 3)).toBeUndefined();
    expect(nextSegmentIndex("Tab", 1, 3)).toBeUndefined();
  });

  test("a single button stays put", () => {
    expect(nextSegmentIndex("ArrowRight", 0, 1)).toBe(0);
    expect(nextSegmentIndex("ArrowLeft", 0, 1)).toBe(0);
  });
});
