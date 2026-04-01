import { beforeEach, describe, expect, it, vi } from "vitest";

const { createProjectModelMock } = vi.hoisted(() => ({
  createProjectModelMock: vi.fn(),
}));

vi.mock("../models/projectModel.js", () => ({
  createProject: createProjectModelMock,
}));

import { createProject } from "../controllers/projectController.js";

function createMockRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  return res;
}

describe("projectController.createProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when JWT user id is missing", async () => {
    const req = { body: { name: "Alpha" } };
    const res = createMockRes();

    await createProject(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Authentication required" });
    expect(createProjectModelMock).not.toHaveBeenCalled();
  });

  it("returns 400 when project name is empty", async () => {
    const req = {
      body: { name: "   " },
      user: { userId: "user-1" },
    };
    const res = createMockRes();

    await createProject(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Project name is required" });
    expect(createProjectModelMock).not.toHaveBeenCalled();
  });

  it("returns 400 when project name is too long", async () => {
    const req = {
      body: { name: "a".repeat(256) },
      user: { userId: "user-1" },
    };
    const res = createMockRes();

    await createProject(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Project name is too long" });
    expect(createProjectModelMock).not.toHaveBeenCalled();
  });

  it("creates project and returns 201 for valid payload", async () => {
    const modelResult = {
      board: { id: "board-1" },
      project: { id: "project-1" },
      categories: [{ id: 1, name: "todo" }],
    };

    createProjectModelMock.mockResolvedValue(modelResult);

    const req = {
      body: { name: "  Alpha  ", description: "  First project  " },
      user: { userId: "user-1" },
    };
    const res = createMockRes();

    await createProject(req, res);

    expect(createProjectModelMock).toHaveBeenCalledWith({
      name: "Alpha",
      description: "First project",
      created_by: "user-1",
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Project created successfully",
      project: modelResult.project,
      board: modelResult.board,
      categories: modelResult.categories,
    });
  });

  it("accepts legacy payload keys project_name/project_description", async () => {
    createProjectModelMock.mockResolvedValue({
      board: { id: "board-2" },
      project: { id: "project-2" },
      categories: [],
    });

    const req = {
      body: { project_name: "Legacy", project_description: "Old client shape" },
      user: { userId: "user-2" },
    };
    const res = createMockRes();

    await createProject(req, res);

    expect(createProjectModelMock).toHaveBeenCalledWith({
      name: "Legacy",
      description: "Old client shape",
      created_by: "user-2",
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("returns 500 when model throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    createProjectModelMock.mockRejectedValue(new Error("DB down"));

    const req = {
      body: { name: "Alpha" },
      user: { userId: "user-1" },
    };
    const res = createMockRes();

    await createProject(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Unable to create project" });
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
