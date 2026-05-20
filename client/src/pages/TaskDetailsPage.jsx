import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import { TaskDetailsContent } from "../components/common/TaskDetailsModal";
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
  const toast = useToast();

  const initialTask = location.state?.task || null;
  const initialProject = location.state?.project || null;
  const initialMembers = location.state?.projectMembers || [];
  const hasInitialIsAdmin = Object.prototype.hasOwnProperty.call(location.state || {}, "isAdminOrOwner");
  const hasInitialCanAssign = Object.prototype.hasOwnProperty.call(location.state || {}, "canMembersAssignTaskToOthers");
  const hasInitialCanReview = Object.prototype.hasOwnProperty.call(location.state || {}, "canMembersReviewTasks");
  const initialIsAdmin = location.state?.isAdminOrOwner || false;
  const initialCanAssign = location.state?.canMembersAssignTaskToOthers || false;
  const initialCanReview = location.state?.canMembersReviewTasks || false;

  const [task, setTask] = useState(initialTask);
  const [project, setProject] = useState(initialProject);
  const [projectMembers, setProjectMembers] = useState(initialMembers);
  const [taskCategories, setTaskCategories] = useState([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [isAdminOrOwner, setIsAdminOrOwner] = useState(initialIsAdmin);
  const [canMembersAssignTaskToOthers, setCanMembersAssignTaskToOthers] = useState(initialCanAssign);
  const [canMembersReviewTasks, setCanMembersReviewTasks] = useState(initialCanReview);

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
      const nextCanReview = !!settings?.allow_member_review;
      if (!hasInitialCanAssign) {
        setCanMembersAssignTaskToOthers(nextCanAssign);
      }
      if (!hasInitialCanReview) {
        setCanMembersReviewTasks(nextCanReview);
      }
    } catch (err) {
      if (!hasInitialCanAssign) {
        setCanMembersAssignTaskToOthers(false);
      }
      if (!hasInitialCanReview) {
        setCanMembersReviewTasks(false);
      }
    }
  }, [hasInitialCanAssign, hasInitialCanReview, project?.id, projectId]);

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
        toast.showNotFound("Task not found.");
      } else {
        // Validate that the task's project matches the route's projectId if provided
        const taskProjectId = found.project?.id || found.projectId;
        if (projectId && String(taskProjectId) !== String(projectId)) {
          toast.showError("This task does not belong to the selected project.");
          return;
        }

        setTask(found);
        setProject((prev) => prev || found.project || (found.projectId ? { id: found.projectId } : null));
        if (!hasInitialIsAdmin) {
          const role = String(found.requesterRole || "").toLowerCase();
          setIsAdminOrOwner(role === "owner" || role === "admin");
        }
        if (!hasInitialCanAssign && found.allowAssignTaskToOthers !== undefined) {
          setCanMembersAssignTaskToOthers(!!found.allowAssignTaskToOthers);
        }
      }
    } catch (err) {
      toast.showError(err?.message || "Unable to load task.");
    } finally {
      if (!silent) {
        setTaskLoading(false);
      }
    }
  }, [hasInitialCanAssign, hasInitialIsAdmin, projectId, toast]);

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
    await deleteTask(tId);

    if (projectId || project?.id) {
      const pId = projectId || project.id;
      navigate(`/main-page/projects/${pId}/kanban`, { replace: true });
      return;
    }

    navigate("/main-page/my-tasks", { replace: true });
  };

  const handleClose = () => {
    navigate(-1);
  };

  // If task not passed via state, show fallback message
  if (!task) {
    return (
      <div className="page-shell tdm-page-container">
        <div className="tdm-section-card">
          {taskLoading ? (
            <>
              <SkeletonBox width="200px" height="24px" />
              <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <SkeletonRow showAvatar={false} lineCount={3} />
                <SkeletonRow showAvatar={false} lineCount={2} />
              </div>
            </>
          ) : (
            <>
              <h3>Task not available</h3>
              <p>Open this page from the board to see task details.</p>
            </>
          )}
          <div style={{ marginTop: 12 }}>
            <button onClick={() => navigate(-1)} className="tdm-close-action">Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell tdm-page-container" role="main">
      <header className="workspace-hero tdm-page-hero">
        <div className="workspace-hero-content">
          <div>
            <h1 className="page-title">Task Details</h1>
            <p className="page-subtitle">Review task information and manage assignee view.</p>
          </div>

          <button type="button" className="tdm-close-btn" onClick={handleClose} aria-label="Close task details">
            &times;
          </button>
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
        canMembersReviewTasks={canMembersReviewTasks}
        assignMemberToTask={handleAssignMemberToTask}
        unassignMemberFromTask={handleUnassignMemberFromTask}
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
