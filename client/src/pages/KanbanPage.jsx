import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import KanbanBoard from "../components/common/KanbanBoard";
import AddTaskModal from "../components/common/AddTaskModal";
import ColumnsReorderModal from "../components/common/ColumnsReorderModal";
import ProjectSettingsModal from "../components/common/ProjectSettingsModal";
import ProjectMembersModal from "../components/common/ProjectMembersModal";
import TaskDetailsModal from "../components/common/TaskDetailsModal";
import "../components/styles/KanbanPage.css";
import "../components/styles/ColumnsReorderModal.css";
import { getCurrentUser } from "../services/authService";
import { getTaskCategories, createNewTask, getProjectMembers, getProjectSettings, updateProjectSettings, takeTask, updateTaskStatus } from "../services/projectService";

const DEFAULT_TASK_PERMISSIONS = {
	allow_member_create_task: false,
	allow_member_take_task: true,
	allow_member_edit_task: false,
	allow_member_delete_task: false,
	allow_member_add_board: false,
	allow_member_add_member: false,
	allow_assign_task_to_member: false,
};

function getDisplayName(user) {
	if (!user) return "Unassigned";
	const firstName = user.firstName || user.first_name || "";
	const lastName = user.lastName || user.last_name || "";
	const fullName = `${firstName} ${lastName}`.trim();
	return fullName || user.email || "Team member";
}

const demoColumns = [
	{
		id: "todo",
		title: "To Do",
		tasks: [
			{
				id: "t1",
				title: "Draft backlog",
				description: "Capture first set of tasks.",
				assignee: { firstName: "Mia", lastName: "Stewart" },
			},
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
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [membersOpen, setMembersOpen] = useState(false);
	const [selectedCategoryId, setSelectedCategoryId] = useState("");
	const [taskPermissions, setTaskPermissions] = useState(DEFAULT_TASK_PERMISSIONS);
	const [localTaskAssignees, setLocalTaskAssignees] = useState({});
	const [projectMembers, setProjectMembers] = useState([]);
	const [membersLoading, setMembersLoading] = useState(false);
	const [membersError, setMembersError] = useState("");
	const [selectedTask, setSelectedTask] = useState(null);

	const currentUser = useMemo(() => getCurrentUser(), []);

	const projectRole = useMemo(() => {
		if (!project || !currentUser) return "member";

		const explicitRole = (project.role || "").toLowerCase();
		if (["owner", "admin", "member"].includes(explicitRole)) {
			return explicitRole;
		}

		if (project.owner && currentUser.id && project.owner === currentUser.id) {
			return "owner";
		}

		return "member";
	}, [project, currentUser]);

	const isAdminOrOwner = projectRole === "owner" || projectRole === "admin";
	const canCreateTask = isAdminOrOwner || taskPermissions.allow_member_create_task;
	const canTakeTask = isAdminOrOwner || taskPermissions.allow_member_take_task;
	const canMembersAssignTaskToOthers = taskPermissions.allow_assign_task_to_member;
	const canEditProjectSettings = isAdminOrOwner;

	const columnsForBoard =
		taskCategories.length > 0
			? taskCategories.map((category) => ({
					id: category.id,
					title: category.name,
					tasks: category.tasks || [],
			  }))
			: demoColumns;

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

	const loadProjectMembers = useCallback(async () => {
		if (!project?.id) return;

		setMembersLoading(true);
		setMembersError("");

		try {
			const data = await getProjectMembers(project.id);
			setProjectMembers(data.members || []);
		} catch (membersRequestError) {
			setMembersError(membersRequestError?.message || "Unable to load project members.");
			setProjectMembers([]);
		} finally {
			setMembersLoading(false);
		}
	}, [project?.id]);

	const loadProjectSettings = useCallback(async () => {
		if (!project?.id) return;

		try {
			const settings = await getProjectSettings(project.id);
			setTaskPermissions({ ...DEFAULT_TASK_PERMISSIONS, ...settings });
		} catch (settingsError) {
			console.error("Unable to load project settings:", settingsError);
			setTaskPermissions(DEFAULT_TASK_PERMISSIONS);
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

	useEffect(() => {
		if (!project) return;
		loadProjectMembers();
	}, [project, loadProjectMembers]);

	useEffect(() => {
		if (!project?.id) {
			setTaskPermissions(DEFAULT_TASK_PERMISSIONS);
			setLocalTaskAssignees({});
			setProjectMembers([]);
			setMembersError("");
			setSelectedTask(null);
			return;
		}

		loadProjectSettings();

		setLocalTaskAssignees({});
		setSelectedTask(null);
	}, [project, loadProjectSettings]);

	const handleSettingChange = useCallback(
		async (settingName, nextValue) => {
			if (!project?.id || !canEditProjectSettings) return;

			setTaskPermissions((prev) => {
				return { ...prev, [settingName]: nextValue };
			});

			try {
				await updateProjectSettings(project.id, settingName, nextValue);
			} catch (err) {
			  console.error("Failed to update setting:", err);
			}
		},
		[project?.id, canEditProjectSettings]
	);

	const getTaskAssignee = useCallback(
		(task) => {
			if (!task?.id) return null;
			return localTaskAssignees[task.id] || task.assignee || null;
		},
		[localTaskAssignees]
	);

	const isTaskAssignedToMe = useCallback(
		(task) => {
			if (!task) return false;

			const assignee = getTaskAssignee(task);
			return (
				(task.assignees && task.assignees.some((a) => a?.id === currentUser?.id)) ||
				(assignee && assignee.id === currentUser?.id)
			);
		},
		[getTaskAssignee, currentUser?.id]
	);

	const handleTakeTask = useCallback(
		async (task) => {
			if (!task?.id || !currentUser) return;
			if (!canTakeTask) return;
			if (getTaskAssignee(task)) return;

			const taskTaken = await takeTask(task?.id);

			if(taskTaken) {
				setLocalTaskAssignees((prev) => ({
					...prev,
					[task.id]: {
						id: currentUser.id,
						firstName: currentUser.firstName || currentUser.first_name,
						lastName: currentUser.lastName || currentUser.last_name,
						email: currentUser.email,
					},
				}));
			}
		},
		[currentUser, canTakeTask, getTaskAssignee]
	);

	const handleTaskDrop = async (taskId, column) => {
		try {
			await updateTaskStatus(taskId, column.id);
			setError("");
			loadTaskCategories();
		} catch (dropError) {
			setError(dropError?.message || "Unable to move task.");
		}
	};

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
			<section className="page-shell kanban-empty">
				<h1 className="page-title">Kanban Board</h1>
				<p className="page-subtitle">No project selected yet.</p>
				<div className="empty-state-actions">
					<button className="btn btn-primary" onClick={() => navigate("/main-page/projects")}>Back to Projects</button>
				</div>
			</section>
		);
	}

	return (
		<section className="page-shell kanban-page">
			<div className="kanban-header">
				<div className="kanban-title">
					<h1 className="page-title">{project.name}</h1>
					<p>{project.description || ""}</p>
				</div>
				<div className="kanban-actions">
					<button className="btn btn-secondary" onClick={() => setMembersOpen(true)}>
						Project Members
					</button>
					<button className="btn btn-secondary" onClick={() => setSettingsOpen(true)}>
						Project Settings
					</button>
					<button className="btn btn-primary" onClick={openReorder}>Organize Columns</button>
				</div>
			</div>

			<div className="permission-summary" role="status" aria-live="polite">
				<p>
					<strong>{projectRole}</strong> role view
				</p>
				<p>Create Task action: {canCreateTask ? "Visible" : "Hidden"}</p>
				<p>Take Task action: {canTakeTask ? "Available for unassigned tasks" : "Hidden"}</p>
				<p>Manual assignments: {isAdminOrOwner ? "Enabled" : "Admin or owner only"}</p>
			</div>

			<div className="kanban-shell">
				{loading && <p>Loading columns...</p>}
				{error && <p className="error-message">{error}</p>}
				<KanbanBoard
					columns={columnsForBoard}
					isTaskAssignedToMe={isTaskAssignedToMe}
					onTaskClick={(task) => setSelectedTask(task)}
					showAddTaskButton={canCreateTask}
					onTaskDrop={handleTaskDrop}
					onAddTask={(column) => {
						if (!canCreateTask) return;
						setSelectedCategoryId(column?.id || "");
						setAddTaskOpen(true);
					}}
					renderTask={(task) => {
						const assignee = getTaskAssignee(task);
						const isUnassigned = !assignee;
						const showTakeAction = isUnassigned && canTakeTask;
						const actionLabel = isAdminOrOwner ? "Assign to me" : "Take Task";
							const creatorName = `${task.creator?.firstName || ""} ${task.creator?.lastName || ""}`.trim();
						

						return (
							<>
								<h4 className="kb-task-title">{task.title}</h4>
								{task.description && <p className="kb-task-desc">{task.description} </p>}
									<p className="kb-task-meta">Created by: {creatorName || "Project member"}</p>
								<div className="kb-task-assignee-row">
									<span className="kb-task-assignee-label">Assigned:</span>
									{task.assignees && task.assignees.length > 0 ? (
										task.assignees.map((a, idx) => (
											<span key={a.id ?? idx} className="kb-task-assignee-pill">{getDisplayName(a)}</span>
										))
									) : assignee ? (
										<span className="kb-task-assignee-pill">{getDisplayName(assignee)}</span>
									) : (
										<span className="kb-task-unassigned">Unassigned</span>
									)}
								</div>

								{showTakeAction && (
									<button
										type="button"
										className="kb-task-action"
										onClick={() => handleTakeTask(task)}
									>
										{actionLabel}
									</button>
								)}

								{isUnassigned && !showTakeAction && projectRole === "member" && (
									<p className="kb-task-helper">Take Task is hidden in strict mode.</p>
								)}
							</>
						);
					}}
				/>

				<AddTaskModal
					isOpen={addTaskOpen}
					onClose={() => setAddTaskOpen(false)}
					initialCategoryId={selectedCategoryId}
					categories={taskCategories}
					onCreate={async (payload) => {
						if (!canCreateTask) {
							throw new Error("Task creation is disabled for members in this project.");
						}

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

				<ProjectSettingsModal
					isOpen={settingsOpen}
					onClose={() => setSettingsOpen(false)}
					settings={taskPermissions}
					onSettingChange={handleSettingChange}
					projectRole={projectRole}
					canEditPermissions={canEditProjectSettings}
				/>

				<ProjectMembersModal
					isOpen={membersOpen}
					onClose={() => setMembersOpen(false)}
					project={project || ""}
					members={projectMembers}
					loading={membersLoading}
					error={membersError}
					currentUserId={currentUser?.id || ""}
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

				{selectedTask && (
					<TaskDetailsModal
						task={selectedTask}
						projectMembers={projectMembers}
						isAdminOrOwner={isAdminOrOwner}
						canMembersAssignTaskToOthers={canMembersAssignTaskToOthers}
						onClose={() => setSelectedTask(null)}
					/>
				)}
			</div>
		</section>
	);
}

export default KanbanPage;
