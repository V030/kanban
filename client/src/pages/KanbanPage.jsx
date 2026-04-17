import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import KanbanBoard from "../components/common/KanbanBoard";
import AddTaskModal from "../components/common/AddTaskModal";
import ColumnsReorderModal from "../components/common/ColumnsReorderModal";
import "../components/styles/KanbanPage.css";
import "../components/styles/ColumnsReorderModal.css";
import { getTaskCategories, createNewTask } from "../services/projectService";

const demoColumns = [
	{
		id: "todo",
		title: "To Do",
		tasks: [
			{ id: "t1", title: "Draft backlog", description: "Capture first set of tasks." },
			{ id: "t2", title: "Write acceptance criteria", description: "Define done conditions." },
		],
	},
	{
		id: "in_progress",
		title: "In Progress",
		tasks: [
			{ id: "p1", title: "Build task card UI", description: "Component-level implementation." },
		],
	},
	{
		id: "done",
		title: "Done",
		tasks: [
			{ id: "d1", title: "Project setup", description: "Base routing and auth in place." },
		],
	},
];

function KanbanPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const [project, setProject] = useState(location.state?.project || null);
	const [taskCategories, setTaskCategories] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [reorderOpen, setReorderOpen] = useState(false);
	const [addTaskOpen, setAddTaskOpen] = useState(false);
	const [selectedCategoryId, setSelectedCategoryId] = useState("");
	

	const loadTaskCategories = useCallback(async () => {
		if (!project?.id) return;
		setLoading(true);
		setError("");

		try {
			const data = await getTaskCategories(project.id);
			setTaskCategories(data.categories || []);
		} catch (err) {
			setError(err?.message || "Error fetching task categories for this project.");
		} finally {
			setLoading(false);
		}
	}, [project?.id]);

	useEffect(() => {
		if (location.state?.project) {
			setProject(location.state.project);
			localStorage.setItem("selectedProject", JSON.stringify(location.state.project));
			return;
		}
		const cached = localStorage.getItem("selectedProject");
		if (cached) {
			try {
				setProject(JSON.parse(cached));
			} catch (error) {
				console.error("Failed to parse selected project:", error);
			}
		}
	}, [location.state]);

	// load categories whenever the selected project changes
	useEffect(() => {
		if (!project) return;
		loadTaskCategories();
	}, [project, loadTaskCategories]);

	function openReorder() {
		setReorderOpen(true);
	}

	function closeReorder() {
		setReorderOpen(false);
	}

	function handleReorderSave(newColumns) {
		// reflect changed order locally (map incoming shape to category objects)
		setTaskCategories(newColumns.map((c, idx) => ({ id: c.id, name: c.name, position: idx + 1, tasks: [] })));
	}

	if (!project) {
		return (
			<div className="kanban-empty">
				<h1>Kanban</h1>
				<p>No project selected.</p>
				<button className="back-btn" onClick={() => navigate("/main-page/projects")}>Back to Projects</button>
			</div>
		);
	}

	return (
		<div className="kanban-page">
			<div className="kanban-header">
				<div className="kanban-title">
					<h1>{project.name}</h1>
					<p>{project.description || ""}</p>
				</div>
				<div className="kanban-actions">
					<button className="reorder-btn" onClick={openReorder}>Re-order columns</button>
				</div>
			</div>

			<div className="kanban-shell">
				{loading && <p>Loading columns...</p>}
				{error && <p className="error-message">{error}</p>}
				<KanbanBoard
					columns={
						taskCategories.length
							? taskCategories.map((c) => ({ id: c.id, title: c.name, tasks: c.tasks || [] }))
							: demoColumns
					}
					onAddTask={(column) => {
						setSelectedCategoryId(column?.id || "");
						setAddTaskOpen(true);
					}}
				/>

				<AddTaskModal
					isOpen={addTaskOpen}
					onClose={() => setAddTaskOpen(false)}
					initialCategoryId={selectedCategoryId}
					categories={taskCategories}
					onCreate={async (payload) => {
						const newTaskRequest = {
							...payload,
							projectId: project?.id,
							categoryId: payload.categoryId || selectedCategoryId,
							taskName: payload.title,
							taskDescription: payload.description,
						};

						// frontend-only: currently just log. i will replace with API call when available.
						// console.log("Create task payload for project: ", newTaskRequest.projectId, ': ', newTaskRequest.categoryId, ': ', newTaskRequest.taskName);
			
						await createNewTask(newTaskRequest);
						setAddTaskOpen(false);
					}}
				/>

				<ColumnsReorderModal
					open={reorderOpen}
					onClose={closeReorder}
					projectId={project.id}
					columns={
						taskCategories.length
							? taskCategories.map((c) => ({ id: c.id, name: c.name || c.title }))
							: demoColumns.map((c) => ({ id: c.id, name: c.title }))
					}
					onSave={handleReorderSave}
				/>
			</div>
		</div>
	);
}

export default KanbanPage;
