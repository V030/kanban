import { beforeEach, describe, expect, it, vi } from "vitest";

const { poolQueryMock, bcryptCompareMock, bcryptHashMock } = vi.hoisted(() => ({
  poolQueryMock: vi.fn(),
  bcryptCompareMock: vi.fn(),
  bcryptHashMock: vi.fn(),
}));

vi.mock("../config/db.js", () => ({
  pool: {
    query: poolQueryMock,
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    compare: bcryptCompareMock,
    hash: bcryptHashMock,
  },
  compare: bcryptCompareMock,
  hash: bcryptHashMock,
}));

import { changePassword, resetPasswordWithOtp } from "../models/authModel.js";

describe("authModel password flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bcryptHashMock.mockResolvedValue("new-password-hash");
  });

  it("changes password when the new password is different", async () => {
    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ password_hash: "current-hash" }] })
      .mockResolvedValueOnce({ rows: [{ id: "user-1", email: "maya@example.com" }] });

    bcryptCompareMock
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const result = await changePassword("user-1", "old-secret", "new-secret");

    expect(result).toEqual({ id: "user-1", email: "maya@example.com" });
    expect(poolQueryMock).toHaveBeenCalledTimes(2);
    expect(bcryptHashMock).toHaveBeenCalledWith("new-secret", 10);
  });

  it("rejects reusing the current password during change-password", async () => {
    poolQueryMock.mockResolvedValueOnce({ rows: [{ password_hash: "current-hash" }] });

    bcryptCompareMock
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    await expect(changePassword("user-1", "old-secret", "old-secret")).rejects.toThrow(
      "New password must be different from the current password"
    );

    expect(poolQueryMock).toHaveBeenCalledTimes(1);
  });

  it("resets password when OTP is valid and the new password is different", async () => {
    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: "user-1", email: "maya@example.com", password_hash: "current-hash" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            user_id: "user-1",
            otp_hash: "otp-hash",
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            attempts: 0,
            consumed_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: "user-1", email: "maya@example.com" }] })
      .mockResolvedValueOnce({ rows: [] });

    bcryptCompareMock
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const result = await resetPasswordWithOtp("maya@example.com", "123456", "fresh-secret");

    expect(result).toEqual({ id: "user-1", email: "maya@example.com" });
    expect(poolQueryMock).toHaveBeenCalledTimes(4);
    expect(bcryptHashMock).toHaveBeenCalledWith("fresh-secret", 10);
  });

  it("rejects an invalid OTP during password reset", async () => {
    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: "user-1", email: "maya@example.com", password_hash: "current-hash" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            user_id: "user-1",
            otp_hash: "otp-hash",
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            attempts: 0,
            consumed_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    bcryptCompareMock.mockResolvedValueOnce(false);

    await expect(resetPasswordWithOtp("maya@example.com", "654321", "fresh-secret")).rejects.toThrow(
      "Invalid OTP"
    );

    expect(poolQueryMock).toHaveBeenCalledTimes(3);
  });
});