import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requestPasswordResetOtpMock,
  resetPasswordWithOtpMock,
  sendPasswordResetOtpEmailMock,
  normalizeEmailMock,
  sanitizeNameMock,
  isValidEmailMock,
} = vi.hoisted(() => ({
  requestPasswordResetOtpMock: vi.fn(),
  resetPasswordWithOtpMock: vi.fn(),
  sendPasswordResetOtpEmailMock: vi.fn(),
  normalizeEmailMock: vi.fn((email) => String(email || "").trim().toLowerCase()),
  sanitizeNameMock: vi.fn((name) => String(name || "").trim()),
  isValidEmailMock: vi.fn((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""))),
}));

vi.mock("../models/authModel.js", () => ({
  createUser: vi.fn(),
  logUser: vi.fn(),
  findByEmail: vi.fn(),
  changePassword: vi.fn(),
  updateUserProfile: vi.fn(),
  requestPasswordResetOtp: requestPasswordResetOtpMock,
  resetPasswordWithOtp: resetPasswordWithOtpMock,
  verifyPasswordResetOtp: vi.fn(),
  completePasswordReset: vi.fn(),
  normalizeEmail: normalizeEmailMock,
  sanitizeName: sanitizeNameMock,
  isValidEmail: isValidEmailMock,
  requestEmailVerificationOtp: vi.fn(),
  verifyEmailVerificationOtp: vi.fn(),
  validateEmailVerificationToken: vi.fn(),
  clearEmailVerificationOtp: vi.fn(),
}));

vi.mock("../utils/mailer.js", () => ({
  sendEmailVerificationOtpEmail: vi.fn(),
  sendPasswordResetOtpEmail: sendPasswordResetOtpEmailMock,
}));

import {
  requestPasswordResetController,
  resetPasswordController,
} from "../controllers/authController.js";

function createMockRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  return res;
}

describe("authController forgot password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when forgot-password email is missing", async () => {
    const req = { body: {} };
    const res = createMockRes();

    await requestPasswordResetController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Email is required" });
  });

  it("returns a generic success response even when the email is not found", async () => {
    requestPasswordResetOtpMock.mockResolvedValueOnce(null);

    const req = { body: { email: "missing@example.com" } };
    const res = createMockRes();

    await requestPasswordResetController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "If the email exists, a password reset code has been sent.",
    });
    expect(sendPasswordResetOtpEmailMock).not.toHaveBeenCalled();
  });

  it("sends a reset code when the email exists", async () => {
    requestPasswordResetOtpMock.mockResolvedValueOnce({
      email: "maya@example.com",
      otp: "123456",
      expiresAt: new Date("2026-05-15T12:00:00.000Z"),
    });

    const req = { body: { email: "maya@example.com" } };
    const res = createMockRes();

    await requestPasswordResetController(req, res);

    expect(sendPasswordResetOtpEmailMock).toHaveBeenCalledWith({
      to: "maya@example.com",
      otp: "123456",
      expiresAt: new Date("2026-05-15T12:00:00.000Z"),
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 400 when the reset password payload is incomplete", async () => {
    const req = { body: { email: "maya@example.com" } };
    const res = createMockRes();

    await resetPasswordController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Email, OTP, and new password are required" });
  });

  it("returns 400 when the new password matches the current password during reset", async () => {
    resetPasswordWithOtpMock.mockRejectedValueOnce(new Error("New password must be different from the current password"));

    const req = {
      body: {
        email: "maya@example.com",
        otp: "123456",
        newPassword: "old-secret",
      },
    };
    const res = createMockRes();

    await resetPasswordController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "New password must be different from the current password",
    });
  });
});
