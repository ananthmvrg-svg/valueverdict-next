import { describe, expect, it } from "vitest";
import { cycleStart, priceCheckStart } from "../src/lib/refresh";

/* 6:00 AM India time = 00:30 UTC (India is UTC+5:30, no daylight saving) */
const at = (iso: string) => Date.parse(iso);

describe("daily 6 AM IST cycle", () => {
  it("starts exactly at 6:00 AM IST", () => {
    expect(cycleStart(at("2026-10-25T00:30:00Z"))).toBe("2026-10-25T00:30:00.000Z");
  });
  it("one second before 6 AM still belongs to the previous day's cycle", () => {
    expect(cycleStart(at("2026-10-25T00:29:59Z"))).toBe("2026-10-24T00:30:00.000Z");
  });
  it("late evening and after midnight IST stay on that morning's cycle", () => {
    expect(cycleStart(at("2026-10-25T17:00:00Z"))).toBe("2026-10-25T00:30:00.000Z"); /* 10:30 PM IST */
    expect(cycleStart(at("2026-10-25T20:00:00Z"))).toBe("2026-10-25T00:30:00.000Z"); /* 1:30 AM IST, 26 Oct */
  });
  it("works across month and year ends", () => {
    expect(cycleStart(at("2026-12-31T23:00:00Z"))).toBe("2026-12-31T00:30:00.000Z"); /* 4:30 AM IST, 1 Jan */
    expect(cycleStart(at("2027-01-01T01:00:00Z"))).toBe("2027-01-01T00:30:00.000Z");
  });
});

describe("price re-check every 3 hours after 6 AM", () => {
  it("is not due in the first 3 hours of the cycle", () => {
    expect(priceCheckStart(at("2026-10-25T00:30:00Z"))).toBeNull();
    expect(priceCheckStart(at("2026-10-25T03:29:59Z"))).toBeNull(); /* 8:59:59 AM IST */
  });
  it("is due from 9 AM, 12 PM, … IST", () => {
    expect(priceCheckStart(at("2026-10-25T03:30:00Z"))).toBe("2026-10-25T03:30:00.000Z"); /* 9 AM IST */
    expect(priceCheckStart(at("2026-10-25T07:00:00Z"))).toBe("2026-10-25T06:30:00.000Z"); /* 12:30 PM → 12 PM check */
  });
  it("keeps checking through the night until the next 6 AM cycle", () => {
    expect(priceCheckStart(at("2026-10-25T23:59:00Z"))).toBe("2026-10-25T21:30:00.000Z"); /* 5:29 AM IST → 3 AM check */
  });
});
