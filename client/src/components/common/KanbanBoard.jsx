import "../styles/KanbanBoard.css";

export default function KanbanBoard({
  columns = [],
  onAddTask,
  onTaskDrop,
  onTaskClick,
  renderTask,
  isTaskAssignedToMe,
  showAddTaskButton = true,
}) {
  const formatCategoryLabel = (value) =>
    String(value || "")
      .replace(/_/g, " ")
      .toUpperCase();

  const createDragImage = (sourceElement) => {
    if (!sourceElement || !document?.body) return null;

    const rect = sourceElement.getBoundingClientRect();
    const dragImage = sourceElement.cloneNode(true);
    dragImage.classList.add("kb-task-card--drag-image");
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
    <div className="kb-grid">
      {columns.map((column) => (
        <section 
          key={column.id} 
          className="kb-column"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const taskId = e.dataTransfer.getData("taskId");
            onTaskDrop?.(taskId, column);
          }}
        >
          
          <header className="kb-column-header">
            <div className="kb-title-wrap">
              <h3 className="kb-title">{formatCategoryLabel(column.title)}</h3>
              <span className="kb-count">{(column.tasks || []).length}</span>
            </div>
            {showAddTaskButton && (column.title === "todo" || column.title === "in_progress") && (
              <button
                type="button"
                className="kb-add"
                onClick={() => onAddTask?.(column)}
                aria-label={`Add task to ${formatCategoryLabel(column.title)}`}
              >
                +
              </button>
            )}
          </header>

          <div className="kb-task-list">
            {(column.tasks || []).length === 0 && (
              <p className="kb-empty">No tasks yet.</p>
            )}

            {(sortTasks(column.tasks) || []).map((task) => {
              const canDrag = isTaskAssignedToMe ? isTaskAssignedToMe(task) : true;

              return (
                <article
                  key={task.id}
                  className={`kb-task-card ${canDrag ? "" : "kb-task-card--locked"}`}
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
                      e.currentTarget.classList.add("kb-task-card--dragging");
                    }

                    const dragImage = createDragImage(e.currentTarget);
                    if (dragImage && e.dataTransfer?.setDragImage) {
                      e.dataTransfer.setDragImage(dragImage, 16, 16);
                      e.currentTarget._kbDragImage = dragImage;
                    }
                  }}
                  onDragEnd={(e) => {
                    if (e.currentTarget && e.currentTarget.classList) {
                      e.currentTarget.classList.remove("kb-task-card--dragging");
                    }

                    if (e.currentTarget?._kbDragImage) {
                      e.currentTarget._kbDragImage.remove();
                      delete e.currentTarget._kbDragImage;
                    }
                  }}
                >
                  {renderTask ? renderTask(task, column) : (
                    <>
                      <h4 className="kb-task-title">{task.title}</h4>
                      {task.description && <p className="kb-task-desc">{task.description}</p>}
                    </>
                  )}
                </article>
              );
            })}

          </div>
        </section>
      ))}
    </div>
  );
}
