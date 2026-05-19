import { beforeEach, describe, expect, it, vi } from "vitest";

const { connectMock, queryMock, poolQueryMock, releaseMock } = vi.hoisted(() => {
  const query = vi.fn();
  const release = vi.fn();
  const poolQuery = vi.fn();

  return {
    connectMock: vi.fn().mockResolvedValue({ query, release }),
    queryMock: query,
    poolQueryMock: poolQuery,
    releaseMock: release,
  };
});

vi.mock("../config/db.js", () => ({
  pool: {
    connect: connectMock,
    query: poolQueryMock,
  },
}));

import { createProject, createTask } from "../models/projectModel.js";

describe("projectModel.createTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws INVALID_DESCRIPTION for empty task description", async () => {
    await expect(
      createTask({
        projectId: "project-uuid-1",
        categoryId: 5,
        taskName: "Task A",
        taskDescription: "   ",
        createdBy: "user-uuid-1",
      })
    ).rejects.toMatchObject({ code: "INVALID_DESCRIPTION" });

    expect(connectMock).toHaveBeenCalledTimes(0);
  });

  it("creates task with integer categoryId and default priority unset", async () => {
    poolQueryMock.mockResolvedValue({
      rows: [
        {
          id: "project-uuid-1",
          owner: "user-uuid-1",
          requester_role: "owner",
          allow_member_create_task: true,
        },
      ],
    });

    queryMock.mockImplementation(async (sql) => {
      if (sql === "BEGIN" || sql === "COMMIT") return { rows: [] };

      if (sql.includes("FROM board")) {
        return { rows: [{ id: "board-uuid-1" }] };
      }

      if (sql.includes("COALESCE(MAX(position), 0)")) {
        return { rows: [{ max_position: 2 }] };
      }

      if (sql.includes("INSERT INTO tasks")) {
        return {
          rows: [
            {
              id: "task-uuid-1",
              board_id: "board-uuid-1",
              category_id: 5,
              title: "Task A",
              description: "Details",
              priority: "unset",
              created_by: "user-uuid-1",
              position: 3,
            },
          ],
        };
      }

      return { rows: [] };
    });

    const result = await createTask({
      projectId: "project-uuid-1",
      categoryId: 5,
      taskName: "Task A",
      taskDescription: "Details",
      createdBy: "user-uuid-1",
      priority: "high",
    });

    const insertCall = queryMock.mock.calls.find(([sql]) => sql.includes("INSERT INTO tasks"));
    expect(insertCall).toBeTruthy();
    expect(insertCall[1][1]).toBe(5);
    expect(insertCall[1][4]).toBe("high");

    expect(result).toEqual({
      id: "task-uuid-1",
      boardId: "board-uuid-1",
      categoryId: 5,
      title: "Task A",
      description: "Details",
      priority: "unset",
      createdBy: "user-uuid-1",
      position: 3,
    });

    expect(releaseMock).toHaveBeenCalledTimes(1);
  });

  it("throws INVALID_CATEGORY for non-integer categoryId and rolls back", async () => {
    poolQueryMock.mockResolvedValue({
      rows: [
        {
          id: "project-uuid-1",
          owner: "user-uuid-1",
          requester_role: "owner",
          allow_member_create_task: true,
        },
      ],
    });

    queryMock.mockImplementation(async (sql) => {
      if (sql === "BEGIN" || sql === "ROLLBACK") return { rows: [] };
      return { rows: [] };
    });

    await expect(
      createTask({
        projectId: "project-uuid-1",
        categoryId: "abc",
        taskName: "Task A",
        description: "Details",
        createdBy: "user-uuid-1",
      })
    ).rejects.toMatchObject({ code: "INVALID_CATEGORY" });

    expect(queryMock).toHaveBeenCalledWith("ROLLBACK");
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe("projectModel.createProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws INVALID_DESCRIPTION for empty project description", async () => {
    await expect(
      createProject({
        name: "Alpha",
        description: "   ",
        created_by: "user-uuid-1",
      })
    ).rejects.toMatchObject({ code: "INVALID_DESCRIPTION" });

    expect(connectMock).not.toHaveBeenCalled();
  });
});
