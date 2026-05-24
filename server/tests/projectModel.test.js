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

import { createProject, createTask, assignTaskToOthers, takeProjectTask, createTaskTag, deleteTaskTag, updateTaskName, updateTaskDescription, updateTaskPriority, updateTaskTargetDate, updateTaskStatus, deleteTask } from "../models/projectModel.js";

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

describe("projectModel task assignment permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects self-assign when member take-task permission is disabled", async () => {
    poolQueryMock.mockResolvedValueOnce({
      rows: [
        {
          task_id: 10,
          project_id: "project-uuid-1",
          owner: "owner-uuid-1",
          requester_role: "member",
          allow_member_take_task: false,
          allow_assign_task_to_member: true,
        },
      ],
    });

    await expect(
      takeProjectTask({ taskId: 10, userId: "user-uuid-1" })
    ).rejects.toMatchObject({ code: "PROJECT_FORBIDDEN" });

    expect(poolQueryMock).toHaveBeenCalledTimes(1);
  });

  it("rejects assigning other members when member take-task permission is disabled", async () => {
    poolQueryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            project_id: "project-uuid-1",
            owner: "owner-uuid-1",
            requester_role: "member",
            allow_member_take_task: false,
            allow_assign_task_to_member: true,
          },
        ],
      });

    await expect(
      assignTaskToOthers({ taskId: 10, memberId: "member-uuid-2", requesterId: "user-uuid-1" })
    ).rejects.toMatchObject({ code: "PROJECT_FORBIDDEN" });

    expect(poolQueryMock).toHaveBeenCalledTimes(1);
  });

  it("allows assigning another member when both permissions are enabled", async () => {
    poolQueryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            project_id: "project-uuid-1",
            owner: "owner-uuid-1",
            requester_role: "member",
            allow_member_take_task: true,
            allow_assign_task_to_member: true,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 99,
            task_id: 10,
            user_id: "member-uuid-2",
          },
        ],
      });

    const result = await assignTaskToOthers({ taskId: 10, memberId: "member-uuid-2", requesterId: "user-uuid-1" });

    expect(result).toEqual({ id: 99, taskId: 10, memberId: "member-uuid-2" });
    expect(poolQueryMock).toHaveBeenCalledTimes(2);
  });
});

describe("projectModel.createTaskTag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects member tag creation when the project permission is disabled", async () => {
    poolQueryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 10,
          project_id: "project-uuid-1",
          requester_role: "member",
          owner: "owner-uuid-1",
          created_by: "user-uuid-1",
          is_assignee: false,
          allow_member_create_tag: false,
        },
      ],
    });

    await expect(
      createTaskTag({ taskId: 10, tagName: "Bug", projectId: "project-uuid-1", requesterId: "user-uuid-1" })
    ).rejects.toMatchObject({ code: "TASK_FORBIDDEN" });

    expect(poolQueryMock).toHaveBeenCalledTimes(1);
  });

  it("allows member tag creation when the project permission is enabled and the user is creator", async () => {
    poolQueryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            project_id: "project-uuid-1",
            requester_role: "member",
            owner: "owner-uuid-1",
            created_by: "user-uuid-1",
            is_assignee: false,
            allow_member_create_tag: true,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ cnt: 0 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            task_id: 10,
            tag_name: "Bug",
            project_id: "project-uuid-1",
          },
        ],
      });

    const result = await createTaskTag({ taskId: 10, tagName: "Bug", projectId: "project-uuid-1", requesterId: "user-uuid-1" });

    expect(result).toEqual({ id: 1, taskId: 10, tagName: "Bug", projectId: "project-uuid-1" });
    expect(poolQueryMock).toHaveBeenCalledTimes(4);
  });
});

describe("projectModel.deleteTaskTag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects member tag deletion when the project permission is disabled", async () => {
    poolQueryMock
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 10,
            project_id: "project-uuid-1",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            project_id: "project-uuid-1",
            requester_role: "member",
            owner: "owner-uuid-1",
            created_by: "user-uuid-1",
            is_assignee: true,
            allow_member_create_tag: false,
          },
        ],
      });

    await expect(deleteTaskTag({ tagId: 5, requesterId: "user-uuid-1" })).rejects.toMatchObject({ code: "TASK_FORBIDDEN" });

    expect(poolQueryMock).toHaveBeenCalledTimes(2);
  });
});

describe("projectModel admin task management permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects admin task creation when manage-tasks is disabled", async () => {
    poolQueryMock.mockResolvedValueOnce({
      rows: [
        {
          id: "project-uuid-1",
          owner: "owner-uuid-1",
          requester_role: "admin",
          allow_admin_manage_tasks: false,
        },
      ],
    });

    await expect(
      createTask({
        projectId: "project-uuid-1",
        categoryId: 5,
        taskName: "Task A",
        taskDescription: "Details",
        createdBy: "admin-uuid-1",
      })
    ).rejects.toMatchObject({ code: "PROJECT_FORBIDDEN" });
  });

  it("rejects admin task title edits when manage-tasks is disabled", async () => {
    poolQueryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 10,
          project_id: "project-uuid-1",
          owner: "owner-uuid-1",
          requester_role: "admin",
          allow_admin_manage_tasks: false,
          allow_member_edit_task: true,
        },
      ],
    });

    await expect(
      updateTaskName({ taskId: 10, requesterId: "admin-uuid-1", name: "Updated" })
    ).rejects.toMatchObject({ code: "TASK_FORBIDDEN" });
  });

  it("rejects admin target-date edits when manage-tasks is disabled", async () => {
    poolQueryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 10,
          project_id: "project-uuid-1",
          owner: "owner-uuid-1",
          requester_role: "admin",
          allow_admin_manage_tasks: false,
          allow_member_edit_task: true,
        },
      ],
    });

    await expect(
      updateTaskTargetDate({ taskId: 10, requesterId: "admin-uuid-1", targetDate: "2026-05-24" })
    ).rejects.toMatchObject({ code: "TASK_FORBIDDEN" });
  });

  it("rejects admin task deletion when manage-tasks is disabled", async () => {
    poolQueryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 10,
          project_id: "project-uuid-1",
          owner: "owner-uuid-1",
          requester_role: "admin",
          allow_admin_manage_tasks: false,
          allow_member_delete_task: true,
        },
      ],
    });

    await expect(
      deleteTask({ taskId: 10, requesterId: "admin-uuid-1" })
    ).rejects.toMatchObject({ code: "TASK_FORBIDDEN" });
  });

  it("rejects admin task moves when manage-tasks is disabled", async () => {
    poolQueryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            category_id: 3,
            project_id: "project-uuid-1",
            category_name: "todo",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 10,
            project_id: "project-uuid-1",
            owner: "owner-uuid-1",
            requester_role: "admin",
            allow_admin_manage_tasks: false,
            is_assignee: true,
          },
        ],
      });

    await expect(
      updateTaskStatus({ taskId: 10, userId: "admin-uuid-1", categoryId: 8 })
    ).rejects.toMatchObject({ code: "TASK_FORBIDDEN" });
  });
});
