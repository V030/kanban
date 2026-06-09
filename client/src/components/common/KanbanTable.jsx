import { useEffect, useMemo, useState } from "react";
import "../styles/KanbanBoard.css";

const STATUS_TABS = [
  { key: "todo", label: "TODO", aliases: ["todo", "to_do", "to do"] },
  { key: "in_progress", label: "IN PROGRESS", aliases: ["in_progress", "in progress"] },
  { key: "to_review", label: "TO REVIEW", aliases: ["to_review", "to review", "review"] },
  { key: "done", label: "DONE", aliases: ["done", "completed"] },
];

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
}

function formatPriority(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/_priority$/i, "")
    .replace(/\s+/g, "_");
  const pillClass = normalized === "critical" ? "urgent" : normalized || "unset";
  const label =
    pillClass === "unset"
      ? "Unset"
      : pillClass.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

  return { pillClass, label };
}

function getCreatorName(task) {
  return `${task?.creator?.firstName || task?.createdBy?.firstName || task?.creator?.first_name || task?.createdBy?.first_name || ""} ${
    task?.creator?.lastName || task?.createdBy?.lastName || task?.creator?.last_name || task?.createdBy?.last_name || ""
  }`.trim();
}

function getPendingLabel(pendingAction) {
  switch (pendingAction) {
    case "delete":
      return "Deleting...";
    case "move":
      return "Moving...";
    case "take":
      return "Assigning...";
    case "unassign":
      return "Unassigning...";
    case "create":
      return "Creating...";
    default:
      return "Updating...";
  }
}

function sortTasks(tasksInput) {
  const tasks = Array.isArray(tasksInput) ? [...tasksInput] : [];
  const priorityRank = (priority) => {
    const normalized = String(priority || "").toLowerCase();
    if (normalized === "critical" || normalized === "urgent") return 4;
    if (normalized === "high") return 3;
    if (normalized === "medium") return 2;
    if (normalized === "low") return 1;
    return 0;
  };

  tasks.sort((a, b) => {
    const priorityA = priorityRank(a?.priority);
    const priorityB = priorityRank(b?.priority);
    if (priorityA !== priorityB) return priorityB - priorityA;

    const dateA = new Date(a?.createdAt || a?.created_at || 0).getTime() || 0;
    const dateB = new Date(b?.createdAt || b?.created_at || 0).getTime() || 0;
    return dateB - dateA;
  });

  return tasks;
}

export default function KanbanTable({
  columns = [],
  onAddTask,
  onTaskClick,
  onTakeTask,
  onUnassignTask,
  onRemoveTask,
  isTaskAssignedToMe,
  getTaskAssignedMembers,
  getDisplayName,
  getInitials,
  getProfileImageSrc,
  formatDateShort,
  pendingTaskActions = {},
  canTakeTask = false,
  canAdminManageTasks = false,
  showAddTaskButton = true,
}) {
  const availableTabs = useMemo(
    () =>
      STATUS_TABS.map((tab) => {
        const column = columns.find((entry) => {
          const normalized = normalizeStatus(entry?.title || entry?.name || entry?.id);
          return tab.aliases.some((alias) => normalizeStatus(alias) === normalized);
        });

        return {
          ...tab,
          column,
          count: Array.isArray(column?.tasks) ? column.tasks.length : 0,
        };
      }),
    [columns]
  );

  const [activeStatus, setActiveStatus] = useState(availableTabs[0]?.key || "todo");

  useEffect(() => {
    if (!availableTabs.some((tab) => tab.key === activeStatus)) {
      setActiveStatus(availableTabs[0]?.key || "todo");
    }
  }, [activeStatus, availableTabs]);

  const activeTab = availableTabs.find((tab) => tab.key === activeStatus) || availableTabs[0];
  const activeColumn = activeTab?.column;
  const visibleTasks = useMemo(() => sortTasks(activeColumn?.tasks), [activeColumn]);

  return (
    <section className="tf-table-view" aria-label="Kanban table view">
      <header className="tf-table-header">
        <div className="tf-table-tabs" role="tablist" aria-label="Task status filter">
          {availableTabs.map((tab) => {
            const isActive = tab.key === activeStatus;

            return (
              <button
                key={tab.key}
                type="button"
                className={`tf-mobile-tab${isActive ? " is-active" : ""}`}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveStatus(tab.key)}
              >
                <span>{tab.label}</span>
                <span className="tf-mobile-tab-count">{tab.count}</span>
              </button>
            );
          })}
        </div>

        {showAddTaskButton && (
          <button
            type="button"
            className="tf-table-new-task-btn"
            onClick={() => onAddTask?.(activeColumn)}
            aria-label="Add new task"
          >
            + New Task
          </button>
        )}
      </header>

      <div className="tf-table-scroll">
        <table className="tf-task-table">
          <thead>
            <tr>
              <th scope="col">Priority</th>
              <th scope="col">Task Name</th>
              <th scope="col">Created By</th>
              <th scope="col">Assignees</th>
              <th scope="col">Target Date</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleTasks.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <p className="tf-empty-message">No tasks yet.</p>
                </td>
              </tr>
            )}

            {visibleTasks.map((task) => {
              const assignedMembers = getTaskAssignedMembers?.(task) || [];
              const isAssignedToMe = isTaskAssignedToMe?.(task) || false;
              const columnName = normalizeStatus(activeColumn?.title || activeColumn?.name);
              const isToReview = columnName === "to_review" || columnName.includes("review");
              const isDone = columnName === "done" || columnName === "completed";
              const showTakeTask = canTakeTask && !isAssignedToMe && !isDone && !isToReview;
              const showUnassignTask = canTakeTask && isAssignedToMe && !isDone && !isToReview;
              const showRemoveTask = isDone && canAdminManageTasks;
              const pendingAction = pendingTaskActions[String(task?.id)] || (task?.isPending ? "create" : "");
              const isPending = Boolean(pendingAction);
              const pendingLabel = getPendingLabel(pendingAction);
              const actionLabel = isPending ? pendingLabel : showUnassignTask ? "Unassign" : "Take Task";
              const priority = formatPriority(task?.priority);
              const creatorName = getCreatorName(task) || "Unknown";
              const targetDate = task?.targetDate || task?.target_date;
              const targetDateLabel = formatDateShort?.(targetDate) || "No target";
              const isOverdue = Boolean(task?.isPastDue || task?.is_past_due);

              return (
                <tr
                  key={task.id}
                  tabIndex={0}
                  onClick={() => onTaskClick?.(task, activeColumn)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onTaskClick?.(task, activeColumn);
                    }
                  }}
                >
                  <td>
                    <span className={`tf-priority-pill tf-priority-${priority.pillClass}`}>
                      <span>{priority.label}</span>
                    </span>
                  </td>
                  <td>
                    <strong className="tf-task-title">{task.title}</strong>
                    {isPending && <p className="tf-task-pending">{pendingLabel}</p>}
                  </td>
                  <td>{creatorName}</td>
                  <td>
                    <div className="tf-task-avatar-row">
                      {assignedMembers.length > 0 ? (
                        assignedMembers.slice(0, 3).map((member, index) => (
                          <span key={member?.id ?? index} className="tf-task-avatar" title={getDisplayName?.(member)}>
                            {getProfileImageSrc?.(member) ? (
                              <img src={getProfileImageSrc(member)} alt={getDisplayName?.(member)} />
                            ) : (
                              getInitials?.(member)
                            )}
                          </span>
                        ))
                      ) : (
                        <span className="tf-task-unassigned">None</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={isOverdue ? "tf-task-target-date is-overdue" : "tf-task-target-date"}>
                      {targetDateLabel}
                    </span>
                  </td>
                  <td>
                    {(showRemoveTask || showTakeTask || showUnassignTask) ? (
                      <button
                        type="button"
                        className={`tf-task-action${showUnassignTask || showRemoveTask ? " tf-task-action--unassign" : " tf-task-action--take"}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (isPending) return;
                          if (showRemoveTask) {
                            onRemoveTask?.(task);
                            return;
                          }
                          if (showUnassignTask) {
                            onUnassignTask?.(task);
                            return;
                          }
                          onTakeTask?.(task);
                        }}
                        disabled={isPending}
                      >
                        {showRemoveTask ? "Remove" : actionLabel}
                      </button>
                    ) : (
                      <span className="tf-task-unassigned">No actions</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
