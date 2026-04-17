import "../styles/KanbanBoard.css";

export default function KanbanBoard({
  columns = [],
  onAddTask,
  renderTask,
}) {
  return (
    <div className="kb-grid">
      {columns.map((column) => (
        <section key={column.id} className="kb-column">
          <header className="kb-column-header">
            <div className="kb-title-wrap">
              <h3 className="kb-title">{column.title}</h3>
              <span className="kb-count">{(column.tasks || []).length}</span>
            </div>
            <button
              type="button"
              className="kb-add"
              onClick={() => onAddTask?.(column)}
              aria-label={`Add task to ${column.title}`}
            >
              +
            </button>
          </header>

          <div className="kb-task-list">
            {(column.tasks || []).length === 0 && (
              <p className="kb-empty">No tasks yet.</p>
            )}

            {(column.tasks || []).map((task) => (
              <article key={task.id} className="kb-task-card">
                {renderTask ? (
                  renderTask(task, column)
                ) : (
                  <>
                    <h4 className="kb-task-title">{task.title} {task.creator?.firstName} {task.creator?.lastName} {task.creator?.email}</h4>
                    {task.description && <p className="kb-task-desc">{task.description} </p>}
                  </>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
