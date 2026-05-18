import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import KanbanBoard from "../components/common/KanbanBoard";
import AddTaskModal from "../components/common/AddTaskModal";
import ColumnsReorderModal from "../components/common/ColumnsReorderModal";
import ProjectSettingsModal from "../components/common/ProjectSettingsModal";
import ProjectMembersModal from "../components/common/ProjectMembersModal";
import { SkeletonColumn } from "../components/common/SkeletonComponents";
import "../components/styles/KanbanPage.css";
import "../components/styles/ColumnsReorderModal.css";
import "../components/styles/SkeletonLoading.css";
import "../components/styles/WorkspacePages.css";
import { getCurrentUser } from "../services/authService";
import { getProjects, getTaskCategories, createNewTask, getProjectMembers, getProjectSettings, updateProjectSettings, updateProjectName, updateProjectDescription, takeTask, updateTaskStatus, approveTaskReview, rejectTaskReview, unassignTask, deleteTask, deleteProject, removeMemberFromProject, updateMemberRole } from "../services/projectService";
import normalizeProfileImage from "../utils/normalizeProfileImage";

const DEFAULT_TASK_PERMISSIONS = {
	allow_member_create_task: false,
	allow_member_take_task: true,
	allow_member_edit_task: false,
	allow_member_delete_task: false,
	allow_member_add_board: false,
	allow_member_add_member: false,
	allow_member_review: false,
	allow_member_move_task_to_done: false,
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

/** Matches columns used for review workflow (same idea as task card flags). */
function isReviewLikeCategoryName(name) {
	const n = String(name || "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
	if (!n) return false;
	if (n === "to_review" || n === "to review") return true;
	return n.includes("review");
}

function getProfileImageSrc(user) {
	return normalizeProfileImage(
		user?.profileImageBase64 ||
		user?.profile_image_base64 ||
		user?.avatar ||
		user?.avatarUrl ||
		user?.imageUrl ||
		user?.profileImage ||
		null
	);
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
	const toast = useToast();
	const [project, setProject] = useState(location.state?.project || null);
	const [taskCategories, setTaskCategories] = useState([]);
	const [loading, setLoading] = useState(true);
	const [reorderOpen, setReorderOpen] = useState(false);
	const [addTaskOpen, setAddTaskOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [membersOpen, setMembersOpen] = useState(false);
	const [selectedCategoryId, setSelectedCategoryId] = useState("");
	const [taskPermissions, setTaskPermissions] = useState(DEFAULT_TASK_PERMISSIONS);
	const [localTaskAssignees, setLocalTaskAssignees] = useState({});
	const [projectMembers, setProjectMembers] = useState([]);
	const [membersLoading, setMembersLoading] = useState(false);
	const [isEditingProjectName, setIsEditingProjectName] = useState(false);
	const [projectNameDraft, setProjectNameDraft] = useState("");
	const [projectNameOriginal, setProjectNameOriginal] = useState("");
	const [projectNameSaving, setProjectNameSaving] = useState(false);
	const projectNameRef = useRef(null);
	const [isEditingProjectDesc, setIsEditingProjectDesc] = useState(false);
	const [projectDescDraft, setProjectDescDraft] = useState("");
	const [projectDescOriginal, setProjectDescOriginal] = useState("");
	const [projectDescSaving, setProjectDescSaving] = useState(false);
	const projectDescRef = useRef(null);
	const [pendingTaskActions, setPendingTaskActions] = useState({});
	const [settingsPending, setSettingsPending] = useState({});
	const [memberActionPending, setMemberActionPending] = useState({});
	const [deleteProjectPending, setDeleteProjectPending] = useState(false);
	const [dragReviewModal, setDragReviewModal] = useState({ isOpen: false, taskId: null, targetColumn: null, action: null });
	const [dragReviewReason, setDragReviewReason] = useState("");
	const [dragReviewSubmitting, setDragReviewSubmitting] = useState(false);
	const taskCategoriesRef = useRef(taskCategories);


	const currentUser = useMemo(() => getCurrentUser(), []);

	const projectRole = useMemo(() => {
		if (!project || !currentUser) return "member";

		const explicitRole = (project.role || "").toLowerCase();
		if (["owner", "admin", "manager", "member"].includes(explicitRole)) {
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
	const canMembersReviewTasks = taskPermissions.allow_member_review;
	const canMembersMoveTaskToDone = taskPermissions.allow_member_move_task_to_done;
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

	const { columnCount, taskCount } = useMemo(() => {
		const countColumns = columnsForBoard.length;
		const countTasks = columnsForBoard.reduce(
			(total, column) => total + (Array.isArray(column.tasks) ? column.tasks.length : 0),
			0
		);
		return { columnCount: countColumns, taskCount: countTasks };
	}, [columnsForBoard]);

	const loadTaskCategories = useCallback(async (options = {}) => {
		if (!project?.id) return;
		const silent = options.silent === true;
		if (!silent) {
			setLoading(true);
		}

		try {
			const data = await getTaskCategories(project.id);
			setTaskCategories(data.categories || []);
		} catch (err) {
			toast.showError(err?.message || "Error fetching task categories for this project.");
		} finally {
			if (!silent) {
				setLoading(false);
			}
		}
	}, [project?.id, toast]);

	const loadProjectMembers = useCallback(async () => {
		if (!project?.id) return;

		setMembersLoading(true);

		try {
			const data = await getProjectMembers(project.id);
			setProjectMembers(data.members || []);
		} catch (membersRequestError) {
			toast.showError(membersRequestError?.message || "Unable to load project members.");
			setProjectMembers([]);
		} finally {
			setMembersLoading(false);
		}
	}, [project?.id, toast]);

	const loadProjectSettings = useCallback(async () => {
		if (!project?.id) return;

		try {
			const settings = await getProjectSettings(project.id);
			setTaskPermissions({ ...DEFAULT_TASK_PERMISSIONS, ...settings });
		} catch (settingsError) {
			toast.showError(settingsError?.message || "Unable to load project settings.");
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
				// Fallback load failed - show cached data or empty state
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
			setPendingTaskActions({});
			setSettingsPending({});
			setMemberActionPending({});
			return;
		}

		loadProjectSettings();

		setLocalTaskAssignees({});
		
	}, [project, loadProjectSettings]);

	useEffect(() => {
		taskCategoriesRef.current = taskCategories;
	}, [taskCategories]);

	useEffect(() => {
		const handleRealtime = (event) => {
			const detail = event?.detail || {};
			const payload = detail.payload || {};
			const type = String(detail.type || "").toLowerCase();
			if (!project?.id) return;
			if (payload.projectId && String(payload.projectId) !== String(project.id)) return;

			const relevant = new Set([
				"task_assigned",
				"task_unassigned",
				"task_status_changed",
				"review_approved",
				"review_rejected",
				"task_comment",
				"task_comment_reply",
			]);
			if (!relevant.has(type)) return;
			loadTaskCategories({ silent: true });
		};

		window.addEventListener("notifications:push", handleRealtime);
		return () => window.removeEventListener("notifications:push", handleRealtime);
	}, [project?.id, loadTaskCategories]);

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
				await loadTaskCategories({ silent: true });
			} catch (err) {
				toast.showError(err?.message || "Unable to create task.");
				toast.showError(err?.message || "Unable to delete task.");
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
			setSettingsPending((prev) => ({ ...prev, [settingName]: true }));

			try {
				await updateProjectSettings(project.id, settingName, nextValue);
			} catch (err) {
				setTaskPermissions((prev) => ({ ...prev, [settingName]: previousValue }));
				toast.showError(err?.message || "Unable to update project settings.");
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

			setDeleteProjectPending(true);

			try {
				await deleteProject(project.id);
				toast.showSuccess("Project deleted successfully!");
				setSettingsOpen(false);
				navigate("/main-page/projects");
			} catch (err) {
				toast.showError(err?.message || "Unable to delete project.");
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

			setMemberActionPending((prev) => ({ ...prev, [memberId]: "remove" }));

			try {
				await removeMemberFromProject(project.id, memberId);
				await handleReloadMembers();
			} catch (err) {
				toast.showError(err?.message || "Unable to remove member from project.");
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

			setMemberActionPending((prev) => ({ ...prev, [memberId]: nextRole }));

			try {
				await updateMemberRole(project.id, memberId, nextRole);
				await handleReloadMembers();
			} catch (err) {
				toast.showError(err?.message || "Unable to update member role.");
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

	const getTaskAssignedMembers = useCallback(
		(task) => {
			if (!task?.id) return [];

			const merged = [];
			const localAssignee = localTaskAssignees[task.id];
			if (localAssignee) merged.push(localAssignee);

			if (Array.isArray(task.assignees)) {
				merged.push(...task.assignees);
			} else if (task.assignee) {
				merged.push(task.assignee);
			}

			return merged.filter(Boolean).filter((member, index, list) => {
				const memberId = String(member?.id || member?.userId || member?.user_id || "");
				return memberId && list.findIndex((item) => String(item?.id || item?.userId || item?.user_id || "") === memberId) === index;
			});
		},
		[localTaskAssignees]
	);

	const isTaskAssignedToMe = useCallback(
		(task) => {
			if (!task) return false;

			const assignee = getTaskAssignee(task);
			const assignedMembers = getTaskAssignedMembers(task);
			return (
				assignedMembers.some((a) => String(a?.id || a?.userId || a?.user_id || "") === String(currentUser?.id || "")) ||
				(assignee && assignee.id === currentUser?.id)
			);
		},
		[getTaskAssignee, getTaskAssignedMembers, currentUser?.id]
	);

	const canDragTask = useCallback(
		(task, column) => {
			if (!task || !column) return false;
			const columnName = String(column?.title || column?.name || "").trim().toLowerCase();
			// Tasks in Done column cannot be dragged by anyone
			if (columnName === "done") return false;
			// Otherwise check if task is assigned to me (original logic)
			if (isTaskAssignedToMe) return isTaskAssignedToMe(task);
			return true;
		},
		[isTaskAssignedToMe]
	);

	const handleTakeTask = useCallback(
		async (task) => {
			if (!task?.id || !currentUser) return;
			if (!canTakeTask) return;
			if (isTaskAssignedToMe(task)) return;
			if (pendingTaskActions[String(task.id)]) return;
			const taskId = task.id;
			const previousAssignee = localTaskAssignees[taskId];
			const optimisticAssignee = {
				id: currentUser.id,
				firstName: currentUser.firstName || currentUser.first_name,
				lastName: currentUser.lastName || currentUser.last_name,
				email: currentUser.email,
			};

			setTaskPending(taskId, "take");
			setLocalTaskAssignees((prev) => ({
				...prev,
				[taskId]: optimisticAssignee,
			}));

			try {
				await takeTask(taskId);
				await loadTaskCategories({ silent: true });
			} catch (err) {
				toast.showError(err?.message || "Unable to create task.");
				setLocalTaskAssignees((prev) => {
					const next = { ...prev };
					if (previousAssignee) {
						next[taskId] = previousAssignee;
					} else {
						delete next[taskId];
					}
					return next;
				});
			} finally {
				clearTaskPending(taskId);
			}
		},
		[currentUser, canTakeTask, isTaskAssignedToMe, loadTaskCategories, localTaskAssignees, pendingTaskActions, setTaskPending, clearTaskPending]
	);

	const handleDragReviewConfirm = useCallback(
		async () => {
			const { taskId, targetColumn, action } = dragReviewModal;
			if (!taskId || !targetColumn || !action) return;

			setDragReviewSubmitting(true);
			const reason = String(dragReviewReason || "").trim() || `${capitalizeFirst(action)} via drag`;

			try {
				const moved = moveTaskToCategory(taskCategoriesRef.current, taskId, targetColumn.id, {
					categoryId: targetColumn.id,
					isPending: true,
				});
				setTaskCategories(moved.next);
				setTaskPending(taskId, "move");

				if (action === "approve") {
					await approveTaskReview(taskId, reason);
				} else if (action === "reject") {
					await rejectTaskReview(taskId, reason);
				}

				await loadTaskCategories({ silent: true });
				setDragReviewModal({ isOpen: false, taskId: null, targetColumn: null, action: null });
				setDragReviewReason("");
			} catch (err) {
				setTaskCategories((prev) => {
					const currentLoc = findTaskLocation(prev, taskId);
					if (!currentLoc) return prev;
					const reverted = moveTaskToCategory(prev, taskId, currentLoc.categoryId, currentLoc.task);
					return reverted.next;
				});
			} finally {
				setDragReviewSubmitting(false);
				clearTaskPending(taskId);
			}
		},
		[dragReviewModal, dragReviewReason, moveTaskToCategory, setTaskPending, clearTaskPending, findTaskLocation, loadTaskCategories]
	);

	const capitalizeFirst = (str) => {
		if (!str) return "";
		return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
	};

	const handleTaskDrop = async (taskId, column) => {
		if (!taskId || !column?.id) return;
		if (pendingTaskActions[String(taskId)]) return;
		const currentLocation = findTaskLocation(taskCategoriesRef.current, taskId);
		if (!currentLocation) return;
		if (String(currentLocation.categoryId) === String(column.id)) return;
		
		// Prevent tasks in Done from being moved
		const sourceColumnName = String(currentLocation.categoryName || "").trim().toLowerCase();
		if (sourceColumnName === "done") {
			return;
		}
		
		const targetCategoryName = String(column?.title || column?.name || "").trim().toLowerCase();
		
		// If dragging from To Review to To Do or Done, show approval/rejection modal
		if (sourceColumnName === "to_review" || sourceColumnName === "to review") {
			if (targetCategoryName === "to_do" || targetCategoryName === "todo") {
				// Moving back to To Do = reject
				setDragReviewModal({ isOpen: true, taskId, targetColumn: column, action: "reject" });
				setDragReviewReason("");
				return;
			} else if (targetCategoryName === "done") {
				// Moving to Done = approve
				setDragReviewModal({ isOpen: true, taskId, targetColumn: column, action: "approve" });
				setDragReviewReason("");
				return;
			}
		}
		
		if (targetCategoryName === "done" && !isAdminOrOwner && projectRole !== "manager") {
			const canMoveAssignedTaskToDone = canMembersMoveTaskToDone && isTaskAssignedToMe(currentLocation.task);
			if (!canMoveAssignedTaskToDone) {
				return;
			}
		}

		const moved = moveTaskToCategory(taskCategoriesRef.current, taskId, column.id, {
			categoryId: column.id,
			isPending: true,
		});
		setTaskCategories(moved.next);
		setTaskPending(taskId, "move");

		try {
			const sourceName = currentLocation.categoryName || "";
			const fromReviewColumn = isReviewLikeCategoryName(sourceName);
			// Dragging into Done from a review column must use the review approve API so a `reviews` row
			// is written (same as Task Details → Approve). Plain updateTaskStatus never inserts reviews.
			if (targetCategoryName === "done" && fromReviewColumn) {
				await approveTaskReview(taskId, "Approved via drag");
			} else {
				await updateTaskStatus(taskId, column.id);
			}
			await loadTaskCategories({ silent: true });
		} catch (dropError) {
			toast.showError(dropError?.message || "Unable to move task to this category.");
			setTaskCategories((prev) => {
				const reverted = moveTaskToCategory(prev, taskId, currentLocation.categoryId, currentLocation.task);
				return reverted.next;
			});
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

			setTaskPending(taskId, "unassign");
			setLocalTaskAssignees((prev) => {
				const next = { ...prev };
				delete next[taskId];
				return next;
			});

			try {
				await unassignTask(taskId);
				await loadTaskCategories({ silent: true });
			} catch (err) {
				toast.showError(err?.message || "Unable to create task.");
				toast.showError(err?.message || "Unable to unassign task.");
				setLocalTaskAssignees((prev) => {
					const next = { ...prev };
					if (previousAssignee) {
						next[taskId] = previousAssignee;
					}
					return next;
				});
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
		setIsEditingProjectName(false);
		if (projectNameRef.current) {
			projectNameRef.current.textContent = projectNameOriginal;
		}
	}

	function beginEditProjectDesc() {
		const currentDesc = project?.description || "";
		setProjectDescOriginal(currentDesc);
		setProjectDescDraft(currentDesc);
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
		setIsEditingProjectDesc(false);
		if (projectDescRef.current) {
			projectDescRef.current.textContent = projectDescOriginal;
		}
	}

	async function saveProjectName() {
		const trimmed = projectNameDraft.replace(/[\r\n]+/g, " ").trim();
		if (!trimmed) {
			return;
		}

		if (!project?.id || projectNameSaving) return;
		const previousProject = project;
		const optimisticProject = project ? { ...project, name: trimmed } : project;
		setProject(optimisticProject);
		// keep project state in React only; do not persist to localStorage
		setProjectNameSaving(true);
		try {
			const data = await updateProjectName(project.id, trimmed);
			const updatedName = data?.project?.name || data?.name || trimmed;
			setProject((prev) => (prev ? { ...prev, name: updatedName } : prev));
			setIsEditingProjectName(false);
		} catch (err) {
			toast.showError(err?.message || "Unable to update project name.");
			setProject(previousProject);
		} finally {
			setProjectNameSaving(false);
		}
	}

	async function saveProjectDesc() {
		const trimmed = projectDescDraft.replace(/[\r\n]+/g, " ").trim();
		if (!trimmed) {
			return;
		}

		if (!project?.id || projectDescSaving) return;
		const previousProject = project;
		const optimisticProject = project ? { ...project, description: trimmed } : project;
		setProject(optimisticProject);
		// keep project state in React only; do not persist to localStorage
		setProjectDescSaving(true);
		try {
			const data = await updateProjectDescription(project.id, trimmed);
			const updatedDesc = data?.project?.description || data?.description || trimmed;
			setProject((prev) => (prev ? { ...prev, description: updatedDesc } : prev));
			setIsEditingProjectDesc(false);
		} catch (err) {
			toast.showError(err?.message || "Unable to update project description.");
			setProject(previousProject);
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
			<header className="workspace-hero">
				<div className="workspace-hero-content">
				<div className="kanban-title">
					<div className="kanban-project-meta">
						<span className="kanban-project-tag">Active Project</span>
						<span className="kanban-project-summary">{columnCount} columns - {taskCount} tasks</span>
					</div>
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
									className="kanban-inline-edit-action-btn kanban-inline-save-btn"
									onClick={saveProjectName}
									disabled={projectNameSaving}
									title="Save project name"
									aria-label="Save project name"
								>
									{projectNameSaving ? (
										<span className="kanban-inline-btn-spinner" aria-hidden="true" />
									) : (
										<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
											<path d="M9 16.2l-3.5-3.5 1.4-1.4L9 13.4l8.1-8.1 1.4 1.4z" />
										</svg>
									)}
								</button>
								<button
									type="button"
									className="kanban-inline-edit-action-btn kanban-inline-cancel-btn"
									onClick={cancelEditProjectName}
									title="Cancel editing project name"
									aria-label="Cancel editing project name"
								>
									<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
										<path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
									</svg>
								</button>
							</div>
						)}
					</div>
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
									className="kanban-inline-edit-action-btn kanban-inline-save-btn"
									onClick={saveProjectDesc}
									disabled={projectDescSaving}
									title="Save project description"
									aria-label="Save project description"
								>
									{projectDescSaving ? (
										<span className="kanban-inline-btn-spinner" aria-hidden="true" />
									) : (
										<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
											<path d="M9 16.2l-3.5-3.5 1.4-1.4L9 13.4l8.1-8.1 1.4 1.4z" />
										</svg>
									)}
								</button>
								<button
									type="button"
									className="kanban-inline-edit-action-btn kanban-inline-cancel-btn"
									onClick={cancelEditProjectDesc}
									title="Cancel editing project description"
									aria-label="Cancel editing project description"
								>
									<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
										<path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
									</svg>
								</button>
							</div>
						)}
					</div>
				</div>

				<div className="kanban-actions">
					<button
						className="kanban-icon-btn"
						onClick={() => setMembersOpen(true)}
						title="Project Members"
						aria-label="Project Members"
					>
						<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
							<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
						</svg>
					</button>
					<button
						className="kanban-icon-btn"
						onClick={() => setSettingsOpen(true)}
						title="Project Settings"
						aria-label="Project Settings"
					>
						<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
							<path d="M19.14 12.94a7.14 7.14 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.44 7.44 0 0 0-1.63-.95l-.36-2.53a.5.5 0 0 0-.49-.41h-3.84a.5.5 0 0 0-.49.41l-.36 2.53a7.44 7.44 0 0 0-1.63.95l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.14 7.14 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96a7.44 7.44 0 0 0 1.63.95l.36 2.53a.5.5 0 0 0 .49.41h3.84a.5.5 0 0 0 .49-.41l.36-2.53a7.44 7.44 0 0 0 1.63-.95l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64ZM12 15.2a3.2 3.2 0 1 1 3.2-3.2 3.2 3.2 0 0 1-3.2 3.2z" />
						</svg>
					</button>
					<button
						className="kanban-icon-btn"
						onClick={() => navigate("/main-page/metrics", { state: { project } })}
						title="Metrics"
						aria-label="Metrics"
					>
						<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
							<path d="M10 20h4V4h-4v16zM4 20h4V10H4v10zm12 0h4V14h-4v6z" />
						</svg>
					</button>
					<button
						className="kanban-icon-btn"
						onClick={openReorder}
						title="Organize Columns"
						aria-label="Organize Columns"
					>
						<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
							<path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
						</svg>
					</button>
				</div>
			</div>
		</header>

			{/* <div className="permission-summary" role="status" aria-live="polite">
				<p>
					<strong>{projectRole}</strong> role view
				</p>
				<p>Create Task action: {canCreateTask ? "Visible" : "Hidden"}</p>
				<p>Take Task action: {canTakeTask ? "Available for unassigned tasks" : "Hidden"}</p>
				<p>Manual assignments: {isAdminOrOwner ? "Enabled" : "Admin or owner only"}</p>
			</div> */}

			<div className="kanban-shell">
				{loading && (
					<div style={{ display: "flex", gap: "16px", overflowX: "auto", paddingBottom: "16px" }}>
						<SkeletonColumn taskCount={3} />
						<SkeletonColumn taskCount={2} />
						<SkeletonColumn taskCount={4} />
						<SkeletonColumn taskCount={1} />
					</div>
				)}
				{!loading && (
					<>
						<KanbanBoard
							columns={columnsForBoard}
							isTaskAssignedToMe={isTaskAssignedToMe}
					canDragTask={canDragTask}
					onTaskClick={(task) => {
						if (pendingTaskActions[String(task?.id)] || task?.isPending) return;
						navigate(`/main-page/kanban/task/${task.id}`, { state: { task, project, projectMembers, isAdminOrOwner, canMembersAssignTaskToOthers, canMembersReviewTasks, canMembersMoveTaskToDone } });
					}}
					showAddTaskButton={canCreateTask}
					onTaskDrop={handleTaskDrop}
					onAddTask={(column) => {
						if (!canCreateTask) return;
						setSelectedCategoryId(column?.id || "");
						setAddTaskOpen(true);
					}}
					renderTask={(task, column) => {
						const isAssignedToMe = isTaskAssignedToMe(task);
						const columnName = String(column?.title || "").toLowerCase();
						const isToReview = columnName === "to_review" || columnName === "to review";
						const isDone = columnName === "done";
							const showTakeTask = canTakeTask && !isAssignedToMe && !isDone;
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
							const assignedMembers = getTaskAssignedMembers(task);

						return (
							<>
								<div className="tf-task-card-inner">
									<div className="tf-task-card-topline">
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
											<span className="tf-priority-line">
												<span className="tf-priority-prefix">Priority •</span>{" "}
												<span className={`tf-priority-pill tf-priority-${pillClass}`}>{label}</span>
												</span>
											);
										})()}
									</div>

								<h4 className="tf-task-title">{task.title}</h4>
								{isPending && <p className="tf-task-pending">{pendingLabel}</p>}
								{task.description && <p className="tf-task-desc">{task.description}</p>}
										
									{creatorName && (
										<p className="tf-task-meta">
											Created by: <strong className="tf-task-meta-name">{creatorName}</strong>
										</p>
									)}

									{(task.targetDate || task.target_date) && (
										<p className="tf-task-meta">
											Target: <span className={`tf-task-meta-name tdm-target-value${(task.isPastDue || task.is_past_due) ? " is-overdue" : ""}`}>
												{formatDateShort(task.targetDate || task.target_date)}
											</span>
											{(task.isPastDue || task.is_past_due) ? (
												<span className="tdm-overdue-badge" style={{ marginLeft: 8 }}>Overdue</span>
											) : null}
										</p>
									)}

									<div className="tf-task-divider" />

									<div className="tf-task-footer-row">
										<div className="tf-task-assignee-block">
											<span className="tf-task-assignee-label">Assigned:</span>
											<div className="tf-task-avatar-row">
												{assignedMembers.length > 0 ? (
													assignedMembers.slice(0, 3).map((member, idx) => (
														<span key={member?.id ?? idx} className="tf-task-avatar" title={getDisplayName(member)}>
															{getProfileImageSrc(member) ? (
																<img src={getProfileImageSrc(member)} alt={getDisplayName(member)} />
															) : (
																getInitials(member)
															)}
														</span>
													))
												) : (
													<span className="tf-task-unassigned">None</span>
												)}
											</div>
										</div>

										{(showRemoveTask || showTakeTask || showUnassignTask) && (
											<button
												type="button"
												className={`tf-task-action${(showUnassignTask || showRemoveTask) ? " tf-task-action--unassign" : " tf-task-action--take"}`}
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

								{!showTaskAction && projectRole === "member" && (
									<p className="tf-task-helper">Take Task is hidden in strict mode.</p>
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
							await loadTaskCategories({ silent: true });
						} catch (err) {
						toast.showError(err?.message || "Unable to create task.");
							setTaskCategories((prev) => removeTaskById(prev, tempId).next);
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
					projectName={project?.name}
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
					currentUserId={currentUser?.id || ""}
					currentUserRole={projectRole}
					canRemoveMembers={projectRole === "owner" || projectRole === "admin"}
					canUpdateRoles={projectRole === "owner"}
					onRemoveMember={handleRemoveMember}
					onUpdateRole={handleUpdateMemberRole}
					removePending={memberActionPending}
					updateRolePending={memberActionPending}
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

				{dragReviewModal.isOpen && (
					<div className="kanban-confirm-overlay" role="presentation" onClick={() => setDragReviewModal({ isOpen: false, taskId: null, targetColumn: null, action: null })}>
						<div className="kanban-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="drag-review-title" onClick={(e) => e.stopPropagation()}>
							<div className="kanban-confirm-title-row">
								<h3 id="drag-review-title">
									{dragReviewModal.action === "approve" ? "Approve Task" : "Reject Task"}
								</h3>
							</div>
							<p>
								{dragReviewModal.action === "approve"
									? "Please provide an approval note. This will be recorded in the review history."
									: "Please provide a reason for rejecting this task. This will be recorded in the review history."}
							</p>
							<textarea
								className="kanban-review-textarea"
								value={dragReviewReason}
								onChange={(e) => setDragReviewReason(e.target.value)}
								placeholder={dragReviewModal.action === "approve" ? "Enter approval note" : "Enter rejection reason"}
								rows={4}
								autoComplete="off"
							/>
							<div className="kanban-confirm-actions">
								<button
									type="button"
									className="kanban-confirm-cancel"
									onClick={() => setDragReviewModal({ isOpen: false, taskId: null, targetColumn: null, action: null })}
									disabled={dragReviewSubmitting}
								>
									Cancel
								</button>
								<button
									type="button"
									className={dragReviewModal.action === "approve" ? "kanban-confirm-approve" : "kanban-confirm-reject"}
									onClick={handleDragReviewConfirm}
									disabled={dragReviewSubmitting}
								>
									{dragReviewSubmitting
										? dragReviewModal.action === "approve"
											? "Approving..."
											: "Rejecting..."
										: dragReviewModal.action === "approve"
											? "Approve Task"
											: "Reject Task"}
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Task details are now a dedicated page: /main-page/kanban/task/:taskId */}
					</>
				)}
			</div>
		</section>
	);
}

export default KanbanPage;

