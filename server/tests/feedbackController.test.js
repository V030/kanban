import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendFeedbackEmailMock } = vi.hoisted(() => ({
  sendFeedbackEmailMock: vi.fn(),
}));

vi.mock("../utils/mailer.js", () => ({
  sendFeedbackEmail: sendFeedbackEmailMock,
}));

import { submitFeedback } from "../controllers/feedbackController.js";

function createMockRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  return res;
}

describe("feedbackController.submitFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FEEDBACK_RECEIVER_EMAIL = "admin@example.com";
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns 401 when the request is unauthenticated", async () => {
    const req = { body: { subject: "Hello", category: "Bug Report", message: "Valid message content" } };
    const res = createMockRes();

    await submitFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Authentication required" });
    expect(sendFeedbackEmailMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the payload is malformed", async () => {
    const req = { body: null, user: { userId: "user-1", email: "user@example.com" } };
    const res = createMockRes();

    await submitFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid feedback payload" });
  });

  it("returns 400 when the message is too short", async () => {
    const req = {
      body: {
        subject: "Broken button",
        category: "Bug Report",
        message: "Too short to pass validation",
      },
      user: { userId: "user-1", email: "user@example.com" },
    };
    const res = createMockRes();

    await submitFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Feedback message must be at least 40 characters" });
    expect(sendFeedbackEmailMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the category is invalid", async () => {
    const req = {
      body: {
        subject: "Broken button",
        category: "Invalid",
        message: "This is a valid enough message that is definitely longer than forty characters.",
      },
      user: { userId: "user-1", email: "user@example.com" },
    };
    const res = createMockRes();

    await submitFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid feedback category" });
  });

  it("sends feedback email for a valid payload", async () => {
    sendFeedbackEmailMock.mockResolvedValueOnce({ messageId: "message-1" });

    const req = {
      body: {
        subject: "Broken button",
        category: "Bug Report",
        message: "This is a valid feedback message that is definitely longer than forty characters.",
        browser: "Chrome",
        os: "Windows",
        route: "/main-page/feedback",
      },
      user: { userId: "user-1", email: "user@example.com", name: "Maya Lee" },
      headers: { "user-agent": "Mozilla/5.0" },
    };
    const res = createMockRes();

    await submitFeedback(req, res);

    expect(sendFeedbackEmailMock).toHaveBeenCalledWith({
      to: "admin@example.com",
      feedback: expect.objectContaining({
        userId: "user-1",
        userEmail: "user@example.com",
        userName: "Maya Lee",
        subject: "Broken button",
        category: "Bug Report",
        route: "/main-page/feedback",
      }),
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: "Feedback sent successfully" });
  });

  it("returns 500 when the email transport fails", async () => {
    sendFeedbackEmailMock.mockRejectedValueOnce(new Error("SMTP offline"));

    const req = {
      body: {
        subject: "Broken button",
        category: "Bug Report",
        message: "This is a valid feedback message that is definitely longer than forty characters.",
      },
      user: { userId: "user-1", email: "user@example.com" },
    };
    const res = createMockRes();

    await submitFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Unable to send feedback right now. Please try again later." });
  });
});
