import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import KanbanBoard from "../components/common/KanbanBoard";
import AddTaskModal from "../components/common/AddTaskModal";
import ColumnsReorderModal from "../components/common/ColumnsReorderModal";
import ProjectSettingsModal from "../components/common/ProjectSettingsModal";
import ProjectMembersModal from "../components/common/ProjectMembersModal";
import "../components/styles/KanbanPage.css";
import "../components/styles/ColumnsReorderModal.css";
import { getCurrentUser } from "../services/authService";
import { getProjects, getTaskCategories, createNewTask, getProjectMembers, getProjectSettings, updateProjectSettings, updateProjectName, updateProjectDescription, takeTask, updateTaskStatus, unassignTask, deleteTask, deleteProject, removeMemberFromProject, updateMemberRole } from "../services/projectService";

const DEFAULT_TASK_PERMISSIONS = {
	allow_member_create_task: false,
	allow_member_take_task: true,
	allow_member_edit_task: false,
	allow_member_delete_task: false,
	allow_member_add_board: false,
	allow_member_add_member: false,
	allow_assign_task_to_member: false,
	allow_admin_add_member: true,
	allow_admin_remove_member: true,
	allow_admin_add_board: true,
	allow_admin_manage_tasks: true,
	allow_admin_create_tag: true,
	allow_member_create_tag: false,
};

function getDisplayName(user) {
	if (!user) return "Unassigned";
	const firstName = user.firstName || user.first_name || "";
	const lastName = user.lastName || user.last_name || "";
	const fullName = `${firstName} ${lastName}`.trim();
	return fullName || user.email || "Team member";
}

function getInitials(user) {
	if (!user) return "?";
	const firstName = user.firstName || user.first_name || "";
	const lastName = user.lastName || user.last_name || "";
	const name = `${firstName} ${lastName}`.trim() || user.email || "";
	const parts = name.split(/\s+/).filter(Boolean);
	const initials = parts.slice(0, 2).map((part) => part.charAt(0)).join("");
	return (initials || "?").toUpperCase();
}

function formatDateShort(value) {
	if (!value) return null;
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return null;
	return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
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
		id: "to_review",
		title: "To Review",
		tasks: [],
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
	const [isEditingProjectName, setIsEditingProjectName] = useState(false);
	const [projectNameDraft, setProjectNameDraft] = useState("");
	const [projectNameOriginal, setProjectNameOriginal] = useState("");
	const [projectNameSaving, setProjectNameSaving] = useState(false);
	const [projectNameError, setProjectNameError] = useState("");
	const projectNameRef = useRef(null);
	const [isEditingProjectDesc, setIsEditingProjectDesc] = useState(false);
	const [projectDescDraft, setProjectDescDraft] = useState("");
	const [projectDescOriginal, setProjectDescOriginal] = useState("");
	const [projectDescSaving, setProjectDescSaving] = useState(false);
	const [projectDescError, setProjectDescError] = useState("");
	const projectDescRef = useRef(null);
	const [pendingTaskActions, setPendingTaskActions] = useState({});
	const [taskActionError, setTaskActionError] = useState("");
	const [settingsError, setSettingsError] = useState("");
	const [settingsPending, setSettingsPending] = useState({});
	const [memberActionError, setMemberActionError] = useState("");
	const [memberActionPending, setMemberActionPending] = useState({});
	const [deleteProjectPending, setDeleteProjectPending] = useState(false);
	const taskCategoriesRef = useRef(taskCategories);


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
	const canEditProjectName = projectRole === "owner";

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
			return;
		}

		// Fallback: fetch user's projects and pick the first available
		(async () => {
			try {
				const data = await getProjects();
				const myProjects = data.projects || [];
				if (myProjects.length > 0) setProject(myProjects[0]);
			} catch (err) {
				console.error("Unable to load projects for Kanban fallback:", err);
			}
		})();
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
			setPendingTaskActions({});
			setTaskActionError("");
			setSettingsError("");
			setSettingsPending({});
			setMemberActionError("");
			setMemberActionPending({});
			return;
		}

		loadProjectSettings();

		setLocalTaskAssignees({});
		
	}, [project, loadProjectSettings]);

	useEffect(() => {
		taskCategoriesRef.current = taskCategories;
	}, [taskCategories]);

	const setTaskPending = useCallback((taskId, action) => {
		if (!taskId) return;
		setPendingTaskActions((prev) => ({ ...prev, [String(taskId)]: action }));
	}, []);

	const clearTaskPending = useCallback((taskId) => {
		if (!taskId) return;
		setPendingTaskActions((prev) => {
			const next = { ...prev };
			delete next[String(taskId)];
			return next;
		});
	}, []);

	const findTaskLocation = useCallback((categories, taskId) => {
		const id = String(taskId || "");
		for (const category of categories || []) {
			const tasks = Array.isArray(category?.tasks) ? category.tasks : [];
			const index = tasks.findIndex((task) => String(task?.id) === id);
			if (index >= 0) {
				return {
					categoryId: category.id,
					categoryName: category.name,
					index,
					task: tasks[index],
				};
			}
		}
		return null;
	}, []);

	const removeTaskById = useCallback((categories, taskId) => {
		const id = String(taskId || "");
		let removedTask = null;
		let removedCategoryId = null;
		const next = (categories || []).map((category) => {
			const tasks = Array.isArray(category?.tasks) ? category.tasks : [];
			const index = tasks.findIndex((task) => String(task?.id) === id);
			if (index === -1) return category;
			removedTask = tasks[index];
			removedCategoryId = category.id;
			const nextTasks = tasks.slice(0, index).concat(tasks.slice(index + 1));
			return { ...category, tasks: nextTasks };
		});
		return { next, removedTask, removedCategoryId };
	}, []);

	const insertTaskIntoCategory = useCallback((categories, categoryId, task) => {
		if (!categoryId) return categories;
		const next = (categories || []).map((category) => {
			if (String(category?.id) !== String(categoryId)) return category;
			const tasks = Array.isArray(category?.tasks) ? category.tasks : [];
			return { ...category, tasks: [...tasks, task] };
		});
		return next;
	}, []);

	const moveTaskToCategory = useCallback((categories, taskId, targetCategoryId, taskPatch = {}) => {
		const removed = removeTaskById(categories, taskId);
		if (!removed.removedTask) return removed;
		const updatedTask = { ...removed.removedTask, ...taskPatch };
		const next = insertTaskIntoCategory(removed.next, targetCategoryId, updatedTask);
		return { ...removed, next };
	}, [insertTaskIntoCategory, removeTaskById]);

	const handleRemoveTask = useCallback(
		async (task) => {
			if (!task?.id) return;
			if (!isAdminOrOwner) return;
			if (pendingTaskActions[String(task.id)]) return;
			const taskId = task.id;
			const currentLocation = findTaskLocation(taskCategoriesRef.current, taskId);
			if (!currentLocation) return;

			setTaskActionError("");
			setTaskCategories((prev) => {
				const updated = (prev || []).map((category) => {
					if (String(category?.id) !== String(currentLocation.categoryId)) return category;
					const tasks = Array.isArray(category?.tasks) ? category.tasks : [];
					return {
						...category,
						tasks: tasks.map((t) =>
							String(t?.id) === String(taskId) ? { ...t, isPending: true } : t
						),
					};
				});
				return updated;
			});
			setTaskPending(taskId, "delete");

			try {
				await deleteTask(taskId);
				await loadTaskCategories();
			} catch (err) {
				setTaskCategories((prev) => {
					const updated = (prev || []).map((category) => {
						if (String(category?.id) !== String(currentLocation.categoryId)) return category;
						const tasks = Array.isArray(category?.tasks) ? category.tasks : [];
						return {
							...category,
							tasks: tasks.map((t) =>
								String(t?.id) === String(taskId) ? currentLocation.task : t
							),
						};
					});
					return updated;
				});
				setTaskActionError(err?.message || "Failed to remove task.");
			} finally {
				clearTaskPending(taskId);
			}
		},
		[isAdminOrOwner, loadTaskCategories, findTaskLocation, pendingTaskActions, setTaskPending, clearTaskPending]
	);

	const handleSettingChange = useCallback(
		async (settingName, nextValue) => {
			if (!project?.id || !canEditProjectSettings) return;
			const previousValue = taskPermissions?.[settingName];

			setTaskPermissions((prev) => {
				return { ...prev, [settingName]: nextValue };
			});
			setSettingsError("");
			setSettingsPending((prev) => ({ ...prev, [settingName]: true }));

			try {
				await updateProjectSettings(project.id, settingName, nextValue);
			} catch (err) {
				setTaskPermissions((prev) => ({ ...prev, [settingName]: previousValue }));
				setSettingsError(err?.message || "Unable to update project settings.");
				loadProjectSettings();
			} finally {
				setSettingsPending((prev) => {
					const next = { ...prev };
					delete next[settingName];
					return next;
				});
			}
		},
		[project?.id, canEditProjectSettings, taskPermissions, loadProjectSettings]
	);

	const handleDeleteProject = useCallback(
		async () => {
			if (!project?.id || projectRole !== "owner") return;
			
			const confirmed = window.confirm(
				"Are you sure you want to permanently delete this project? This action cannot be undone and all tasks, boards, and member data will be lost."
			);
			
			if (!confirmed) return;

			setDeleteProjectPending(true);
			setSettingsError("");

			try {
				await deleteProject(project.id);
				setSettingsOpen(false);
				navigate("/main-page/projects");
			} catch (err) {
				setSettingsError(err?.message || "Unable to delete project.");
			} finally {
				setDeleteProjectPending(false);
			}
		},
		[project?.id, projectRole, navigate]
	);

	const handleReloadMembers = useCallback(async () => {
		await loadProjectMembers();
	}, [loadProjectMembers]);

	const handleRemoveMember = useCallback(
		async (memberId) => {
			if (!project?.id || !memberId) return;
			if (projectRole !== "owner" && projectRole !== "admin") return;

			const member = projectMembers.find((entry) => entry.id === memberId);
			if (!member) return;

			const confirmed = window.confirm(`Remove ${getDisplayName(member)} from this project?`);
			if (!confirmed) return;

			setMemberActionError("");
			setMemberActionPending((prev) => ({ ...prev, [memberId]: "remove" }));

			try {
				await removeMemberFromProject(project.id, memberId);
				await handleReloadMembers();
			} catch (err) {
				setMemberActionError(err?.message || "Unable to remove member.");
			} finally {
				setMemberActionPending((prev) => {
					const next = { ...prev };
					delete next[memberId];
					return next;
				});
			}
		},
		[handleReloadMembers, project?.id, projectMembers, projectRole]
	);

	const handleUpdateMemberRole = useCallback(
		async (memberId, nextRole) => {
			if (!project?.id || !memberId || !nextRole) return;
			if (projectRole !== "owner") return;

			const member = projectMembers.find((entry) => entry.id === memberId);
			if (!member) return;

			setMemberActionError("");
			setMemberActionPending((prev) => ({ ...prev, [memberId]: nextRole }));

			try {
				await updateMemberRole(project.id, memberId, nextRole);
				await handleReloadMembers();
			} catch (err) {
				setMemberActionError(err?.message || "Unable to update member role.");
			} finally {
				setMemberActionPending((prev) => {
					const next = { ...prev };
					delete next[memberId];
					return next;
				});
			}
		},
		[handleReloadMembers, project?.id, projectMembers, projectRole]
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
			if (isAdminOrOwner) return true;

			const assignee = getTaskAssignee(task);
			return (
				(task.assignees && task.assignees.some((a) => a?.id === currentUser?.id)) ||
				(assignee && assignee.id === currentUser?.id)
			);
		},
		[getTaskAssignee, currentUser?.id, isAdminOrOwner]
	);

	const handleTakeTask = useCallback(
		async (task) => {
			if (!task?.id || !currentUser) return;
			if (!canTakeTask) return;
			if (getTaskAssignee(task)) return;
			if (pendingTaskActions[String(task.id)]) return;
			const taskId = task.id;
			const previousAssignee = localTaskAssignees[taskId];
			const optimisticAssignee = {
				id: currentUser.id,
				firstName: currentUser.firstName || currentUser.first_name,
				lastName: currentUser.lastName || currentUser.last_name,
				email: currentUser.email,
			};

			setTaskActionError("");
			setTaskPending(taskId, "take");
			setLocalTaskAssignees((prev) => ({
				...prev,
				[taskId]: optimisticAssignee,
			}));

			try {
				await takeTask(taskId);
				await loadTaskCategories();
			} catch (err) {
				setLocalTaskAssignees((prev) => {
					const next = { ...prev };
					if (previousAssignee) {
						next[taskId] = previousAssignee;
					} else {
						delete next[taskId];
					}
					return next;
				});
				setTaskActionError(err?.message || "Failed to take task.");
			} finally {
				clearTaskPending(taskId);
			}
		},
		[currentUser, canTakeTask, getTaskAssignee, loadTaskCategories, localTaskAssignees, pendingTaskActions, setTaskPending, clearTaskPending]
	);

	const handleTaskDrop = async (taskId, column) => {
		if (!taskId || !column?.id) return;
		if (pendingTaskActions[String(taskId)]) return;
		const currentLocation = findTaskLocation(taskCategoriesRef.current, taskId);
		if (!currentLocation) return;
		if (String(currentLocation.categoryId) === String(column.id)) return;
		const targetCategoryName = String(column?.title || column?.name || "").trim().toLowerCase();
		if (targetCategoryName === "done" && !isAdminOrOwner) {
			setTaskActionError("Only admins and project owners can move tasks to Done.");
			return;
		}

		setTaskActionError("");
		const moved = moveTaskToCategory(taskCategoriesRef.current, taskId, column.id, {
			categoryId: column.id,
			isPending: true,
		});
		setTaskCategories(moved.next);
		setTaskPending(taskId, "move");

		try {
			await updateTaskStatus(taskId, column.id);
			setError("");
			await loadTaskCategories();
		} catch (dropError) {
			setTaskCategories((prev) => {
				const reverted = moveTaskToCategory(prev, taskId, currentLocation.categoryId, currentLocation.task);
				return reverted.next;
			});
			setTaskActionError(dropError?.message || "Unable to move task.");
			setError(dropError?.message || "Unable to move task.");
		} finally {
			clearTaskPending(taskId);
		}
	};

	const handleUnassignTask = useCallback(
		async (task) => {
			if (!task?.id || !currentUser) return;
			if (!canTakeTask) return;
			if (!isTaskAssignedToMe(task)) return;
			if (pendingTaskActions[String(task.id)]) return;
			const taskId = task.id;
			const previousAssignee = localTaskAssignees[taskId];

			setTaskActionError("");
			setTaskPending(taskId, "unassign");
			setLocalTaskAssignees((prev) => {
				const next = { ...prev };
				delete next[taskId];
				return next;
			});

			try {
				await unassignTask(taskId);
				await loadTaskCategories();
			} catch (err) {
				setLocalTaskAssignees((prev) => {
					const next = { ...prev };
					if (previousAssignee) {
						next[taskId] = previousAssignee;
					}
					return next;
				});
				setTaskActionError(err?.message || "Failed to unassign task.");
			} finally {
				clearTaskPending(taskId);
			}
		},
		[currentUser, canTakeTask, isTaskAssignedToMe, loadTaskCategories, localTaskAssignees, pendingTaskActions, setTaskPending, clearTaskPending]
	);


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

	useEffect(() => {
		if (!isEditingProjectName) return;
		const el = projectNameRef.current;
		if (!el) return;
		const nextValue = projectNameDraft || project?.name || "";
		if (el.textContent !== nextValue) {
			el.textContent = nextValue;
		}
	}, [isEditingProjectName, project?.name, projectNameDraft]);

	useEffect(() => {
		if (!isEditingProjectDesc) return;
		const el = projectDescRef.current;
		if (!el) return;
		const nextValue = projectDescDraft || project?.description || "";
		if (el.textContent !== nextValue) {
			el.textContent = nextValue;
		}
	}, [isEditingProjectDesc, project?.description, projectDescDraft]);

	function beginEditProjectName() {
		if (!project?.name) return;
		setProjectNameOriginal(project.name);
		setProjectNameDraft(project.name);
		setProjectNameError("");
		setIsEditingProjectName(true);
		requestAnimationFrame(() => {
			const el = projectNameRef.current;
			if (!el) return;
			el.textContent = project.name;
			el.focus();
			const range = document.createRange();
			range.selectNodeContents(el);
			const selection = window.getSelection();
			if (selection) {
				selection.removeAllRanges();
				selection.addRange(range);
			}
		});
	}

	function cancelEditProjectName() {
		setProjectNameDraft(projectNameOriginal);
		setProjectNameError("");
		setIsEditingProjectName(false);
		if (projectNameRef.current) {
			projectNameRef.current.textContent = projectNameOriginal;
		}
	}

	function beginEditProjectDesc() {
		const currentDesc = project?.description || "";
		setProjectDescOriginal(currentDesc);
		setProjectDescDraft(currentDesc);
		setProjectDescError("");
		setIsEditingProjectDesc(true);
		requestAnimationFrame(() => {
			const el = projectDescRef.current;
			if (!el) return;
			el.textContent = currentDesc;
			el.focus();
			const range = document.createRange();
			range.selectNodeContents(el);
			const selection = window.getSelection();
			if (selection) {
				selection.removeAllRanges();
				selection.addRange(range);
			}
		});
	}

	function cancelEditProjectDesc() {
		setProjectDescDraft(projectDescOriginal);
		setProjectDescError("");
		setIsEditingProjectDesc(false);
		if (projectDescRef.current) {
			projectDescRef.current.textContent = projectDescOriginal;
		}
	}

	async function saveProjectName() {
		const trimmed = projectNameDraft.replace(/[\r\n]+/g, " ").trim();
		if (!trimmed) {
			setProjectNameError("Project name cannot be empty.");
			return;
		}

		if (!project?.id || projectNameSaving) return;
		const previousProject = project;
		const optimisticProject = project ? { ...project, name: trimmed } : project;
		setProject(optimisticProject);
		// keep project state in React only; do not persist to localStorage
		setProjectNameSaving(true);
		setProjectNameError("");
		try {
			const data = await updateProjectName(project.id, trimmed);
			const updatedName = data?.project?.name || data?.name || trimmed;
			setProject((prev) => (prev ? { ...prev, name: updatedName } : prev));
			setIsEditingProjectName(false);
		} catch (err) {
			setProject(previousProject);
			setProjectNameError(err?.message || "Unable to update project name.");
		} finally {
			setProjectNameSaving(false);
		}
	}

	async function saveProjectDesc() {
		const trimmed = projectDescDraft.replace(/[\r\n]+/g, " ").trim();
		if (!trimmed) {
			setProjectDescError("Project description cannot be empty.");
			return;
		}

		if (!project?.id || projectDescSaving) return;
		const previousProject = project;
		const optimisticProject = project ? { ...project, description: trimmed } : project;
		setProject(optimisticProject);
		// keep project state in React only; do not persist to localStorage
		setProjectDescSaving(true);
		setProjectDescError("");
		try {
			const data = await updateProjectDescription(project.id, trimmed);
			const updatedDesc = data?.project?.description || data?.description || trimmed;
			setProject((prev) => (prev ? { ...prev, description: updatedDesc } : prev));
			setIsEditingProjectDesc(false);
		} catch (err) {
			setProject(previousProject);
			setProjectDescError(err?.message || "Unable to update project description.");
		} finally {
			setProjectDescSaving(false);
		}
	}

	function handleProjectNameKeyDown(event) {
		if (event.key === "Enter") {
			event.preventDefault();
			saveProjectName();
			return;
		}

		if (event.key === "Escape") {
			event.preventDefault();
			cancelEditProjectName();
		}
	}

	function handleProjectDescKeyDown(event) {
		if (event.key === "Enter") {
			event.preventDefault();
			saveProjectDesc();
			return;
		}

		if (event.key === "Escape") {
			event.preventDefault();
			cancelEditProjectDesc();
		}
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
					<div className="kanban-title-row">
						<h1
							ref={projectNameRef}
							className={`page-title kanban-editable-title${isEditingProjectName ? " is-editing" : ""}`}
							contentEditable={isEditingProjectName}
							suppressContentEditableWarning
							role="textbox"
							aria-label="Project name"
							onInput={(event) => setProjectNameDraft(event.currentTarget.textContent || "")}
							onKeyDown={handleProjectNameKeyDown}
						>
							{isEditingProjectName ? null : project.name}
						</h1>
						{canEditProjectName && !isEditingProjectName && (
							<button
								type="button"
								className="kanban-inline-edit-btn"
								onClick={beginEditProjectName}
								title="Edit project name"
								aria-label="Edit project name"
							>
								<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
									<path d="M14.06 3.4a2 2 0 0 1 2.83 0l3.7 3.7a2 2 0 0 1 0 2.83l-9.9 9.9-5.55 1.38 1.38-5.55 9.9-9.9zM4 20h16v2H4z" />
								</svg>
							</button>
						)}
						{canEditProjectName && isEditingProjectName && (
							<div className="kanban-inline-edit-actions">
								<button
									type="button"
									className="btn btn-primary"
									onClick={saveProjectName}
									disabled={projectNameSaving}
								>
									{projectNameSaving ? "Saving..." : "Save"}
								</button>
								<button type="button" className="btn btn-secondary" onClick={cancelEditProjectName}>
									Cancel
								</button>
							</div>
						)}
					</div>
					{projectNameError && <p className="error-message">{projectNameError}</p>}
					<div className="kanban-desc-row">
						<p
							ref={projectDescRef}
							className={`kanban-editable-desc${isEditingProjectDesc ? " is-editing" : ""}`}
							contentEditable={isEditingProjectDesc}
							suppressContentEditableWarning
							role="textbox"
							aria-label="Project description"
							onInput={(event) => setProjectDescDraft(event.currentTarget.textContent || "")}
							onKeyDown={handleProjectDescKeyDown}
						>
							{isEditingProjectDesc ? null : (project.description || "")}
						</p>
						{canEditProjectName && !isEditingProjectDesc && (
							<button
								type="button"
								className="kanban-inline-edit-btn"
								onClick={beginEditProjectDesc}
								title="Edit project description"
								aria-label="Edit project description"
							>
								<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
									<path d="M14.06 3.4a2 2 0 0 1 2.83 0l3.7 3.7a2 2 0 0 1 0 2.83l-9.9 9.9-5.55 1.38 1.38-5.55 9.9-9.9zM4 20h16v2H4z" />
								</svg>
							</button>
						)}
						{canEditProjectName && isEditingProjectDesc && (
							<div className="kanban-inline-edit-actions">
								<button
									type="button"
									className="btn btn-primary"
									onClick={saveProjectDesc}
									disabled={projectDescSaving}
								>
									{projectDescSaving ? "Saving..." : "Save"}
								</button>
								<button type="button" className="btn btn-secondary" onClick={cancelEditProjectDesc}>
									Cancel
								</button>
							</div>
						)}
					</div>
					{projectDescError && <p className="error-message">{projectDescError}</p>}
				</div>
			</div>

			<div className="kanban-actions">
					<button className="btn btn-secondary" onClick={() => setMembersOpen(true)}>
						Project Members
					</button>
					<button className="btn btn-secondary" onClick={() => setSettingsOpen(true)}>
						Project Settings
					</button>
					<button className="btn btn-secondary" onClick={() => navigate('/main-page/metrics', { state: { project } })}>
						Metrics
					</button>
					<button className="btn btn-primary" onClick={openReorder}>Organize Columns</button>
			</div>
			{settingsError && <p className="error-message">{settingsError}</p>}

			{/* <div className="permission-summary" role="status" aria-live="polite">
				<p>
					<strong>{projectRole}</strong> role view
				</p>
				<p>Create Task action: {canCreateTask ? "Visible" : "Hidden"}</p>
				<p>Take Task action: {canTakeTask ? "Available for unassigned tasks" : "Hidden"}</p>
				<p>Manual assignments: {isAdminOrOwner ? "Enabled" : "Admin or owner only"}</p>
			</div> */}

			<div className="kanban-shell">
				{loading && <p>Loading columns...</p>}
				{error && <p className="error-message">{error}</p>}
				{taskActionError && <p className="error-message">{taskActionError}</p>}
				<KanbanBoard
					columns={columnsForBoard}
					isTaskAssignedToMe={isTaskAssignedToMe}
					onTaskClick={(task) => {
						if (pendingTaskActions[String(task?.id)] || task?.isPending) return;
						navigate(`/main-page/kanban/task/${task.id}`, { state: { task, project, projectMembers, isAdminOrOwner, canMembersAssignTaskToOthers } });
					}}
					showAddTaskButton={canCreateTask}
					onTaskDrop={handleTaskDrop}
					onAddTask={(column) => {
						if (!canCreateTask) return;
						setSelectedCategoryId(column?.id || "");
						setAddTaskOpen(true);
					}}
					renderTask={(task, column) => {
						const assignee = getTaskAssignee(task);
						const isUnassigned = !assignee;
						const isAssignedToMe = isTaskAssignedToMe(task);
						const columnName = String(column?.title || "").toLowerCase();
						const isToReview = columnName === "to_review" || columnName === "to review";
						const isDone = columnName === "done";
						const showTakeTask = canTakeTask && isUnassigned && !isDone;
						const showUnassignTask = canTakeTask && isAssignedToMe && !isDone && !isToReview;
						const showRemoveTask = isDone && isAdminOrOwner;
						const pendingAction = pendingTaskActions[String(task?.id)] || (task?.isPending ? "create" : "");
						const isPending = Boolean(pendingAction);
						const pendingLabel = (() => {
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
						})();
						const showTaskAction = showTakeTask || showUnassignTask || showRemoveTask || isPending;
						const actionLabel = isPending ? pendingLabel : (showUnassignTask ? "Unassign" : "Take Task");
						const creatorName = `${task.creator?.firstName || task.createdBy?.firstName || task.creator?.first_name || task.createdBy?.first_name || ""} ${task.creator?.lastName || task.createdBy?.lastName || task.creator?.last_name || task.createdBy?.last_name || ""}`.trim();
						const assignedMembers = Array.isArray(task.assignees) && task.assignees.length > 0 ? task.assignees : assignee ? [assignee] : [];

						return (
							<>
								<div className="kb-task-card-inner">
									<div className="kb-task-card-topline">
										{(() => {
											const pr = String(task?.priority || "").toLowerCase();
												const normalized = pr.replace(/_priority$/i, "").replace(/\s+/g, "_");
												const pillClass = normalized === "critical" ? "urgent" : (normalized || "unset");
												const label = pillClass === "unset"
													? "Unset"
													: pillClass
														.replace(/_/g, " ")
														.replace(/\b\w/g, (c) => c.toUpperCase());
											return (
												<span className="kb-priority-line">
													<span className="kb-priority-prefix">Priority •</span>{" "}
													<span className={`kb-priority-pill kb-priority-${pillClass}`}>{label}</span>
												</span>
											);
										})()}
									</div>

									<h4 className="kb-task-title">{task.title}</h4>
									{isPending && <p className="kb-task-pending">{pendingLabel}</p>}
									{task.description && <p className="kb-task-desc">{task.description}</p>}
										
									{creatorName && (
										<p className="kb-task-meta">
											Created by: <strong className="kb-task-meta-name">{creatorName}</strong>
										</p>
									)}

									{(task.targetDate || task.target_date) && (
										<p className="kb-task-meta">
											Target: <span className={`kb-task-meta-name tdm-target-value${(task.isPastDue || task.is_past_due) ? " is-overdue" : ""}`}>
												{formatDateShort(task.targetDate || task.target_date)}
											</span>
											{(task.isPastDue || task.is_past_due) ? (
												<span className="tdm-overdue-badge" style={{ marginLeft: 8 }}>Overdue</span>
											) : null}
										</p>
									)}

									<div className="kb-task-divider" />

									<div className="kb-task-footer-row">
										<div className="kb-task-assignee-block">
											<span className="kb-task-assignee-label">Assigned:</span>
											<div className="kb-task-avatar-row">
												{assignedMembers.length > 0 ? (
													assignedMembers.slice(0, 3).map((member, idx) => (
														<span key={member?.id ?? idx} className="kb-task-avatar" title={getDisplayName(member)}>
															{getInitials(member)}
														</span>
													))
												) : (
													<span className="kb-task-unassigned">None</span>
												)}
											</div>
										</div>

										{(showRemoveTask || showTakeTask || showUnassignTask) && (
											<button
												type="button"
												className={`kb-task-action${(showUnassignTask || showRemoveTask) ? " kb-task-action--unassign" : " kb-task-action--take"}`}
												onClick={(event) => {
													event.stopPropagation();
													if (isPending) return;
													if (showRemoveTask) {
														handleRemoveTask(task);
														return;
													}

													if (showUnassignTask) {
														handleUnassignTask(task);
														return;
													}

													handleTakeTask(task);
												}}
												disabled={isPending}
											>
												{showRemoveTask ? "Remove" : actionLabel}
											</button>
										)}
									</div>
								</div>

								{isUnassigned && !showTaskAction && projectRole === "member" && (
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

						const resolvedCategoryId = payload.categoryId || selectedCategoryId || taskCategories[0]?.id;
						if (!resolvedCategoryId) {
							throw new Error("A category is required to create a task.");
						}

						const tempId = `temp-task-${Date.now()}`;
						const nowIso = new Date().toISOString();
						const optimisticTask = {
							id: tempId,
							title: payload.title,
							description: payload.description,
							priority: payload.priority || "unset",
							targetDate: payload.targetDate || null,
							target_date: payload.targetDate || null,
							createdAt: nowIso,
							created_at: nowIso,
							assignees: [],
							assignee: null,
							isPending: true,
						};

						const newTaskRequest = {
							...payload,
							projectId: project?.id,
							categoryId: resolvedCategoryId,
							taskName: payload.title,
							taskDescription: payload.description,
						};
						setTaskActionError("");
						setTaskPending(tempId, "create");
						setTaskCategories((prev) => insertTaskIntoCategory(prev, resolvedCategoryId, optimisticTask));

						try {
							const data = await createNewTask(newTaskRequest);
							const createdTask = data?.task || data?.createdTask || data?.newTask;
							if (createdTask && createdTask.id) {
								setTaskCategories((prev) => {
									const removed = removeTaskById(prev, tempId);
									const targetCategoryId = createdTask.categoryId || createdTask.category_id || resolvedCategoryId;
									return insertTaskIntoCategory(removed.next, targetCategoryId, createdTask);
								});
							}
							await loadTaskCategories();
						} catch (err) {
							setTaskCategories((prev) => removeTaskById(prev, tempId).next);
							setTaskActionError(err?.message || "Unable to create task.");
							throw err;
						} finally {
							clearTaskPending(tempId);
						}
					}}
				/>

				<ProjectSettingsModal
					isOpen={settingsOpen}
					onClose={() => setSettingsOpen(false)}
					settings={taskPermissions}
					onSettingChange={handleSettingChange}
					onDeleteProject={handleDeleteProject}
					projectRole={projectRole}
					canEditPermissions={canEditProjectSettings}
					pendingSettings={settingsPending}
					deleteProjectPending={deleteProjectPending}
				/>

				<ProjectMembersModal
					isOpen={membersOpen}
					onClose={() => setMembersOpen(false)}
					project={project || ""}
					members={projectMembers}
					loading={membersLoading}
					error={membersError}
					currentUserId={currentUser?.id || ""}
					currentUserRole={projectRole}
					canRemoveMembers={projectRole === "owner" || projectRole === "admin"}
					canUpdateRoles={projectRole === "owner"}
					onRemoveMember={handleRemoveMember}
					onUpdateRole={handleUpdateMemberRole}
					removePending={memberActionPending}
					updateRolePending={memberActionPending}
					memberActionError={memberActionError}
					onAdded={handleReloadMembers}
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

				{/* Task details are now a dedicated page: /main-page/kanban/task/:taskId */}
			</div>
		</section>
	);
}

export default KanbanPage;
