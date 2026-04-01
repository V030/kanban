import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyTokenMock } = vi.hoisted(() => ({
  verifyTokenMock: vi.fn(),
}));

vi.mock("../utils/jwt.js", () => ({
  verifyToken: verifyTokenMock,
}));

import { authenticateToken } from "../middleware/authMiddleware.js";

function createMockRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  return res;
}

describe("authMiddleware.authenticateToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("returns 401 when token is missing", () => {
    const req = { headers: {} };
    const res = createMockRes();
    const next = vi.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Access denied. No token provided.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when token is invalid", () => {
    verifyTokenMock.mockImplementation(() => {
      throw new Error("Invalid token");
    });

    const req = { headers: { authorization: "Bearer bad-token" } };
    const res = createMockRes();
    const next = vi.fn();

    authenticateToken(req, res, next);

    expect(verifyTokenMock).toHaveBeenCalledWith("bad-token");
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid / Expired token." });
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches decoded user and calls next for valid token", () => {
    const decoded = { userId: "user-1", role: "user" };
    verifyTokenMock.mockReturnValue(decoded);

    const req = { headers: { authorization: "Bearer valid-token" } };
    const res = createMockRes();
    const next = vi.fn();

    authenticateToken(req, res, next);

    expect(verifyTokenMock).toHaveBeenCalledWith("valid-token");
    expect(req.user).toEqual(decoded);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
