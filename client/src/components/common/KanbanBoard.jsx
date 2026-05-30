import "../styles/KanbanBoard.css";
import { useEffect, useMemo, useState } from "react";

export default function KanbanBoard({
  columns = [],
  onAddTask,
  onTaskDrop,
  onTaskClick,
  renderTask,
  isTaskAssignedToMe,
  canDragTask,
  showAddTaskButton = true,
}) {
  const [activeColumnId, setActiveColumnId] = useState(columns[0]?.id || "");

  useEffect(() => {
    if (!columns.length) {
      setActiveColumnId("");
      return;
    }

    const hasActiveColumn = columns.some((column) => String(column.id) === String(activeColumnId));
    if (!hasActiveColumn) {
      setActiveColumnId(columns[0].id);
    }
  }, [columns, activeColumnId]);

  const activeColumn = useMemo(
    () => columns.find((column) => String(column.id) === String(activeColumnId)) || columns[0],
    [columns, activeColumnId]
  );

  const formatCategoryLabel = (value) =>
    String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const getColumnTone = (value) => {
    const key = String(value || "").toLowerCase().replace(/\s+/g, "_");
    if (key.includes("progress")) return "progress";
    if (key.includes("review")) return "review";
    if (key.includes("done") || key.includes("complete")) return "done";
    return "todo";
  };

  const createDragImage = (sourceElement) => {
    if (!sourceElement || !document?.body) return null;

    const rect = sourceElement.getBoundingClientRect();
    const dragImage = sourceElement.cloneNode(true);
    dragImage.classList.add("tf-task-card--drag-image");
    dragImage.style.width = `${Math.ceil(rect.width)}px`;
    dragImage.style.height = `${Math.ceil(rect.height)}px`;
    dragImage.style.position = "fixed";
    dragImage.style.top = "-9999px";
    dragImage.style.left = "-9999px";
    dragImage.style.opacity = "1";
    dragImage.style.transform = "none";
    dragImage.style.pointerEvents = "none";
    dragImage.style.zIndex = "9999";

    document.body.appendChild(dragImage);
    return dragImage;
  };

  const sortTasks = (tasksInput) => {
    const tasks = Array.isArray(tasksInput) ? [...tasksInput] : [];
    const priorityRank = (p) => {
      const n = String(p || "").toLowerCase();
      if (n === "critical" || n === "urgent") return 4;
      if (n === "high") return 3;
      if (n === "medium") return 2;
      if (n === "low") return 1;
      return 0;
    };

    tasks.sort((a, b) => {
      const pa = priorityRank(a?.priority);
      const pb = priorityRank(b?.priority);
      if (pa !== pb) return pb - pa; // higher priority first

      const da = new Date(a?.createdAt || a?.created_at || 0).getTime() || 0;
      const db = new Date(b?.createdAt || b?.created_at || 0).getTime() || 0;
      return db - da; // newest first
    });

    return tasks;
  };

  return (
    <>
    <div className="tf-mobile-board-nav" aria-label="Kanban columns">
      <div className="tf-mobile-tabs" role="tablist" aria-label="Task columns">
        {columns.map((column) => {
          const isActive = String(column.id) === String(activeColumn?.id);
          const label = formatCategoryLabel(column.title);

          return (
            <button
              key={column.id}
              type="button"
              className={`tf-mobile-tab${isActive ? " is-active" : ""}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tf-column-panel-${column.id}`}
              id={`tf-column-tab-${column.id}`}
              onClick={() => setActiveColumnId(column.id)}
            >
              <span>{label}</span>
              <span className="tf-mobile-tab-count">{(column.tasks || []).length}</span>
            </button>
          );
        })}
      </div>

      <div className="tf-mobile-overview-strip" aria-label="Column task counts">
        {columns.map((column) => {
          const tone = getColumnTone(column.title);
          return (
            <button
              key={column.id}
              type="button"
              className={`tf-mobile-overview-pill tf-mobile-overview-pill--${tone}`}
              onClick={() => setActiveColumnId(column.id)}
            >
              <span className="tf-mobile-overview-dot" aria-hidden="true" />
              <span>{formatCategoryLabel(column.title)}</span>
              <strong>{(column.tasks || []).length}</strong>
            </button>
          );
        })}
      </div>
    </div>

    <div className="tf-board">
      {columns.map((column) => (
        <section 
          key={column.id} 
          className={`tf-column${String(column.id) === String(activeColumn?.id) ? " tf-column--mobile-active" : ""}`}
          id={`tf-column-panel-${column.id}`}
          role="tabpanel"
          aria-labelledby={`tf-column-tab-${column.id}`}
          data-column={String(column?.title || column?.name || "").toLowerCase().replace(/\s+/g, "_")}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const taskId = e.dataTransfer.getData("taskId");
            onTaskDrop?.(taskId, column);
          }}
        >
          
          <header className="tf-column-header">
            <div className="tf-column-title-wrap">
              <h3 className="tf-column-title">{formatCategoryLabel(column.title)}</h3>
              <span className="tf-column-count">{(column.tasks || []).length}</span>
            </div>
            {showAddTaskButton && (column.title === "todo" || column.title === "in_progress") && (
              <button
                type="button"
                className="tf-column-add-btn"
                onClick={() => onAddTask?.(column)}
                aria-label={`Add task to ${formatCategoryLabel(column.title)}`}
              >
                +
              </button>
            )}
          </header>

          <div className="tf-tasks-list">
            {(column.tasks || []).length === 0 && (
              <p className="tf-empty-message">No tasks yet.</p>
            )}

            {(sortTasks(column.tasks) || []).map((task) => {
              const canDrag = canDragTask ? canDragTask(task, column) : (isTaskAssignedToMe ? isTaskAssignedToMe(task) : true);

              return (
                <article
                  key={task.id}
                  className={`tf-task-card ${canDrag ? "" : "tf-task-card--locked"}`}
                  draggable={canDrag}
                  onClick={() => onTaskClick?.(task, column)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onTaskClick?.(task, column);
                    }
                  }}
                  tabIndex={0}
                  onDragStart={(e) => {
                    if (!canDrag) return;
                    e.dataTransfer.setData("taskId", String(task.id));
                    if (e.currentTarget && e.currentTarget.classList) {
                      e.currentTarget.classList.add("tf-task-card--dragging");
                    }

                    const dragImage = createDragImage(e.currentTarget);
                    if (dragImage && e.dataTransfer?.setDragImage) {
                      e.dataTransfer.setDragImage(dragImage, 16, 16);
                      e.currentTarget._kbDragImage = dragImage;
                    }
                  }}
                  onDragEnd={(e) => {
                    if (e.currentTarget && e.currentTarget.classList) {
                      e.currentTarget.classList.remove("tf-task-card--dragging");
                    }

                    if (e.currentTarget?._kbDragImage) {
                      e.currentTarget._kbDragImage.remove();
                      delete e.currentTarget._kbDragImage;
                    }
                  }}
                >
                  {renderTask ? renderTask(task, column) : (
                    <>
                      <h4 className="tf-task-title">{task.title}</h4>
                      {task.description && <p className="tf-task-desc">{task.description}</p>}
                    </>
                  )}
                </article>
              );
            })}

          </div>
        </section>
      ))}
    </div>
    </>
  );
}
