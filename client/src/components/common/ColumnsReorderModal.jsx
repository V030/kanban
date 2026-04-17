import { useEffect, useState } from "react";
import "../styles/ColumnsReorderModal.css";
import { createNewTaskCategory } from "../../services/projectService";

function ColumnsReorderModal({ open, onClose, projectId, columns = [], onSave }) {
  const [localColumns, setLocalColumns] = useState([]);
  const [newVisible, setNewVisible] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState(false);
    const [newTaskCategory, setNewTaskCategory] = useState({
      name: "",
    });

  useEffect(() => {
    setLocalColumns(columns.map((c) => ({ id: c.id, name: c.name || c.title || "Untitled" })));
    setNewVisible(false);
    setNewName("");
  }, [open, columns]);

  if (!open) return null;

  function move(i, dir) {
    const arr = [...localColumns];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
    setLocalColumns(arr);
  }

  function updateName(i, value) {
    const arr = [...localColumns];
    arr[i] = { ...arr[i], name: value };
    setLocalColumns(arr);
  }

  function startAddColumn() {
    setNewName("");
    setNewVisible(true);
  }

  const confirmAddColumn = async (e) => {
    if (!newName.trim()) return;
    const col = { id: `new-${Date.now()}`, name: newName.trim() };
    setLocalColumns((s) => [...s, col]);
    setNewVisible(false);
    setNewName("");

    if (!newName.trim()) {
        setError('Task category name required');
        return;
    }

    console.log("New Category: ", newName);

    try {
      await createNewTaskCategory({ projectId, name: newName.trim() });
    } catch (err) {
      console.error(err);
      setError(err.message || "Category creation failed");
    }

  }


  function cancelAddColumn() {
    setNewVisible(false);
    setNewName("");
  }

  function handleSave() {
    if (onSave) onSave(localColumns);
    onClose();
  }

  return (
    <div className="crm-overlay">
      <div className="crm-modal">
        <div className="crm-header">
          <h3>Re-order Columns</h3>
          <button className="crm-close" onClick={onClose}>✕</button>
        </div>

        <div className="crm-body">
          <p className="crm-note">Columns shown in top → bottom order. Dragging not implemented; use arrows.</p>
          <div className="crm-list">
            {localColumns.map((col, i) => (
              <div className="crm-row" key={col.id}>
                <div className="crm-row-left">
                  <span className="crm-index">{i + 1}</span>
                  <input
                    className="crm-input"
                    value={col.name}
                    onChange={(e) => updateName(i, e.target.value)}
                  />
                </div>
                <div className="crm-row-actions">
                  <button onClick={() => move(i, -1)} aria-label="Move up">▲</button>
                  <button onClick={() => move(i, 1)} aria-label="Move down">▼</button>
                </div>
              </div>
            ))}
          </div>
          <div className="crm-add-row">
            {!newVisible && (
              <button className="crm-add" onClick={startAddColumn}>Add Column</button>
            )}

            {newVisible && (
              <div className="crm-new-row">
                <input
                  className="crm-new-input"
                  placeholder="New column name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <div className="crm-new-actions">
                  <button className="crm-add" onClick={confirmAddColumn}>Add</button>
                  <button className="crm-cancel" onClick={cancelAddColumn}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="crm-footer">
          <button className="crm-save" onClick={handleSave}>Save</button>
          <button className="crm-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default ColumnsReorderModal;
