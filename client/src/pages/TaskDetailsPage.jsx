import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import { TaskDetailsContent } from "../components/common/TaskDetailsModal";
import ErrorPage from "./ErrorPage";
import { SkeletonRow, SkeletonBox } from "../components/common/SkeletonComponents";
import {
  getProjectMembers,
  getTaskCategories,
  getProjectSettings,
  createSubtask,
  getTaskComments,
  createTaskComment,
  createTaskCommentReply,
  updateTaskPriority,
  updateTaskStatus,
  updateTaskTargetDate,
  updateTaskDescription,
  updateTaskName,
  assignTaskToOthers,
  unassignTaskFromMember,
  takeTask,
  unassignTask,
  getProjectTags,
  getTaskTags,
  createTaskTag,
  deleteTaskTag,
  deleteTask,
  getTaskById,
} from "../services/projectService";
import { getCurrentUser } from "../services/authService";
import "../components/styles/WorkspacePages.css";
import "../components/styles/TaskDetailsModal.css";
import "../components/styles/SkeletonLoading.css";

export default function TaskDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { taskId, projectId } = useParams();
  const { showError, showNotFound, showSuccess } = useToast();

  const initialTask = location.state?.task || null;
  const initialProject = location.state?.project || null;
  const initialMembers = location.state?.projectMembers || [];
  const hasInitialIsAdmin = Object.prototype.hasOwnProperty.call(location.state || {}, "isAdminOrOwner");
  
  const hasInitialCanReview = Object.prototype.hasOwnProperty.call(location.state || {}, "canMembersReviewTasks");
  const hasInitialCanDelete = Object.prototype.hasOwnProperty.call(location.state || {}, "canMembersDeleteTask");
  const hasInitialCanEdit = Object.prototype.hasOwnProperty.call(location.state || {}, "canMembersEditTask");
  const initialIsAdmin = location.state?.isAdminOrOwner || false;
  const initialCanAssign = location.state?.canMembersAssignTaskToOthers || false;
  const initialCanReview = location.state?.canMembersReviewTasks || false;
  const initialCanDelete = location.state?.canMembersDeleteTask || false;
  const initialCanEdit = location.state?.canMembersEditTask || false;
  const initialCanCreateTag = location.state?.canMembersCreateTag || false;
  const initialCanManageTasks = location.state?.canAdminsManageTasks ?? false;

  const [task, setTask] = useState(initialTask);
  const [project, setProject] = useState(initialProject);
  const [projectMembers, setProjectMembers] = useState(initialMembers);
  const [taskCategories, setTaskCategories] = useState([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [isAdminOrOwner, setIsAdminOrOwner] = useState(initialIsAdmin);
  const [canMembersAssignTaskToOthers, setCanMembersAssignTaskToOthers] = useState(initialCanAssign);
  const [canMembersTakeTask, setCanMembersTakeTask] = useState(false);
  const [canMembersReviewTasks, setCanMembersReviewTasks] = useState(initialCanReview);
  const [canMembersDeleteTask, setCanMembersDeleteTask] = useState(initialCanDelete);
  const [canMembersEditTask, setCanMembersEditTask] = useState(initialCanEdit);
  const [canMembersCreateTag, setCanMembersCreateTag] = useState(initialCanCreateTag);
  const [canAdminsManageTasks, setCanAdminsManageTasks] = useState(initialCanManageTasks);

  const currentUser = getCurrentUser();

  const loadMembers = useCallback(async (projectId) => {
    if (!projectId) return;
    try {
      const data = await getProjectMembers(projectId);
      const members = data?.members || data || [];
      setProjectMembers(members);
      if (!hasInitialIsAdmin && currentUser?.id) {
        const currentMember = members.find((member) => String(member?.id) === String(currentUser.id));
        const role = String(currentMember?.role || currentMember?.projectRole || currentMember?.project_role || "").toLowerCase();
        setIsAdminOrOwner(role === "owner" || role === "admin");
      }
    } catch (err) {
      console.error("Unable to load project members", err);
    }
  }, [currentUser?.id, hasInitialIsAdmin]);

  const loadProjectSettings = useCallback(async (projectIdToUse) => {
    const resolvedProjectId = projectIdToUse || projectId || project?.id;
    if (!resolvedProjectId) return;

    try {
      const settings = await getProjectSettings(resolvedProjectId);
      const nextCanAssign = !!settings?.allow_assign_task_to_member;
      const nextCanTake = !!settings?.allow_member_take_task;
      const nextCanReview = !!settings?.allow_member_review;
      const nextCanDelete = !!settings?.allow_member_delete_task;
      const nextCanEdit = !!settings?.allow_member_edit_task;
      const nextCanCreateTag = !!settings?.allow_member_create_tag;
      const nextCanManageTasks = !!settings?.allow_admin_manage_tasks;
      setCanMembersAssignTaskToOthers(nextCanAssign);
      setCanMembersTakeTask(nextCanTake);
      setCanMembersCreateTag(nextCanCreateTag);
      setCanAdminsManageTasks(nextCanManageTasks);
      if (!hasInitialCanReview) {
        setCanMembersReviewTasks(nextCanReview);
      }
      if (!hasInitialCanDelete) {
        setCanMembersDeleteTask(nextCanDelete);
      }
      if (!hasInitialCanEdit) {
        setCanMembersEditTask(nextCanEdit);
      }
    } catch (err) {
      setCanMembersAssignTaskToOthers(false);
      setCanMembersTakeTask(false);
      setCanMembersCreateTag(false);
      setCanAdminsManageTasks(false);
      if (!hasInitialCanReview) {
        setCanMembersReviewTasks(false);
      }
      if (!hasInitialCanDelete) {
        setCanMembersDeleteTask(false);
      }
      if (!hasInitialCanEdit) {
        setCanMembersEditTask(false);
      }
    }
  }, [hasInitialCanReview, hasInitialCanDelete, hasInitialCanEdit, project?.id, projectId]);

  useEffect(() => {
    const projectIdToUse = projectId || project?.id;
    if (!projectIdToUse) return;
    loadMembers(projectIdToUse);
  }, [projectId, project?.id, loadMembers]);

  useEffect(() => {
    const projectIdToUse = projectId || project?.id;
    if (!projectIdToUse) return;

    (async () => {
      try {
        const data = await getTaskCategories(projectIdToUse);
        setTaskCategories(Array.isArray(data?.categories) ? data.categories : []);
      } catch (err) {
        setTaskCategories([]);
      }
    })();
  }, [projectId, project?.id]);

  useEffect(() => {
    const projectIdToUse = projectId || project?.id;
    if (!projectIdToUse) return;
    loadProjectSettings(projectIdToUse);
  }, [projectId, project?.id, loadProjectSettings]);

  const loadTaskById = useCallback(async (id, options = {}) => {
    const silent = options.silent === true;
    if (!silent) {
      setTaskLoading(true);
    }

    try {
      const data = await getTaskById(id);
      const found = data?.task || null;

      if (!found) {
        showNotFound("Task not found.");
      } else {
        // Validate that the task's project matches the route's projectId if provided
        const taskProjectId = found.project?.id || found.projectId;
        if (projectId && String(taskProjectId) !== String(projectId)) {
          showError("This task does not belong to the selected project.");
          return;
        }

        setTask(found);
        setProject((prev) => prev || found.project || (found.projectId ? { id: found.projectId } : null));
        if (!hasInitialIsAdmin) {
          const role = String(found.requesterRole || "").toLowerCase();
          setIsAdminOrOwner(role === "owner" || role === "admin");
        }
        if (found.allowAssignTaskToOthers !== undefined) {
          setCanMembersAssignTaskToOthers(!!found.allowAssignTaskToOthers);
        }
      }
    } catch (err) {
      const errorMessage = String(err?.message || "Unable to load task.");
      const isMissingTask =
        err?.status === 404 ||
        err?.statusCode === 404 ||
        errorMessage.includes("TASK_NOT_FOUND") ||
        errorMessage.toLowerCase().includes("not found");

      if (isMissingTask) {
        showNotFound("This task was deleted or is no longer available.");

        const fallbackProjectId = projectId || project?.id;
        if (fallbackProjectId) {
          navigate(`/main-page/projects/${fallbackProjectId}/kanban`, { replace: true });
        } else {
          navigate("/main-page/projects", { replace: true });
        }
        return;
      }

      // Suppress noisy server validation messages (e.g. 'taskId is required')
      const lower = errorMessage.toLowerCase();
      const isServerValidationIssue = lower.includes("taskid is required") || lower.includes("task id is required") || lower.includes("invalid task id");

      if (isServerValidationIssue) {
        // Treat as not-found / invalid and render the 404 page without spamming a toast
        showNotFound("This task was deleted or is no longer available.");
        if (projectId || project?.id) {
          const pId = projectId || project.id;
          navigate(`/main-page/projects/${pId}/kanban`, { replace: true });
          return;
        }
        navigate("/main-page/projects", { replace: true });
        return;
      }

      showError(errorMessage);
    } finally {
      if (!silent) {
        setTaskLoading(false);
      }
    }
  }, [hasInitialIsAdmin, navigate, project?.id, projectId, showError, showNotFound]);

  useEffect(() => {
    if (!taskId) return;
    loadTaskById(taskId);
  }, [taskId, loadTaskById]);

  useEffect(() => {
    const handleRealtime = (event) => {
      const detail = event?.detail || {};
      const payload = detail.payload || detail;
      const eventType = String(detail.eventType || detail.type || payload.eventType || payload.type || "").toLowerCase();

      if (eventType === "permissionupdate") {
        const incomingProjectId = payload.projectId || detail.projectId;
        if (incomingProjectId && projectId && String(incomingProjectId) !== String(projectId)) return;
        loadProjectSettings(incomingProjectId || projectId || project?.id);
        return;
      }

      if (!payload.taskId) return;
      if (!taskId || String(payload.taskId) !== String(taskId)) return;
      loadTaskById(taskId, { silent: true });
    };

    window.addEventListener("notifications:push", handleRealtime);
    return () => window.removeEventListener("notifications:push", handleRealtime);
  }, [loadProjectSettings, loadTaskById, project?.id, projectId, taskId]);

  const handleUpdateTaskName = async (tId, name) => {
    const data = await updateTaskName(tId, name);
    const updatedTitle = data?.task?.title || data?.title || name;
    setTask((prev) => (prev ? { ...prev, title: updatedTitle } : prev));
    return data;
  };

  const handleUpdateTaskDescription = async (tId, description) => {
    const data = await updateTaskDescription(tId, description);
    const updatedDesc = data?.task?.description || data?.description || description;
    setTask((prev) => (prev ? { ...prev, description: updatedDesc } : prev));
    return data;
  };

  const handleUpdateTaskPriority = async (tId, priority) => {
    const data = await updateTaskPriority(tId, priority);
    const updatedPriority = data?.task?.priority || data?.priority || priority;
    setTask((prev) => (prev ? { ...prev, priority: updatedPriority } : prev));
    return data;
  };

  const handleUpdateTaskStatus = async (tId, categoryId) => {
    const data = await updateTaskStatus(tId, categoryId);
    const updatedCategoryId = data?.task?.categoryId ?? data?.task?.category_id ?? categoryId;
    setTask((prev) =>
      prev
        ? { ...prev, categoryId: updatedCategoryId, category_id: updatedCategoryId }
        : prev
    );
    return data;
  };

  const handleUpdateTaskTargetDate = async (tId, targetDate) => {
    const data = await updateTaskTargetDate(tId, targetDate);
    const updatedTargetDate = data?.task?.targetDate ?? data?.task?.target_date ?? targetDate ?? null;
    const updatedPastDue = data?.task?.isPastDue ?? data?.task?.is_past_due ?? false;
    setTask((prev) => (prev ? { ...prev, targetDate: updatedTargetDate, target_date: updatedTargetDate, isPastDue: updatedPastDue, is_past_due: updatedPastDue } : prev));
    return data;
  };

  const handleAssignMemberToTask = async (tId, memberId) => {
    const data = await assignTaskToOthers(tId, memberId);
    setTask((prev) => {
      if (!prev) return prev;
      const resolvedMember = (projectMembers || []).find((member) => String(member?.id) === String(memberId));
      const existing = Array.isArray(prev.assignees) ? prev.assignees : [];
      if (!resolvedMember) return prev;
      const alreadyAssigned = existing.some((member) => String(member?.id) === String(memberId));
      if (alreadyAssigned) return prev;
      return { ...prev, assignees: [...existing, resolvedMember] };
    });
    return data;
  };

  const handleUnassignMemberFromTask = async (tId, memberId) => {
    const data = await unassignTaskFromMember(tId, memberId);
    setTask((prev) => {
      if (!prev) return prev;
      const existing = Array.isArray(prev.assignees) ? prev.assignees : [];
      return { ...prev, assignees: existing.filter((member) => String(member?.id) !== String(memberId)) };
    });
    return data;
  };

  const handleDeleteTask = async (tId) => {
    if (!tId) return;
    try {
      await deleteTask(tId);
      showSuccess("Task removed successfully.");

      if (projectId || project?.id) {
        const pId = projectId || project.id;
        navigate(`/main-page/projects/${pId}/kanban`, { replace: true });
        return;
      }

      navigate("/main-page/my-tasks", { replace: true });
    } catch (error) {
      showError(error?.message || "Unable to delete task.");
      throw error;
    }
  };

  const handleClose = () => {
    navigate(-1);
  };

  // If task not passed via state, show 404 page (preserve loading skeleton while fetching)
  if (!task) {
    if (taskLoading) {
      return (
        <div className="page-shell tdm-page-container" role="main">
          <div className="tdm-section-card">
            <>
              <SkeletonBox width="200px" height="24px" />
              <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <SkeletonRow showAvatar={false} lineCount={3} />
                <SkeletonRow showAvatar={false} lineCount={2} />
              </div>
            </>
          </div>
        </div>
      );
    }

    return <ErrorPage />;
  }

  return (
    <div className="page-shell tdm-page-container" role="main">
      <header className="workspace-hero tdm-page-hero">
        <div className="workspace-hero-content">
          <div>
            <h1 className="page-title">Task Details</h1>
            <p className="page-subtitle">Review task information and manage assignee view.</p>
          </div>
        </div>
      </header>

      <TaskDetailsContent
        asPage={true}
        currentUserId={currentUser?.id || ""}
        task={task}
        projectMembers={projectMembers}
        projectId={project?.id}
        isAdminOrOwner={isAdminOrOwner}
        canMembersAssignTaskToOthers={canMembersAssignTaskToOthers}
        canMembersTakeTask={canMembersTakeTask}
        canMembersReviewTasks={canMembersReviewTasks}
        canMembersDeleteTask={canMembersDeleteTask}
        canMembersEditTask={canMembersEditTask}
        canMembersCreateTag={canMembersCreateTag}
        canAdminsManageTasks={canAdminsManageTasks}
        assignMemberToTask={handleAssignMemberToTask}
        unassignMemberFromTask={handleUnassignMemberFromTask}
        takeSelfTask={async (tId) => takeTask(tId)}
        unassignSelfTask={async (tId) => unassignTask(tId)}
        createSubtasks={async ({ subtaskData }) => createSubtask(subtaskData)}
        fetchTaskComments={async (tId) => getTaskComments(tId)}
        addTaskComment={async (tId, userId, comment) => createTaskComment(tId, userId, comment)}
        addTaskCommentReply={async (tId, commentId, userId, reply) => createTaskCommentReply(tId, commentId, userId, reply)}
        getProjectTags={getProjectTags}
        getTaskTags={getTaskTags}
        createTaskTag={createTaskTag}
        deleteTaskTag={deleteTaskTag}
        updateTaskName={handleUpdateTaskName}
        updateTaskDescription={handleUpdateTaskDescription}
        updateTaskPriority={handleUpdateTaskPriority}
        updateTaskStatus={handleUpdateTaskStatus}
        updateTaskTargetDate={handleUpdateTaskTargetDate}
        taskCategories={taskCategories}
        onDeleteTask={handleDeleteTask}
        onClose={handleClose}
      />
    </div>
  );
}

