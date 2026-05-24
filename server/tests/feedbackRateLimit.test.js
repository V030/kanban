import { describe, expect, it } from "vitest";
import { rateLimitConfig } from "../config/rateLimitConfig.js";
import { feedbackLimiter } from "../middleware/rateLimiter.js";

describe("feedback rate limiting", () => {
  it("uses a bounded submissions window for authenticated feedback requests", () => {
    expect(typeof feedbackLimiter).toBe("function");
    expect(rateLimitConfig.feedback.windowMs).toBe(15 * 60 * 1000);
    expect(rateLimitConfig.feedback.max).toBeGreaterThanOrEqual(3);
    expect(rateLimitConfig.feedback.max).toBeLessThanOrEqual(5);
  });
});