import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCurrentUser } from "../../services/authService";
import { getTaskReviews, getTaskActivities, approveTaskReview, rejectTaskReview, deleteSubtask, updateSubtask, getTaskFiles, uploadTaskFile, deleteTaskFile } from "../../services/projectService";
import { SkeletonCommentInline, SkeletonRow } from "./SkeletonComponents";
import { SendIcon, SaveIcon, CancelIcon, TrashIcon, ReviewApprovedIcon, ReviewRejectedIcon, CalendarIcon, DownloadIcon, FilterIcon } from "./AppIcons";
import FilePreview, { isPreviewSupported } from "./FilePreview";
import "../styles/TaskDetailsModal.css";
import "../styles/SkeletonLoading.css";
import normalizeProfileImage from "../../utils/normalizeProfileImage";


function getMemberLabel(member) {
  if (!member) return "Unknown member";

  const firstName = member.firstName || member.first_name || "";
  const lastName = member.lastName || member.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || member.email || member.username || member.id || "Unknown member";
}

function getCreatedAtLabel(task) {
  const rawValue = task?.createdAt || task?.created_at;
  if (!rawValue) return "Not available";

  const parsedDate = new Date(rawValue);
  if (Number.isNaN(parsedDate.getTime())) return String(rawValue);

  return parsedDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTargetDate(value) {
  if (!value) return "No target date";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "No target date";
  return parsedDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function toDateInputValue(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";
  return parsedDate.toISOString().slice(0, 10);
}

function getMemberId(member) {
  if (!member) return "";
  return String(member.id || member.email || getMemberLabel(member));
}

function getInitials(member) {
  const firstName = member?.firstName || member?.first_name || "";
  const lastName = member?.lastName || member?.last_name || "";
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  return initials || String(getMemberLabel(member)).slice(0, 2).toUpperCase();
}

function formatTimeAgo(value) {
  if (!value) return "";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";

  const diffMs = Math.max(0, Date.now() - parsedDate.getTime());
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 10) return "just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
}

function capitalizeFirst(value) {
  if (!value) return "";
  const s = String(value);
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function getReviewEntryAction(review) {
  return String(review?.action || "").trim().toLowerCase();
}

/** Comment/reason text stored on a review row (approve note or rejection reason). */
function getReviewEntryComment(review) {
  const raw = review?.comment ?? review?.Comment;
  if (raw == null) return "";
  return String(raw).trim();
}

const TASK_PRIORITY_OPTIONS = ["unset", "low", "medium", "high", "urgent"];
const TASK_FILE_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "video/mp4",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
  ".txt",
  ".mp4",
  ".zip",
  ".docx",
  ".xlsx",
].join(",");

function normalizeTaskPriority(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "critical") return "urgent";
  if (normalized === "unset") return "unset";
  if (TASK_PRIORITY_OPTIONS.includes(normalized)) return normalized;
  return "unset";
}

function formatActivityValue(value, fallback = "none") {
  if (value == null || value === "") return fallback;
  return String(value);
}

function formatActivityDateValue(value) {
  if (!value) return "no date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function formatActivityMessage(activity) {
  const actorName = activity?.actorName || getMemberLabel(activity?.actor) || "Someone";
  const details = activity?.details || {};
  const type = activity?.activityType || activity?.activity_type || activity?.action || "";

  switch (type) {
    case "subtask_created":
      return `${actorName} added a new subtask titled "${formatActivityValue(details.title, "Untitled subtask")}"`;
    case "subtask_removed":
      return `${actorName} removed the subtask "${formatActivityValue(details.title, "Untitled subtask")}"`;
    case "task_name_updated":
      return `${actorName} updated the task name from "${formatActivityValue(details.previousName)}" to "${formatActivityValue(details.newName)}"`;
    case "task_description_updated":
      return `${actorName} updated the description from "${formatActivityValue(details.previousDescription)}" to "${formatActivityValue(details.newDescription)}"`;
    case "tag_added":
      return `${actorName} added the tag "${formatActivityValue(details.tagName, "Untitled tag")}"`;
    case "tag_removed":
      return `${actorName} removed the tag "${formatActivityValue(details.tagName, "Untitled tag")}"`;
    case "task_priority_updated":
      return `${actorName} updated the task's priority from "${capitalizeFirst(formatActivityValue(details.previousPriority, "unset"))}" to "${capitalizeFirst(formatActivityValue(details.newPriority, "unset"))}"`;
    case "task_status_updated":
      return `${actorName} updated the task's status from "${formatActivityValue(details.previousStatus)}" to "${formatActivityValue(details.newStatus)}"`;
    case "task_target_date_updated":
      return `${actorName} updated the task's target date from "${formatActivityDateValue(details.previousTargetDate)}" to "${formatActivityDateValue(details.newTargetDate)}"`;
    case "task_assigned":
      return `${actorName} assigned this task to ${formatActivityValue(details.assigneeName, "a team member")}`;
    case "task_unassigned":
      return `${actorName} unassigned the task from ${formatActivityValue(details.assigneeName, "a team member")}`;
    case "task_taken":
      return `${actorName} took the task`;
    case "task_self_unassigned":
      return `${actorName} unassigned the task from themself`;
    case "file_attached":
      return `${actorName} attached a file: ${formatActivityValue(details.fileName, "Untitled file")}`;
    case "file_removed":
      return `${actorName} removed the file: ${formatActivityValue(details.fileName, "Untitled file")}`;
    case "review_approved":
      return `${actorName} approved the task${details.comment ? `: "${details.comment}"` : ""}`;
    case "review_rejected":
      return `${actorName} rejected the task${details.comment ? `: "${details.comment}"` : ""}`;
    default:
      return `${actorName} updated this task`;
  }
}

function formatFileSize(value) {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let nextSize = size;
  let unitIndex = 0;
  while (nextSize >= 1024 && unitIndex < units.length - 1) {
    nextSize /= 1024;
    unitIndex += 1;
  }
  return `${nextSize >= 10 || unitIndex === 0 ? Math.round(nextSize) : nextSize.toFixed(1)} ${units[unitIndex]}`;
}

function formatAttachmentDate(value) {
  if (!value) return "Just now";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return String(value);
  return parsedDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getAttachmentFileName(file) {
  return String(file?.file_name || file?.fileName || file?.name || "Attachment");
}

function getAttachmentExtension(file) {
  const fileName = getAttachmentFileName(file);
  const match = fileName.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "";
}

function getAttachmentTypeInfo(file) {
  const mime = String(file?.mime_type || file?.mimeType || "").toLowerCase();
  const ext = getAttachmentExtension(file);

  if (mime === "application/pdf" || ext === "pdf") return { label: "PDF", tone: "pdf" };
  if (mime.includes("wordprocessingml") || ext === "docx") return { label: "DOCX", tone: "docx" };
  if (mime.includes("spreadsheetml") || ext === "xlsx") return { label: "XLSX", tone: "xlsx" };
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp"].includes(ext)) return { label: (ext || "IMG").toUpperCase(), tone: "image" };
  if (mime === "video/mp4" || ext === "mp4") return { label: "MP4", tone: "video" };
  if (mime === "text/plain" || ext === "txt") return { label: "TXT", tone: "text" };
  if (mime.includes("zip") || ext === "zip") return { label: "ZIP", tone: "archive" };
  return { label: (ext || "FILE").toUpperCase(), tone: "file" };
}

function getAttachmentUploaderName(file) {
  const uploader = file?.uploaded_by || file?.uploadedBy;
  const name = uploader?.name || `${uploader?.firstName || uploader?.first_name || ""} ${uploader?.lastName || uploader?.last_name || ""}`.trim();
  return name || uploader?.email || file?.uploaded_by_name || file?.uploadedByName || "Unknown";
}

function normalizeCategoryName(value) {
  return String(value || "").trim().toLowerCase();
}

function isTodoCategoryName(value) {
  const normalized = normalizeCategoryName(value);
  return normalized === "todo" || normalized === "to_do";
}

function isInProgressCategoryName(value) {
  const normalized = normalizeCategoryName(value);
  return normalized === "in_progress" || normalized === "in progress";
}

function isToReviewCategoryName(value) {
  const normalized = normalizeCategoryName(value);
  return normalized === "to_review" || normalized === "to review" || normalized === "review";
}

function getStatusBadgeKey(value) {
  if (isInProgressCategoryName(value)) return "in-progress";
  if (isToReviewCategoryName(value)) return "review";
  if (normalizeCategoryName(value) === "done") return "done";
  return "todo";
}

function getStatusBadgeLabel(value) {
  const key = getStatusBadgeKey(value);
  if (key === "in-progress") return "In Progress";
  if (key === "review") return "To Review";
  if (key === "done") return "Done";
  return "Todo";
}

export function TaskDetailsContent({ asPage = false, canMembersEditTask = false, currentUserId, task, isAdminOrOwner, createSubtasks, fetchTaskComments, addTaskComment, addTaskCommentReply, canMembersAssignTaskToOthers, canMembersTakeTask = false, canMembersReviewTasks = false, canMembersDeleteTask = false, canMembersCreateTag = false, canAdminsManageTasks = false, assignMemberToTask, unassignMemberFromTask, takeSelfTask, unassignSelfTask, projectMembers = [], onAssign, onClose, projectId, projectName = "", taskCategories = [], getProjectTags, getTaskTags, createTaskTag, deleteTaskTag, updateTaskName, updateTaskDescription, updateTaskPriority, updateTaskStatus, updateTaskTargetDate, onDeleteTask }) {
  const taskData = task || {};
  const currentUser = useMemo(() => getCurrentUser(), []);
  const currentUserIdValue = currentUserId || currentUser?.id || "";
  const [localSubtasks, setLocalSubtasks] = useState([]);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [subtaskError, setSubtaskError] = useState("");
  const [subtaskPendingIds, setSubtaskPendingIds] = useState({});
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [assignmentPendingIds, setAssignmentPendingIds] = useState({});
  const [assignmentError, setAssignmentError] = useState("");
  const [newComment, setNewComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState("");
  const [replyInputs, setReplyInputs] = useState({});
  const [replySubmittingId, setReplySubmittingId] = useState("");
  const [tags, setTags] = useState(Array.isArray(taskData?.tags) ? taskData.tags : []);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [projectTagSuggestions, setProjectTagSuggestions] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [tagError, setTagError] = useState("");
  const [deletingTagId, setDeletingTagId] = useState(null);
  const [taskPriority, setTaskPriority] = useState(normalizeTaskPriority(taskData?.priority));
  const [prioritySubmitting, setPrioritySubmitting] = useState(false);
  const [priorityError, setPriorityError] = useState("");
  const [taskCategoryId, setTaskCategoryId] = useState(String(taskData?.categoryId || taskData?.category_id || ""));
  const [taskCategorySubmitting, setTaskCategorySubmitting] = useState(false);
  const [taskCategoryError, setTaskCategoryError] = useState("");
  const [deleteTaskSubmitting, setDeleteTaskSubmitting] = useState(false);
  const [deleteTaskError, setDeleteTaskError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [targetDate, setTargetDate] = useState(taskData?.targetDate || taskData?.target_date || null);
  const [isPastDue, setIsPastDue] = useState(!!(taskData?.isPastDue ?? taskData?.is_past_due));
  const [targetDateSubmitting, setTargetDateSubmitting] = useState(false);
  const [targetDateError, setTargetDateError] = useState("");
  const [taskTitle, setTaskTitle] = useState(taskData?.title || "");
  const [isEditingTaskTitle, setIsEditingTaskTitle] = useState(false);
  const [taskTitleDraft, setTaskTitleDraft] = useState(taskData?.title || "");
  const [taskTitleOriginal, setTaskTitleOriginal] = useState("");
  const [taskTitleSaving, setTaskTitleSaving] = useState(false);
  const [taskTitleError, setTaskTitleError] = useState("");
  const [taskDesc, setTaskDesc] = useState(taskData?.description || "");
  const [isEditingTaskDesc, setIsEditingTaskDesc] = useState(false);
  const [taskDescDraft, setTaskDescDraft] = useState(taskData?.description || "");
  const [taskDescOriginal, setTaskDescOriginal] = useState("");
  const [taskDescSaving, setTaskDescSaving] = useState(false);
  const [taskDescError, setTaskDescError] = useState("");
  const [showAssigneesModal, setShowAssigneesModal] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const assignees = useMemo(() => (Array.isArray(taskData.assignees) ? taskData.assignees : []), [taskData.assignees]);
  const [localAssignedIds, setLocalAssignedIds] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState("");
  const [sidebarTab, setSidebarTab] = useState("comments");
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState("");
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const attachmentInputRef = useRef(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveReason, setApproveReason] = useState("");
  const [approveSubmitting, setApproveSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const currentMemberEntry = useMemo(() => {
    if (!Array.isArray(projectMembers)) return null;
    return projectMembers.find((m) => String(m?.id) === String(currentUserIdValue));
  }, [projectMembers, currentUserIdValue]);

  const currentUserRole = String(currentMemberEntry?.role || "").toLowerCase();
  const isCurrentUserAssigned = useMemo(() => {
    if (!currentUserIdValue) return false;
    return assignees.some((member) => String(member?.id || member?.user_id || "") === String(currentUserIdValue));
  }, [assignees, currentUserIdValue]);
  const isCurrentUserCreator = useMemo(() => {
    if (!currentUserIdValue) return false;
    const creatorId = taskData?.createdBy || taskData?.created_by;
    return creatorId && String(creatorId) === String(currentUserIdValue);
  }, [currentUserIdValue, taskData?.createdBy, taskData?.created_by]);
  const canEditTaskTitle = useMemo(() => {
    if (currentUserRole === "owner") return true;
    if (currentUserRole === "admin") return canAdminsManageTasks;
    if (currentUserRole === "manager") return true;
    if (currentUserRole === "member" || !currentUserRole) return canMembersEditTask;
    if (!currentUserIdValue) return false;
    const creatorId = taskData?.createdBy || taskData?.created_by;
    if (creatorId && String(creatorId) === String(currentUserIdValue)) return true;
    return assignees.some((member) => String(member?.id || member?.user_id || "") === String(currentUserIdValue));
  }, [assignees, canAdminsManageTasks, canMembersEditTask, currentUserIdValue, currentUserRole, taskData?.createdBy, taskData?.created_by]);
  const canManageAdminTaskActions = currentUserRole === "owner" || (currentUserRole === "admin" && canAdminsManageTasks);
  const canOpenTaskActionsMenu = canManageAdminTaskActions || canEditTaskTitle;
  const canReview = isAdminOrOwner || currentUserRole === "manager" || (currentUserRole === "member" && canMembersReviewTasks);
  const canManageTags = isAdminOrOwner || (currentUserRole === "member" && canMembersCreateTag);
  const currentTaskCategoryName = useMemo(() => {
    const currentCategory = (taskCategories || []).find((category) => String(category?.id || "") === String(taskCategoryId || ""));
    return normalizeCategoryName(currentCategory?.name || taskData?.categoryName || taskData?.category_name);
  }, [taskCategories, taskCategoryId, taskData?.categoryName, taskData?.category_name]);
  const mobileStatusKey = getStatusBadgeKey(currentTaskCategoryName);
  const mobileStatusLabel = getStatusBadgeLabel(currentTaskCategoryName);
  const mobileProjectName = projectName || taskData?.project?.name || taskData?.projectName || taskData?.project_name || "Project Management TOOL";
  const isCurrentTaskDone = currentTaskCategoryName === "done";
  const isCurrentTaskToReview = isToReviewCategoryName(currentTaskCategoryName);
  const canDeleteCurrentTask = (currentUserRole === "member" ? canMembersDeleteTask : canManageAdminTaskActions) && onDeleteTask;
  const canUploadAttachments = !isCurrentTaskToReview && canEditTaskTitle;
  const canEditTaskDetails = canEditTaskTitle && !isCurrentTaskToReview;
  const canChangeTaskCategory =
    !isCurrentTaskDone &&
    (canManageAdminTaskActions || currentUserRole === "manager" || (currentUserRole === "member" && (canMembersEditTask || isCurrentUserAssigned)));

  const taskMenuStatusOptions = useMemo(() => {
    const normalizedCategories = (taskCategories || []).map((category) => ({
      id: String(category?.id || ""),
      name: String(category?.name || "").trim().toLowerCase(),
    }));

    return [
      { key: "todo", label: "Todo", names: ["todo", "to_do"] },
      { key: "in_progress", label: "In Progress", names: ["in_progress", "in progress"] },
      { key: "to_review", label: "To Review", names: ["to_review", "to review", "review"] },
      { key: "done", label: "Done", names: ["done"] },
      { key: "cancelled", label: "Cancelled", names: ["cancelled", "canceled"] },
    ].map((entry) => {
      const category = normalizedCategories.find((item) => entry.names.includes(item.name));
      return {
        key: entry.key,
        label: entry.label,
        categoryId: category?.id || "",
        disabled: !category?.id,
      };
    });
  }, [taskCategories]);
  const taskTitleRef = useRef(null);
  const taskDescRef = useRef(null);
  const taskTargetDateRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuButtonRef = useRef(null);
  const newSubtaskInputRef = useRef(null);

  useEffect(() => {
    if (!canOpenTaskActionsMenu && menuOpen) {
      setMenuOpen(false);
    }
  }, [canOpenTaskActionsMenu, menuOpen]);

  useEffect(() => {
    if (!isCurrentTaskToReview) return;
    setIsEditingTaskTitle(false);
    setIsEditingTaskDesc(false);
    setShowAddSubtask(false);
    setShowTagsModal(false);
  }, [isCurrentTaskToReview]);

  // dropdown is anchored via CSS to the .task-actions-wrap container

  useEffect(() => {
    function handleOutsideClick(e) {
      const target = e.target;
      if (!menuOpen) return;
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;
      if (menuButtonRef.current && menuButtonRef.current.contains(target)) return;
      setMenuOpen(false);
    }

    function handleEsc(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    // keep dropdown open/close responsive to scroll/resize via CSS positioning
    return undefined;
  }, [menuOpen]);

  useEffect(() => {
    const ids = (Array.isArray(task?.assignees) ? task.assignees : [])
      .map(getMemberId)
      .filter(Boolean);
    setLocalAssignedIds(ids);
  }, [task?.assignees]);

  useEffect(() => {
    setLocalSubtasks(Array.isArray(task?.subtasks) ? [...task.subtasks] : []); 
  }, [task?.id, task?.subtasks])

  useEffect(() => {
    if (showAddSubtask) {
      // small delay to ensure input is mounted
      const t = setTimeout(() => {
        try { newSubtaskInputRef.current?.focus(); } catch (e) {}
      }, 30);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [showAddSubtask]);

  async function handleCreateSubtask() {
    if (!newSubtaskTitle || !newSubtaskTitle.trim()) return;
    if (isCurrentTaskToReview) {
      setSubtaskError("Tasks in review can't be edited.");
      setShowAddSubtask(false);
      return;
    }

    const tempId = `temp-subtask-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const optimisticSubtask = {
      id: tempId,
      title: newSubtaskTitle.trim(),
      status: "unfinished",
      createdAt,
      createdBy: currentUser
        ? {
            id: currentUser?.id || currentUserId,
            firstName: currentUser.firstName || currentUser.first_name,
            lastName: currentUser.lastName || currentUser.last_name,
            email: currentUser.email,
          }
        : { id: currentUserId },
      isPending: true,
    };

    setSubtaskError("");
    setSubtaskPendingIds((prev) => ({ ...prev, [tempId]: true }));
    setLocalSubtasks((prev) => [...prev, optimisticSubtask]);

    try {
      const payload = await createSubtasks({
        subtaskData: {
          taskId: task?.id,
          title: newSubtaskTitle.trim(),
          createdBy: currentUser?.id || currentUserId,
          status: "unfinished",
        },
      });
      const created = payload?.subtask || payload?.data || payload;
      if (created && created.id) {
        setLocalSubtasks((prev) => prev.map((item) => (item.id === tempId ? { ...item, ...created, isPending: false } : item)));
      } else {
        setLocalSubtasks((prev) => prev.map((item) => (item.id === tempId ? { ...item, isPending: false } : item)));
      }
      setShowAddSubtask(false);
      setNewSubtaskTitle("");
    } catch (error) {
      setSubtaskError(error.message || "Failed to add subtask");
      setLocalSubtasks((prev) => prev.filter((item) => item.id !== tempId));
    } finally {
      setSubtaskPendingIds((prev) => {
        const next = { ...prev };
        delete next[tempId];
        return next;
      });
    }
  }

  useEffect(() => {
    if (!isEditingTaskTitle) return;
    const el = taskTitleRef.current;
    if (!el) return;
    const nextValue = taskTitleDraft || taskTitle || taskData?.title || "";
    if (el.textContent !== nextValue) {
      el.textContent = nextValue;
    }
  }, [isEditingTaskTitle, taskData?.title, taskTitle, taskTitleDraft]);

  useEffect(() => {
    if (!isEditingTaskDesc) return;
    const el = taskDescRef.current;
    if (!el) return;
    const nextValue = taskDescDraft || taskDesc || taskData?.description || "";
    if (el.textContent !== nextValue) {
      el.textContent = nextValue;
    }
  }, [isEditingTaskDesc, taskData?.description, taskDesc, taskDescDraft]);

  useEffect(() => {
    const nextTitle = task?.title || "";
    setTaskTitle(nextTitle);
    if (!isEditingTaskTitle) {
      setTaskTitleDraft(nextTitle);
    }
  }, [task?.id, task?.title, isEditingTaskTitle]);

  useEffect(() => {
    const nextDesc = task?.description || "";
    setTaskDesc(nextDesc);
    if (!isEditingTaskDesc) {
      setTaskDescDraft(nextDesc);
    }
  }, [task?.id, task?.description, isEditingTaskDesc]);

  useEffect(() => {
    setTaskCategoryId(String(task?.categoryId || task?.category_id || taskData?.categoryId || taskData?.category_id || ""));
  }, [task?.id, task?.categoryId, task?.category_id, taskData?.categoryId, taskData?.category_id]);

  const loadComments = useCallback(async () => {
    if (!task?.id || !fetchTaskComments) {
      setComments([]);
      return;
    }

    setCommentsLoading(true);
    setCommentsError("");

    try {
      const data = await fetchTaskComments(task.id);
      setComments(Array.isArray(data?.comments) ? data.comments : []);
    } catch (err) {
      setCommentsError(err?.message || "Unable to load comments.");
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [fetchTaskComments, task?.id]);

  const loadAttachments = useCallback(async () => {
    if (!task?.id) {
      setAttachments([]);
      return;
    }

    setAttachmentsLoading(true);
    setAttachmentsError("");

    try {
      const data = await getTaskFiles(task.id);
      setAttachments(Array.isArray(data?.files) ? data.files : []);
    } catch (err) {
      setAttachmentsError(err?.message || "Unable to load attachments.");
      setAttachments([]);
    } finally {
      setAttachmentsLoading(false);
    }
  }, [task?.id]);

  useEffect(() => {
    setNewComment("");
    setReplyInputs({});
    setActiveReplyId("");
    setPriorityError("");
    setTargetDateError("");
    setTaskTitleError("");
    setIsEditingTaskTitle(false);
    setTaskDescError("");
    setIsEditingTaskDesc(false);
    setAssignmentError("");
    setAssignmentPendingIds({});
    setSubtaskError("");
    setSubtaskPendingIds({});
    setAttachmentsError("");
    setDeletingAttachmentId("");
    setPreviewFile(null);
    setTagError("");
    setTaskPriority(normalizeTaskPriority(task?.priority));
    setTargetDate(task?.targetDate || task?.target_date || null);
    setIsPastDue(!!(task?.isPastDue ?? task?.is_past_due));
    loadComments();
    loadAttachments();
    // initialize tags from task payload
    setTags(Array.isArray(task?.tags) ? task.tags : []);

    // if task has no tags in payload, try fetching them specifically
    (async () => {
      if ((!task?.tags || (Array.isArray(task.tags) && task.tags.length === 0)) && getTaskTags && task?.id) {
        try {
          const result = await getTaskTags(task.id);
          const fetched = result?.tags || result || [];
          setTags(fetched);
        } catch (err) {
          // ignore
        }
      }
    })();
  }, [task?.id, loadComments, loadAttachments, getTaskTags, task?.priority, task?.targetDate, task?.target_date, task?.isPastDue, task?.is_past_due, task?.tags]);

  const openApproveModal = () => {
    setApproveReason("");
    setShowApproveModal(true);
  };

  const closeApproveModal = () => {
    if (approveSubmitting) return;
    setShowApproveModal(false);
  };

  const handleSubmitApprove = async () => {
    if (!task?.id) return;
    const reason = String(approveReason || "").trim();
    if (!reason) return alert("Please provide an approval note.");
    setApproveSubmitting(true);
    try {
      const data = await approveTaskReview(task.id, reason);
      // update local category id if server returned updated task
      const updatedTask = data?.task || data || null;
      const savedCategoryId = updatedTask?.categoryId ?? updatedTask?.category_id;
      if (savedCategoryId) setTaskCategoryId(String(savedCategoryId));

      const revs = await getTaskReviews(task.id);
      setReviews(revs?.reviews || revs || []);
      setShowApproveModal(false);
    } catch (err) {
      console.error("Approve review failed", err);
      alert(err?.message || "Unable to approve task review");
    } finally {
      setApproveSubmitting(false);
    }
  };

  const openRejectModal = () => {
    setRejectReason("");
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    if (rejectSubmitting) return;
    setShowRejectModal(false);
  };

  const handleSubmitReject = async () => {
    if (!task?.id) return;
    const reason = String(rejectReason || "").trim();
    if (!reason) return alert("Please provide a rejection reason.");
    setRejectSubmitting(true);
    try {
      const data = await rejectTaskReview(task.id, reason);
      // update local category id if server returned updated task
      const updatedTask = data?.task || data || null;
      const savedCategoryId = updatedTask?.categoryId ?? updatedTask?.category_id;
      if (savedCategoryId) setTaskCategoryId(String(savedCategoryId));

      const revs = await getTaskReviews(task.id);
      setReviews(revs?.reviews || revs || []);
      setShowRejectModal(false);
    } catch (err) {
      console.error("Reject review failed", err);
      alert(err?.message || "Unable to reject task review");
    } finally {
      setRejectSubmitting(false);
    }
  };

  useEffect(() => {
    async function loadReviews() {
      if (!task?.id) return setReviews([]);
      setReviewsLoading(true);
      setReviewsError("");
      try {
        const data = await getTaskReviews(task.id);
        const next = data?.reviews || data || [];
        setReviews(next);
      } catch (err) {
        setReviewsError(err?.message || "Unable to load reviews");
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    }

    loadReviews();
  }, [task?.id]);

  const loadActivities = useCallback(async () => {
    if (!task?.id) return setActivities([]);
    setActivitiesLoading(true);
    setActivitiesError("");
    try {
      const data = await getTaskActivities(task.id);
      setActivities(data?.activities || data || []);
    } catch (err) {
      setActivitiesError(err?.message || "Unable to load activity");
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }, [task?.id]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    if (sidebarTab === "activity") {
      loadActivities();
    }
  }, [loadActivities, sidebarTab]);

  useEffect(() => {
    async function loadProjectSuggestions() {
      if (!projectId || !getProjectTags) return setProjectTagSuggestions([]);
      try {
        const data = await getProjectTags(projectId);
        const suggestions = data?.tags || data || [];

        // Deduplicate suggestions primarily by normalized name (case-insensitive),
        // falling back to id when name is not available.
        const seen = new Set();
        const unique = [];
        for (const s of suggestions) {
          const rawName = s?.tagName || s?.tag_name || s?.name || s || "";
          const nameNorm = String(rawName).replace(/\s+/g, " ").trim().toLowerCase();
          const idKey = s && (s.id || s?.tagId || s?.tag_id) ? String(s.id || s.tagId || s.tag_id) : null;
          const key = nameNorm || idKey;
          if (!key) continue;
          if (seen.has(key)) continue;
          seen.add(key);
          unique.push(s);
        }

        setProjectTagSuggestions(unique);
      } catch (err) {
        console.error("Unable to load project tags", err);
        setProjectTagSuggestions([]);
      } finally {
        // no loading state needed here
      }
    }

    loadProjectSuggestions();
  }, [projectId, getProjectTags]);

  // Helper to render modal overlays into document.body when this content is used as a full page
  const maybePortal = (element) => {
    if (!element) return null;
    if (!asPage) return element;
    try {
      return createPortal(element, document.body);
    } catch (e) {
      return element;
    }
  };

  const memberPool = useMemo(() => {
    const combined = [...(Array.isArray(projectMembers) ? projectMembers : []), ...assignees];
    const deduped = new Map();

    combined.forEach((member) => {
      const id = getMemberId(member);
      if (!id || deduped.has(id)) return;
      deduped.set(id, member);
    });

    return Array.from(deduped.values());
  }, [projectMembers, assignees]);

  const filteredMemberPool = useMemo(() => {
    const normalized = assigneeSearch.trim().toLowerCase();
    if (!normalized) return memberPool;
    return memberPool.filter((member) => {
      const name = `${member?.firstName || member?.first_name || ""} ${member?.lastName || member?.last_name || ""}`
        .trim()
        .toLowerCase();
      const email = String(member?.email || "").toLowerCase();
      return name.includes(normalized) || email.includes(normalized);
    });
  }, [assigneeSearch, memberPool]);

  const isOwnerMember = (member) => {
    const role = String(member?.role || member?.projectRole || member?.project_role || "").toLowerCase();
    return role === "owner" || member?.isOwner === true || member?.is_owner === true;
  };

  const ownerMembers = useMemo(
    () => filteredMemberPool.filter((member) => isOwnerMember(member)),
    [filteredMemberPool]
  );

  const nonOwnerMembers = useMemo(
    () => filteredMemberPool.filter((member) => !isOwnerMember(member)),
    [filteredMemberPool]
  );


  const setAssignment = (member, shouldAssign) => {
    const memberId = getMemberId(member);
    if (!memberId) return;

    setLocalAssignedIds((prev) => {
      if (shouldAssign) {
        if (prev.includes(memberId)) return prev;
        return [...prev, memberId];
      }
      return prev.filter((id) => id !== memberId);
    });
  };

  const handleSubmitComment = async () => {
    const trimmed = newComment.trim();
    if (!task?.id || !currentUserIdValue || !trimmed) return;

    setCommentSubmitting(true);
    setCommentsError("");

    try {
      await addTaskComment?.(task.id, currentUserIdValue, trimmed);
      setNewComment("");
      await loadComments();
    } catch (err) {
      setCommentsError(err?.message || "Unable to add comment.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleSubmitReply = async (commentId) => {
    const replyText = (replyInputs[commentId] || "").trim();
    if (!task?.id || !currentUserIdValue || !commentId || !replyText) return;

    setReplySubmittingId(String(commentId));
    setCommentsError("");

    try {
      await addTaskCommentReply?.(task.id, commentId, currentUserIdValue, replyText);
      setReplyInputs((prev) => ({ ...prev, [commentId]: "" }));
      setActiveReplyId("");
      await loadComments();
    } catch (err) {
      setCommentsError(err?.message || "Unable to add reply.");
    } finally {
      setReplySubmittingId("");
    }
  };

  const handleSelectAttachment = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !task?.id || attachmentUploading) return;

    setAttachmentUploading(true);
    setAttachmentsError("");

    try {
      const data = await uploadTaskFile(task.id, file);
      const created = data?.file;
      if (created) {
        setAttachments((prev) => [created, ...prev]);
      } else {
        await loadAttachments();
      }
    } catch (err) {
      setAttachmentsError(err?.message || "Unable to upload attachment.");
    } finally {
      setAttachmentUploading(false);
    }
  };

  const handleDeleteAttachment = async (file) => {
    const fileId = file?.id;
    if (!task?.id || !fileId || deletingAttachmentId) return;

    setDeletingAttachmentId(String(fileId));
    setAttachmentsError("");

    try {
      await deleteTaskFile(task.id, fileId);
      setAttachments((prev) => prev.filter((item) => String(item?.id) !== String(fileId)));
      setPreviewFile((prev) => (String(prev?.id || "") === String(fileId) ? null : prev));
    } catch (err) {
      setAttachmentsError(err?.message || "Unable to delete attachment.");
    } finally {
      setDeletingAttachmentId("");
    }
  };

  const handleAddTag = async (tagName) => {
    const name = (tagName || tagInput || "").trim();
    if (!task?.id || !name) return;
    if (!canManageTags || isCurrentTaskToReview) {
      setTagError("Tag editing is disabled for your project role.");
      return;
    }
    if ((tags || []).length >= 5) {
      setTagError("A task may have up to 5 tags");
      return;
    }
    // Prevent adding duplicate tags (case-insensitive match on tag name)
    const normalizedNew = name.toLowerCase();
    const already = (tags || []).some((t) => {
      const existing = String(t?.tagName || t?.tag_name || t?.name || t || "").trim().toLowerCase();
      return existing === normalizedNew;
    });
    if (already) {
      setTagError("This tag is already added to the task.");
      setTagInput("");
      return;
    }
    const tempId = `temp-tag-${Date.now()}`;
    const optimisticTag = {
      id: tempId,
      tagName: name,
      isPending: true,
    };

    setTagError("");
    setTags((prev) => [...prev, optimisticTag]);
    setTagInput("");

    try {
      const res = await createTaskTag?.(task.id, projectId, name);
      const created = res?.tag || res;
      if (created) {
        setTags((prev) => prev.map((t) => (String(t?.id) === String(tempId) ? created : t)));
      } else if (getTaskTags) {
        const refreshed = await getTaskTags(task.id);
        const fetched = refreshed?.tags || refreshed || [];
        setTags(Array.isArray(fetched) ? fetched : []);
      }
    } catch (err) {
      setTags((prev) => prev.filter((t) => String(t?.id) !== String(tempId)));
      setTagError(err?.message || "Unable to add tag");
    } finally {
      // completed
    }
  };

  const handleDeleteTag = async (tag) => {
    if (!tag?.id || !task?.id) return;
    if (!canManageTags || isCurrentTaskToReview) {
      setTagError("Tag editing is disabled for your project role.");
      return;
    }
    const tagId = tag.id;
    const previousTags = Array.isArray(tags) ? [...tags] : [];

    setDeletingTagId(tagId);
    setTagError("");
    setTags((prev) => prev.filter((item) => String(item?.id) !== String(tagId)));

    try {
      await deleteTaskTag?.(task.id, tagId);
    } catch (err) {
      setTags(previousTags);
      setTagError(err?.message || "Unable to remove tag");
    } finally {
      setDeletingTagId(null);
    }
  };

  const beginEditTaskTitle = () => {
    if (!canEditTaskDetails) return;
    const currentTitle = taskTitle || taskData?.title || "";
    setTaskTitleOriginal(currentTitle);
    setTaskTitleDraft(currentTitle);
    setTaskTitleError("");
    setIsEditingTaskTitle(true);
    requestAnimationFrame(() => {
      const el = taskTitleRef.current;
      if (!el) return;
      el.textContent = currentTitle;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
  };

  const beginEditTaskDesc = () => {
    if (!canEditTaskDetails) return;
    const currentDesc = taskDesc || taskData?.description || "";
    setTaskDescOriginal(currentDesc);
    setTaskDescDraft(currentDesc);
    setTaskDescError("");
    setIsEditingTaskDesc(true);
    requestAnimationFrame(() => {
      const el = taskDescRef.current;
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
  };

  const cancelEditTaskTitle = () => {
    setTaskTitleDraft(taskTitleOriginal);
    setTaskTitleError("");
    setIsEditingTaskTitle(false);
    if (taskTitleRef.current) {
      taskTitleRef.current.textContent = taskTitleOriginal;
    }
  };

  const cancelEditTaskDesc = () => {
    setTaskDescDraft(taskDescOriginal);
    setTaskDescError("");
    setIsEditingTaskDesc(false);
    if (taskDescRef.current) {
      taskDescRef.current.textContent = taskDescOriginal;
    }
  };

  const saveTaskTitle = async () => {
    if (!canEditTaskDetails) {
      setTaskTitleError("Tasks in review can't be edited.");
      setIsEditingTaskTitle(false);
      return;
    }

    const trimmed = taskTitleDraft.replace(/[\r\n]+/g, " ").trim();
    if (!trimmed) {
      setTaskTitleError("Task name cannot be empty.");
      return;
    }

    if (currentUserRole === "admin" && !canAdminsManageTasks) {
      setTaskTitleError("Task management is disabled for admins in this project.");
      return;
    }

    if (!task?.id || taskTitleSaving || !updateTaskName) {
      setIsEditingTaskTitle(false);
      setTaskTitle(trimmed);
      return;
    }

    setTaskTitleSaving(true);
    setTaskTitleError("");
    try {
      const data = await updateTaskName(task.id, trimmed);
      const updated = data?.task?.title || data?.title || trimmed;
      setTaskTitle(updated);
      setIsEditingTaskTitle(false);
    } catch (err) {
      setTaskTitleError(err?.message || "Unable to update task name.");
    } finally {
      setTaskTitleSaving(false);
    }
  };

  const saveTaskDesc = async () => {
    if (!canEditTaskDetails) {
      setTaskDescError("Tasks in review can't be edited.");
      setIsEditingTaskDesc(false);
      return;
    }

    const trimmed = taskDescDraft.replace(/[\r\n]+/g, " ").trim();
    if (!trimmed) {
      setTaskDescError("Task description cannot be empty.");
      return;
    }

    if (currentUserRole === "admin" && !canAdminsManageTasks) {
      setTaskDescError("Task management is disabled for admins in this project.");
      return;
    }

    if (!task?.id || taskDescSaving || !updateTaskDescription) {
      setIsEditingTaskDesc(false);
      setTaskDesc(trimmed);
      return;
    }

    setTaskDescSaving(true);
    setTaskDescError("");
    try {
      const data = await updateTaskDescription(task.id, trimmed);
      const updated = data?.task?.description || data?.description || trimmed;
      setTaskDesc(updated);
      setIsEditingTaskDesc(false);
    } catch (err) {
      setTaskDescError(err?.message || "Unable to update task description.");
    } finally {
      setTaskDescSaving(false);
    }
  };

  const handleTaskTitleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveTaskTitle();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditTaskTitle();
    }
  };

  const handleTaskDescKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveTaskDesc();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditTaskDesc();
    }
  };

  const handleDeleteTask = async () => {
    if (!task?.id || !onDeleteTask || deleteTaskSubmitting) return;
    if (currentUserRole === "admin" && !canAdminsManageTasks) {
      setDeleteTaskError("Task management is disabled for admins in this project.");
      return;
    }

    setDeleteTaskError("");
    setDeleteTaskSubmitting(true);

    try {
      await onDeleteTask(task.id);
    } catch (err) {
      setDeleteTaskError(err?.message || "Unable to delete task.");
      setDeleteTaskSubmitting(false);
    }
  };

  const openDeleteConfirm = () => {
    setDeleteTaskError("");
    setMenuOpen(false);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (deleteTaskSubmitting) return;
    setShowDeleteConfirm(false);
  };

  const confirmDeleteTask = async () => {
    await handleDeleteTask();
    setShowDeleteConfirm(false);
  };

  const handleUpdateTaskPriority = async (nextPriority) => {
    if (!task?.id || !nextPriority) return;
    if (!canEditTaskDetails) {
      setPriorityError("You don't have permission to edit this task.");
      return;
    }
    if (currentUserRole === "admin" && !canAdminsManageTasks) {
      setPriorityError("Task management is disabled for admins in this project.");
      return;
    }

    const normalized = normalizeTaskPriority(nextPriority);
    setPriorityError("");

    if (!updateTaskPriority) return;

    setPrioritySubmitting(true);
    try {
      const data = await updateTaskPriority(task.id, normalized);
      const saved = normalizeTaskPriority(data?.task?.priority || normalized);
      setTaskPriority(saved);
    } catch (err) {
      setPriorityError(err?.message || "Unable to update task priority.");
    } finally {
      setPrioritySubmitting(false);
    }
  };

  const handleUpdateTaskCategory = async (nextCategoryId) => {
    if (!task?.id || !nextCategoryId) return;
    if (currentUserRole === "admin" && !canAdminsManageTasks) {
      setTaskCategoryError("Task management is disabled for admins in this project.");
      return;
    }

    const currentCategoryName = currentTaskCategoryName;
    const nextCategory = (taskCategories || []).find((cat) => String(cat?.id || "") === String(nextCategoryId || ""));
    const nextCategoryName = normalizeCategoryName(nextCategory?.name);
    const movingToDone = nextCategoryName === "done";
    const movingToToDo = isTodoCategoryName(nextCategoryName);
    const isFromTodo = isTodoCategoryName(currentCategoryName);
    const isFromInProgress = isInProgressCategoryName(currentCategoryName);
    const isFromToReview = isToReviewCategoryName(currentCategoryName);

    if (currentCategoryName === "done") {
      setTaskCategoryError("Done tasks can't be moved to another status.");
      return;
    }

    // Check permission rules for members
    if (!canManageAdminTaskActions && currentUserRole !== "manager") {
      // Rule 0: TODO and In Progress cannot move directly to Done
      if (movingToDone && (isFromTodo || isFromInProgress)) {
        setTaskCategoryError("Tasks must be reviewed first.");
        return;
      }

      // Rule 1: Cannot move FROM in_progress TO done
      if (isFromInProgress && movingToDone) {
        setTaskCategoryError("Tasks must be reviewed first.");
        return;
      }

      // Rule 2: Cannot move FROM to_review TO done or todo without permission
      if (isFromToReview && (movingToDone || movingToToDo)) {
        if (!canMembersReviewTasks) {
          setTaskCategoryError("You don't have permission to approve or reject tasks.");
          return;
        }
      }
    }

    setTaskCategoryError("");

    // Moving out of To Review to Todo or Done is a review action, matching board drag/drop.
    if (isFromToReview && (movingToDone || movingToToDo)) {
      setMenuOpen(false);
      if (movingToDone) {
        setApproveReason("");
        setShowApproveModal(true);
      } else {
        setRejectReason("");
        setShowRejectModal(true);
      }
      return;
    }

    if (!updateTaskStatus) return;

    setTaskCategorySubmitting(true);
    try {
      const data = await updateTaskStatus(task.id, nextCategoryId);
      const savedCategoryId = data?.task?.categoryId ?? data?.task?.category_id ?? nextCategoryId;
      setTaskCategoryId(String(savedCategoryId));
    } catch (err) {
      setTaskCategoryError(err?.message || "Unable to update task category.");
    } finally {
      setTaskCategorySubmitting(false);
    }
  };

  const handleUpdateTargetDate = async (nextValue) => {
    if (!task?.id) return;
    if (!canEditTaskDetails) {
      setTargetDateError("You don't have permission to edit this task.");
      return;
    }
    if (currentUserRole === "admin" && !canAdminsManageTasks) {
      setTargetDateError("Task management is disabled for admins in this project.");
      return;
    }

    setTargetDateError("");

    if (!updateTaskTargetDate) return;

    setTargetDateSubmitting(true);
    try {
      const data = await updateTaskTargetDate(task.id, nextValue);
      const saved = data?.task?.targetDate ?? data?.task?.target_date ?? nextValue ?? null;
      const savedPastDue = data?.task?.isPastDue ?? data?.task?.is_past_due ?? false;
      setTargetDate(saved || null);
      setIsPastDue(!!savedPastDue);
    } catch (err) {
      setTargetDateError(err?.message || "Unable to update target date.");
    } finally {
      setTargetDateSubmitting(false);
    }
  };

  const handleDeleteSubtask = async (subtask) => {
    if (!task?.id || !subtask?.id) return;
    if (isCurrentTaskToReview) {
      setSubtaskError("Tasks in review can't be edited.");
      return;
    }
    const subtaskId = subtask.id;
    const previousSubtasks = localSubtasks;

    setSubtaskError("");
    setLocalSubtasks((prev) => prev.filter((item) => String(item?.id) !== String(subtaskId)));

    if (String(subtaskId).startsWith("temp-subtask-")) {
      setSubtaskPendingIds((prev) => {
        const next = { ...prev };
        delete next[subtaskId];
        return next;
      });
      return;
    }

    try {
      await deleteSubtask(task.id, subtaskId);
    } catch (error) {
      setSubtaskError(error?.message || "Failed to delete subtask");
      setLocalSubtasks(previousSubtasks);
    }
  };

 const handleToggleSubtask = async (subtask, event) => {
  if (event && typeof event.stopPropagation === "function") event.stopPropagation();
  if (isCurrentTaskToReview) {
    setSubtaskError("Tasks in review can't be edited.");
    return;
  }

  console.group(`[toggleSubtask] subtask id=${subtask?.id}`);
  console.log("1. subtask object received:", JSON.parse(JSON.stringify(subtask || {})));
  console.log("2. task.id:", task?.id);

  if (!task?.id || !subtask?.id) {
    console.warn("EARLY EXIT — missing task.id or subtask.id");
    console.groupEnd();
    return;
  }

  const subtaskId = subtask.id;
  const previousSubtasks = localSubtasks;

  const wasCompleted = subtask?.status === "finished" || subtask?.status === "completed" || !!subtask.completed;
  const nextStatus = wasCompleted ? "unfinished" : "finished";

  console.log("3. wasCompleted:", wasCompleted, "| current status:", subtask?.status, "| nextStatus:", nextStatus);

  setSubtaskError("");
  setSubtaskPendingIds((prev) => ({ ...prev, [subtaskId]: true }));
  setLocalSubtasks((prev) => prev.map((s) => (String(s?.id) === String(subtaskId) ? { ...s, status: nextStatus, isPending: true } : s)));

  if (String(subtaskId).startsWith("temp-subtask-")) {
    console.log("4. temp subtask — skipping API call");
    console.groupEnd();
    setSubtaskPendingIds((prev) => { const next = { ...prev }; delete next[subtaskId]; return next; });
    setLocalSubtasks((prev) => prev.map((s) => (String(s?.id) === String(subtaskId) ? { ...s, isPending: false } : s)));
    return;
  }

  try {
    console.log("4. calling updateSubtask with:", { taskId: task.id, subtaskId, payload: { status: nextStatus } });

    const resp = await updateSubtask(task.id, subtaskId, { status: nextStatus });

    console.log("5. raw resp from updateSubtask:", resp);
    console.log("   resp?.subtask:", resp?.subtask);
    console.log("   resp?.data:", resp?.data);
    console.log("   resp?.id:", resp?.id);
    console.log("   resp?.status:", resp?.status);
    console.log("   typeof resp:", typeof resp);
    console.log("   resp instanceof Response:", resp instanceof Response);

    const updated = resp?.subtask || resp?.data || resp || {};
    console.log("6. resolved `updated` object:", updated);
    console.log("   updated.status:", updated?.status);
    console.log("   updated.createdBy:", updated?.createdBy);

    setLocalSubtasks((prev) => prev.map((s) => {
      if (String(s?.id) !== String(subtaskId)) return s;
      const next = { ...s, ...updated, isPending: false };
      console.log("7. new subtask state:", next);
      return next;
    }));

  } catch (err) {
    console.error("5. CAUGHT ERROR in handleToggleSubtask:", err);
    console.error("   err.message:", err?.message);
    console.error("   err.status:", err?.status);
    console.error("   err.code:", err?.code);
    console.error("   full err object:", JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err))));
    setSubtaskError(err?.message || "Failed to update subtask");
    setLocalSubtasks(previousSubtasks);
  } finally {
    setSubtaskPendingIds((prev) => { const next = { ...prev }; delete next[subtaskId]; return next; });
    console.groupEnd();
  }
};

  const renderMemberRow = (member, index) => {
    const resolvedMemberId = getMemberId(member);
    const memberId = resolvedMemberId || `${index}-${getMemberLabel(member)}`;
    const isAssigned = resolvedMemberId ? localAssignedIds.includes(resolvedMemberId) : false;
    const isPending = resolvedMemberId ? assignmentPendingIds[resolvedMemberId] : false;
    const isCurrentUserRow = resolvedMemberId && String(resolvedMemberId) === String(currentUserIdValue);
    const canToggleSelf = isCurrentUserRow && (isAdminOrOwner || canMembersTakeTask) && !isCurrentTaskToReview;
    const canToggleOthers = !isCurrentUserRow && !isCurrentTaskToReview && (isAdminOrOwner || (canMembersTakeTask && canMembersAssignTaskToOthers));
    const roleLabel = member?.role || member?.projectRole || member?.project_role;
    const emailLabel = member?.email;

    return (
                <li key={memberId} className="tdm-project-member-row">
        <div className="tdm-member-main">
          {(() => {
            const src = normalizeProfileImage(member?.profileImageBase64 || member?.profile_image_base64);
            return src ? (
              <span className="tdm-member-avatar"><img src={src} alt={getMemberLabel(member)} /></span>
            ) : (
              <span className="tdm-member-avatar">{getInitials(member)}</span>
            );
          })()}
          <div className="tdm-member-text">
            <span className="tdm-member-name">{getMemberLabel(member)}</span>
            {(roleLabel || emailLabel) && (
              <span className="tdm-member-sub">
                {roleLabel ? capitalizeFirst(roleLabel) : ""}
                {roleLabel && emailLabel ? " • " : ""}
                {emailLabel || ""}
              </span>
            )}
          </div>
        </div>

        {(canToggleOthers || canToggleSelf) && (
          <button
            type="button"
            className={`tdm-assign-btn ${isAssigned ? "is-assigned" : ""}`}
            onClick={async () => {
              if (!resolvedMemberId || isPending) return;
              const previousAssigned = [...localAssignedIds];
              const shouldAssign = !isAssigned;
              try {
                setAssignmentError("");
                setAssignment(member, shouldAssign);
                setAssignmentPendingIds((prev) => ({ ...prev, [resolvedMemberId]: true }));

                if (isCurrentUserRow) {
                  if (shouldAssign) {
                    await takeSelfTask?.(task.id);
                  } else {
                    await unassignSelfTask?.(task.id);
                  }
                } else if (shouldAssign) {
                  await assignMemberToTask?.(task.id, member.id);
                } else {
                  await unassignMemberFromTask?.(task.id, member.id);
                }
                onAssign?.(taskData.id, member);

                setAssignmentPendingIds((prev) => {
                  const next = { ...prev };
                  delete next[resolvedMemberId];
                  return next;
                });
              } catch (err) {
                setLocalAssignedIds(previousAssigned);
                setAssignmentError(err?.message || "Failed to update task assignment.");
                setAssignmentPendingIds((prev) => {
                  const next = { ...prev };
                  if (resolvedMemberId) delete next[resolvedMemberId];
                  return next;
                });
              }
            }}
            disabled={isPending}
          >
            {isPending ? "Updating..." : (isCurrentUserRow ? (isAssigned ? "Assigned" : "Take") : (isAssigned ? "Assigned" : "Assign"))}
          </button>
        )}
      </li>
    );
  };

  const sortedComments = (comments || [])
    .slice()
    .sort((a, b) => new Date(a?.created_at || a?.createdAt) - new Date(b?.created_at || b?.createdAt));

  const sendIcon = <SendIcon className="tdm-send-icon" />;

  const commentsPanel = (
    <article className="tdm-section-card tdm-comments-panel">
      <div className="tdm-comments-body">
        {commentsError && <p className="tdm-comment-error">{commentsError}</p>}

        {commentsLoading ? (
          <div className="skeleton-list">
            <SkeletonCommentInline />
            <SkeletonCommentInline />
            <SkeletonCommentInline />
          </div>
        ) : (
          <div className="tdm-comments-list-wrap">
            <ul className="tdm-comment-list tdm-comments-list" aria-label="Comments">
              {sortedComments.length === 0 ? (
                <li className="tdm-comment-empty">No comments yet.</li>
              ) : (
                sortedComments.map((commentItem, index) => {
                  const commentUser = commentItem?.user || {};
                  const commentId = commentItem?.id || `${index}-comment`;
                  const timeLabel = formatTimeAgo(commentItem?.createdAt || commentItem?.created_at);
                  const replies = Array.isArray(commentItem?.replies) ? commentItem.replies : [];
                  const sortedReplies = replies
                    .slice()
                    .sort((a, b) => new Date(a?.created_at || a?.createdAt) - new Date(b?.created_at || b?.createdAt));

                  return (
                    <li key={commentId} className="tdm-comment-item">
                      <div className="tdm-comment-head">
                        {(() => {
                          const src = normalizeProfileImage(commentUser?.profileImageBase64 || commentUser?.profile_image_base64);
                          return src ? (
                            <span className="tdm-comment-avatar"><img src={src} alt={getMemberLabel(commentUser)} /></span>
                          ) : (
                            <span className="tdm-comment-avatar">{getInitials(commentUser)}</span>
                          );
                        })()}
                        <div className="tdm-comment-meta">
                          <div className="tdm-comment-name-row">
                            <span className="tdm-comment-name">{getMemberLabel(commentUser)}</span>
                            {commentUser?.role ? (
                              <span className="tdm-comment-role">{capitalizeFirst(commentUser.role)}</span>
                            ) : null}
                          </div>
                          {timeLabel && <span className="tdm-comment-time">{timeLabel}</span>}
                        </div>
                      </div>

                      <p className="tdm-comment-text">{commentItem?.comment || ""}</p>
                      {commentItem?.isPending && <span className="tdm-comment-pending">Posting...</span>}
                      <div className="tdm-comment-actions">
                        <button
                          type="button"
                          className="tdm-reply-toggle"
                          onClick={() => setActiveReplyId(activeReplyId === String(commentId) ? "" : String(commentId))}
                        >
                          Reply
                        </button>
                      </div>
                      {activeReplyId === String(commentId) && (
                        <div className="tdm-reply-form">
                          <input
                            type="text"
                            className="tdm-reply-input"
                            value={replyInputs[commentId] || ""}
                            onChange={(event) =>
                              setReplyInputs((prev) => ({ ...prev, [commentId]: event.target.value }))
                            }
                            placeholder="Write a reply"
                          />
                          <button
                            type="button"
                            className="tdm-reply-submit"
                            onClick={() => handleSubmitReply(commentId)}
                            disabled={replySubmittingId === String(commentId) || !(replyInputs[commentId] || "").trim()}
                          >
                            {replySubmittingId === String(commentId) ? "Posting..." : sendIcon}
                          </button>
                        </div>
                      )}

                      {sortedReplies.length > 0 && (
                        <ul className="tdm-replies" aria-label="Replies">
                          {sortedReplies.map((replyItem, replyIndex) => {
                            const replyUser = replyItem?.user || {};
                            const replyTimeLabel = formatTimeAgo(replyItem?.createdAt || replyItem?.created_at);
                            const replyKey = replyItem?.id || `${commentId}-reply-${replyIndex}`;

                            return (
                              <li key={replyKey} className="tdm-reply-item">
                                {(() => {
                                  const src = normalizeProfileImage(replyUser?.profileImageBase64 || replyUser?.profile_image_base64);
                                  return src ? (
                                    <span className="tdm-reply-avatar"><img src={src} alt={getMemberLabel(replyUser)} /></span>
                                  ) : (
                                    <span className="tdm-reply-avatar">{getInitials(replyUser)}</span>
                                  );
                                })()}
                                <div className="tdm-reply-body">
                                  <div className="tdm-reply-name-row">
                                    <span className="tdm-reply-name">{getMemberLabel(replyUser)}</span>
                                    {replyUser?.role ? (
                                      <span className="tdm-reply-role">{capitalizeFirst(replyUser.role)}</span>
                                    ) : null}
                                  </div>
                                  {replyTimeLabel && <span className="tdm-reply-time">{replyTimeLabel}</span>}
                                  <p className="tdm-reply-text">{replyItem?.commentReply || replyItem?.comment_reply || ""}</p>
                                  {replyItem?.isPending && <span className="tdm-reply-pending">Posting...</span>}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="tdm-comments-composer">
        <div className="tdm-comments-composer-card">
          <textarea
            className="tdm-comment-textarea"
            rows={2}
            value={newComment}
            onChange={(event) => setNewComment(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmitComment();
              }
            }}
            placeholder="Share an update or ask a question"
          />
          <div className="tdm-comments-composer-actions">
            <button
              type="button"
              className="tdm-comment-submit"
              onClick={handleSubmitComment}
              disabled={commentSubmitting || !newComment.trim()}
            >
              {commentSubmitting ? "Posting..." : sendIcon}
            </button>
          </div>
        </div>
      </div>
    </article>
  );

  const activitiesPanel = (
    <article className="tdm-section-card tdm-activities-panel">
      <div className="tdm-activities-body">
        {activitiesError && <p className="tdm-comment-error">{activitiesError}</p>}

        {activitiesLoading ? (
          <div className="skeleton-list">
            <SkeletonRow showAvatar={false} lineCount={3} />
            <SkeletonRow showAvatar={false} lineCount={2} />
          </div>
        ) : (
          <div className="tdm-activities-list-wrap">
            {Array.isArray(activities) && activities.length > 0 ? (
              <ul className="tdm-review-list" aria-label="Activity">
                {activities.map((activity, idx) => {
                  const actor = activity?.actor || {};
                  const displayName = activity?.actorName || getMemberLabel(actor);
                  const activityType = activity?.activityType || activity?.activity_type || "";
                  const isApproved = activityType === "review_approved";
                  const isRejected = activityType === "review_rejected";
                  const timeLabel = formatTimeAgo(activity?.createdAt || activity?.created_at);
                  const message = formatActivityMessage(activity);

                  return (
                    <li key={activity.id || idx} className="tdm-review-row">
                      <div className="tdm-review-icon">
                        {(() => {
                          const memberFromProject = (projectMembers || []).find((m) => String(m?.id || m?.userId || m?.user_id || "") === String(activity?.actorId || activity?.actor_id || ""));
                          const memberImg =
                            memberFromProject?.profileImageBase64 ||
                            memberFromProject?.profile_image_base64 ||
                            memberFromProject?.avatar ||
                            memberFromProject?.avatarUrl ||
                            memberFromProject?.imageUrl ||
                            memberFromProject?.profileImage ||
                            memberFromProject?.profile_image;

                          const avatarSrc = normalizeProfileImage(
                            memberImg ||
                              actor?.profileImageBase64 ||
                              actor?.profile_image_base64 ||
                              actor?.avatar ||
                              actor?.avatarUrl ||
                              actor?.imageUrl ||
                              actor?.profileImage ||
                              actor?.profile_image
                          );
                          return avatarSrc ? (
                            <span className="tdm-review-avatar"><img src={avatarSrc} alt={displayName} /></span>
                          ) : (
                            <span className="tdm-review-avatar" aria-label={displayName}>{getInitials(memberFromProject || actor)}</span>
                          );
                        })()}
                      </div>
                      <div className="tdm-review-meta">
                        <div className="tdm-review-modal-name">
                          <strong>{displayName}</strong>
                        </div>
                        <div className="tdm-review-modal-time">{timeLabel}</div>
                        <div className="tdm-review-comment">{message}</div>
                      </div>
                      {(isApproved || isRejected) ? (
                        <div className="tdm-review-action-col">
                          {isApproved ? (
                            <span className="tdm-review-action-badge tdm-review-action-badge--approved">Approved</span>
                          ) : (
                            <span className="tdm-review-action-badge tdm-review-action-badge--rejected">Rejected</span>
                          )}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="tdm-empty-state">No activity yet.</div>
            )}
          </div>
        )}
      </div>
    </article>
  );

  const canDeleteAttachment = (file) => {
    if (canManageAdminTaskActions) return true;
    return currentUserIdValue && String(file?.created_by || file?.createdBy || "") === String(currentUserIdValue);
  };

  const totalAttachmentSize = useMemo(
    () => attachments.reduce((total, file) => total + Number(file?.file_size || 0), 0),
    [attachments]
  );

  const attachmentsPanel = (
    <article className="tdm-section-card tdm-attachments-panel">
      <div className="tdm-attachments-toolbar">
        <input
          ref={attachmentInputRef}
          type="file"
          className="tdm-attachment-input"
          accept={TASK_FILE_ACCEPT}
          onChange={handleSelectAttachment}
          disabled={!canUploadAttachments || attachmentUploading}
        />
        <button
          type="button"
          className="tdm-attachment-upload-btn"
          onClick={() => attachmentInputRef.current?.click()}
          disabled={!canUploadAttachments || attachmentUploading}
        >
          {attachmentUploading ? "Uploading..." : "Upload file"}
        </button>
      </div>
      <div className="tdm-attachments-body">
        {attachmentsError && <p className="tdm-comment-error">{attachmentsError}</p>}
        {attachmentsLoading ? (
          <div className="skeleton-list">
            <SkeletonRow showAvatar={false} lineCount={2} />
            <SkeletonRow showAvatar={false} lineCount={2} />
          </div>
        ) : attachments.length === 0 ? (
          <div className="tdm-empty-state">No attachments yet.</div>
        ) : (
          <ul className="tdm-attachment-list" aria-label="Attachments">
            {attachments.map((file) => {
              const fileName = getAttachmentFileName(file);
              const canPreview = isPreviewSupported(file);
              const isDeleting = String(deletingAttachmentId) === String(file?.id);
              const typeInfo = getAttachmentTypeInfo(file);
              const uploaderName = getAttachmentUploaderName(file);

              return (
                <li key={file?.id || `${fileName}-${file?.created_on}`} className="tdm-attachment-row">
                  <div className={`tdm-attachment-icon tdm-attachment-icon--${typeInfo.tone}`} aria-hidden="true">
                    {typeInfo.label}
                  </div>
                  <button
                    type="button"
                    className="tdm-attachment-meta"
                    onClick={() => canPreview && setPreviewFile(file)}
                    disabled={!canPreview}
                    title={canPreview ? `Preview ${fileName}` : `${fileName} cannot be previewed`}
                  >
                    <strong title={fileName}>{fileName}</strong>
                    <span className="tdm-attachment-detail-row">
                      <span>{formatFileSize(file?.file_size)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatAttachmentDate(file?.created_on)}</span>
                      <span className={`tdm-attachment-type-badge tdm-attachment-type-badge--${typeInfo.tone}`}>{typeInfo.label}</span>
                    </span>
                  </button>
                  <div className="tdm-attachment-actions">
                    <a href={file?.download_url || file?.url} target="_blank" rel="noreferrer" download={fileName} aria-label={`Download ${fileName}`} title="Download">
                      <DownloadIcon size={18} />
                    </a>
                    {canDeleteAttachment(file) && (
                      <>
                        <span className="tdm-attachment-action-divider" aria-hidden="true" />
                        <button type="button" className="tdm-attachment-delete" onClick={() => handleDeleteAttachment(file)} disabled={isDeleting} aria-label={`Delete ${fileName}`} title={isDeleting ? "Deleting" : "Delete"}>
                          <TrashIcon size={18} />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="tdm-attachment-footer">
                    <span>Uploaded by {uploaderName}</span>
                    <span>{formatFileSize(file?.file_size)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {attachments.length > 0 && (
          <div className="tdm-attachments-footer">
            Total size: {formatFileSize(totalAttachmentSize)}
          </div>
        )}
      </div>
    </article>
  );

  return (
    <div className="tdm-modal">
      {!asPage && (
        <header className="tdm-header">
          <div className="tdm-header-text">
            <h2>Task Details</h2>
            <p>Review task information and manage assignee view.</p>
          </div>
          <div className="tdm-header-actions">
            <button type="button" className="tdm-close-btn" onClick={onClose} aria-label="Close task details">
              &times;
            </button>
          </div>
        </header>
      )}

      {asPage && (
        <div className="tdm-mobile-stack">
          <header className="tdm-mobile-header">
            <div className="tdm-mobile-breadcrumb-bar">
              <nav className="tdm-mobile-breadcrumb" aria-label="Task breadcrumb">
                <span>Projects</span>
                <span aria-hidden="true">›</span>
                <span>{mobileProjectName}</span>
                <span aria-hidden="true">›</span>
                <strong>{taskTitle || taskData.title || "Untitled task"}</strong>
              </nav>
              <button type="button" className="tdm-mobile-back-btn" onClick={onClose} aria-label="Go back">
                ‹
              </button>
            </div>

            <div className="tdm-mobile-title-row">
              <h1>{taskTitle || taskData.title || "Untitled task"}</h1>
              {canOpenTaskActionsMenu && (
                <div className="task-actions-wrap tdm-mobile-actions-wrap">
                  <button
                    type="button"
                    className="task-more-btn tdm-mobile-more-btn"
                    onClick={() => setMenuOpen((prev) => !prev)}
                    aria-expanded={menuOpen}
                    aria-haspopup="true"
                    title="More actions"
                    ref={menuButtonRef}
                  >
                    ⋯
                  </button>
                  {menuOpen && (
                    <div className="task-dropdown tdm-mobile-task-dropdown" ref={dropdownRef} role="dialog" aria-label="Task actions">
                      <button
                        type="button"
                        className="task-dropdown-item"
                        onClick={() => { setMenuOpen(false); setShowReviewModal(true); }}
                      >
                        Review history
                      </button>
                      <button
                        type="button"
                        className="task-dropdown-item"
                        onClick={() => { setMenuOpen(false); setShowAssigneesModal(true); }}
                      >
                        Assignees
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="tdm-mobile-description">{taskDesc || taskData.description || "No description provided."}</p>
            <div className="tdm-mobile-badges" aria-label="Task summary">
              <span className={`tdm-mobile-badge tdm-mobile-badge--priority tdm-priority-${taskPriority}`}>
                {capitalizeFirst(taskPriority)}
              </span>
              <span className={`tdm-mobile-badge tdm-mobile-badge--status is-${mobileStatusKey}`}>
                {mobileStatusLabel}
              </span>
              <span className={`tdm-mobile-badge tdm-mobile-badge--target${targetDate ? "" : " is-empty"}`}>
                <CalendarIcon size={13} />
                {formatTargetDate(targetDate)}
              </span>
            </div>
          </header>

          <article className="tdm-mobile-card tdm-mobile-details-card">
            <div className="tdm-mobile-card-header">
              <h2>Details</h2>
            </div>
            <div className="tdm-mobile-meta-grid">
              <label className="tdm-mobile-meta-cell">
                <span>Priority</span>
                <select
                  value={taskPriority}
                  onChange={(event) => handleUpdateTaskPriority(event.target.value)}
                  disabled={prioritySubmitting || !canEditTaskDetails}
                >
                  {TASK_PRIORITY_OPTIONS.map((priorityOption) => (
                    <option key={priorityOption} value={priorityOption}>
                      {capitalizeFirst(priorityOption)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="tdm-mobile-meta-cell">
                <span>Status</span>
                <select
                  value={taskCategoryId || ""}
                  onChange={(event) => handleUpdateTaskCategory(event.target.value)}
                  disabled={taskCategorySubmitting || !canChangeTaskCategory || (Array.isArray(taskCategories) && taskCategories.length === 0)}
                >
                  <option value="" disabled>Select status</option>
                  {taskMenuStatusOptions
                    .filter((statusOption) => statusOption.key !== "cancelled")
                    .map((statusOption) => (
                      <option key={statusOption.key} value={statusOption.categoryId} disabled={statusOption.disabled}>
                        {statusOption.label}
                      </option>
                    ))}
                </select>
              </label>
              <div className="tdm-mobile-meta-cell">
                <span>Created</span>
                <strong>{getCreatedAtLabel(taskData)}</strong>
              </div>
              <div className="tdm-mobile-meta-cell">
                <span>Target date</span>
                <strong className={targetDate ? "" : "is-muted"}>{formatTargetDate(targetDate)}</strong>
              </div>
            </div>
          </article>

          <article className="tdm-mobile-card">
            <div className="tdm-mobile-card-header">
              <h2>Assignees</h2>
              <button type="button" className="tdm-mobile-header-action" onClick={() => setShowAssigneesModal(true)}>
                + Add
              </button>
            </div>
            {assignees.length === 0 ? (
              <p className="tdm-mobile-empty">No assignees yet</p>
            ) : (
              <ul className="tdm-mobile-assignee-list">
                {assignees.map((member, index) => (
                  <li key={getMemberId(member) || index} className="tdm-mobile-assignee-row">
                    {(() => {
                      const src = normalizeProfileImage(member?.profileImageBase64 || member?.profile_image_base64);
                      return src ? (
                        <span className="tdm-mobile-avatar"><img src={src} alt={getMemberLabel(member)} /></span>
                      ) : (
                        <span className="tdm-mobile-avatar">{getInitials(member)}</span>
                      );
                    })()}
                    <span>
                      <strong>{getMemberLabel(member)}</strong>
                      <small>{member?.email || "No email"}</small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="tdm-mobile-card">
            <div className="tdm-mobile-card-header">
              <h2>Subtasks</h2>
              {!isCurrentTaskToReview && (canManageAdminTaskActions || createSubtasks) && (
                <button type="button" className="tdm-mobile-header-action" onClick={() => setShowAddSubtask(true)}>
                  + New
                </button>
              )}
            </div>
            {showAddSubtask && (
              <div className="tdm-mobile-subtask-composer">
                <input
                  ref={newSubtaskInputRef}
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(event) => setNewSubtaskTitle(event.target.value)}
                  placeholder="New subtask title"
                  onKeyDown={async (event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      await handleCreateSubtask();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setNewSubtaskTitle("");
                      setShowAddSubtask(false);
                    }
                  }}
                />
                <button type="button" onClick={handleCreateSubtask}>Add</button>
              </div>
            )}
            {localSubtasks.length === 0 ? (
              <p className="tdm-mobile-empty">No subtasks yet</p>
            ) : (
              <ul className="tdm-mobile-subtask-list">
                {localSubtasks.map((st, index) => {
                  const isCompleted = st?.status === "finished" || st?.status === "completed" || !!st.completed;
                  return (
                    <li key={st.id || `${index}-${st.title || st}`} className="tdm-mobile-subtask-row">
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={(event) => handleToggleSubtask(st, event)}
                        disabled={isCurrentTaskToReview}
                        aria-label={`Mark ${st.title || "subtask"} completed`}
                      />
                      <span>{st.title || String(st)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>

          <article className="tdm-mobile-card tdm-mobile-tabs-card">
            <div className="tdm-mobile-tabs" role="tablist" aria-label="Task side tabs">
              <button type="button" className={sidebarTab === "comments" ? "is-active" : ""} onClick={() => setSidebarTab("comments")}>Comments</button>
              <button type="button" className={sidebarTab === "activity" ? "is-active" : ""} onClick={() => setSidebarTab("activity")}>Activity</button>
              <button type="button" className={sidebarTab === "attachments" ? "is-active" : ""} onClick={() => setSidebarTab("attachments")}>Attachments</button>
            </div>
            <div className="tdm-mobile-tab-panel">
              {sidebarTab === "comments" && commentsPanel}
              {sidebarTab === "activity" && activitiesPanel}
              {sidebarTab === "attachments" && attachmentsPanel}
            </div>
          </article>

          {canDeleteCurrentTask && (
            <article className="tdm-mobile-card tdm-mobile-remove-card">
              <button type="button" className="tdm-mobile-remove-row" onClick={openDeleteConfirm} disabled={deleteTaskSubmitting}>
                <TrashIcon size={18} />
                <span>Remove task</span>
              </button>
            </article>
          )}
        </div>
      )}

      <div className="tdm-grid">
        <section className="tdm-main-column">
          <div className="tdm-task-shell">
            <article className="tdm-section-card tdm-focus-card">
              <div className="tdm-section-header">
                <h3 className="tdm-task-title-label">Task</h3>
                <div className="task-actions-wrap">

                {canOpenTaskActionsMenu && (
                  <button
                    className="task-more-btn"
                    onClick={() => setMenuOpen(prev => !prev)}
                    aria-expanded={menuOpen}
                    aria-haspopup="true"
                    title="More actions"
                    ref={menuButtonRef}
                  >
                    ⋯
                  </button>
                )}

                {menuOpen && (
                  <div
                    className="task-dropdown"
                    ref={dropdownRef}
                    role="dialog"
                    aria-label="Task actions"
                  >
                    <div className="dropdown-row dropdown-row--select">
                      <div className="dropdown-label-row">
                        <span className="dropdown-label-dot" aria-hidden="true" />
                        <span className="dropdown-label-text">Priority</span>
                      </div>
                      <select
                        id={`task-priority-${taskData.id || "unknown"}`}
                        className="tdm-menu-select"
                        value={taskPriority}
                        onChange={(event) => handleUpdateTaskPriority(event.target.value)}
                        disabled={prioritySubmitting || !canEditTaskDetails}
                      >
                        {TASK_PRIORITY_OPTIONS.map((priorityOption) => (
                          <option key={priorityOption} value={priorityOption}>
                            {capitalizeFirst(priorityOption)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="dropdown-row dropdown-row--select">
                      <div className="dropdown-label-row">
                        <span className="dropdown-label-dot" aria-hidden="true" />
                        <span className="dropdown-label-text">Status</span>
                      </div>
                      <select
                        id={`task-category-${taskData.id || "unknown"}`}
                        className="tdm-menu-select"
                        value={taskCategoryId || ""}
                        onChange={(event) => handleUpdateTaskCategory(event.target.value)}
                        disabled={taskCategorySubmitting || !canChangeTaskCategory || (Array.isArray(taskCategories) && taskCategories.length === 0)}
                        aria-invalid={!!taskCategoryError}
                        title={taskCategoryError || ""}
                      >
                        <option value="" disabled>
                          Select status
                        </option>
                        {taskMenuStatusOptions.map((statusOption) => (
                          <option key={statusOption.key} value={statusOption.categoryId} disabled={statusOption.disabled}>
                            {statusOption.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="task-dropdown-divider" />

                    <div className="dropdown-row dropdown-row--date">
                      <div className="dropdown-label-row">
                        <span className="dropdown-label-dot" aria-hidden="true" />
                        <span className="dropdown-label-text">Set target date</span>
                      </div>
                      <input
                        ref={taskTargetDateRef}
                        type="date"
                        className="tdm-menu-date-input"
                        value={toDateInputValue(targetDate)}
                        onChange={(event) => {
                          const next = event.target.value || null;
                          handleUpdateTargetDate(next);
                        }}
                        disabled={targetDateSubmitting || !canEditTaskDetails}
                      />
                    </div>

                    <button
                      type="button"
                      className="task-dropdown-item"
                      onClick={() => { setMenuOpen(false); setShowReviewModal(true); }}
                    >
                      Review history
                    </button>

                    <button
                      type="button"
                      className="task-dropdown-item"
                      onClick={() => { setMenuOpen(false); setShowAssigneesModal(true); }}
                    >
                      Assignees
                    </button>

                    <div className="task-dropdown-divider" />

                    {(currentUserRole === "member" ? canMembersDeleteTask : canManageAdminTaskActions) && onDeleteTask && (
                      <button
                        type="button"
                        className="task-dropdown-item task-dropdown-item--danger"
                        onClick={openDeleteConfirm}
                        disabled={deleteTaskSubmitting}
                        title={deleteTaskError || "Remove task"}
                      >
                        Remove task
                      </button>
                    )}
                  </div>
                )}
                </div>
              </div>

            {/* review UI moved to dropdown; rejected label will render below tags */}
            <div className="tdm-task-title-row">
              <h4
                ref={taskTitleRef}
                className={`tdm-task-title${isEditingTaskTitle ? " is-editing" : ""}`}
                contentEditable={isEditingTaskTitle}
                suppressContentEditableWarning
                role="textbox"
                aria-label="Task name"
                onInput={(event) => setTaskTitleDraft(event.currentTarget.textContent || "")}
                onKeyDown={handleTaskTitleKeyDown}
                onClick={() => canEditTaskDetails && !isEditingTaskTitle && beginEditTaskTitle()}
              >
                {isEditingTaskTitle ? null : (taskTitle || taskData.title || "Untitled task")}
              </h4>
              {canEditTaskDetails && isEditingTaskTitle && (
                <div className="tdm-inline-edit-actions">
                  <button
                    type="button"
                    className="tdm-inline-edit-action-btn tdm-inline-edit-save"
                    onClick={saveTaskTitle}
                    disabled={taskTitleSaving}
                    title="Save task name"
                    aria-label="Save task name"
                  >
                    <SaveIcon />
                  </button>
                  <button
                    type="button"
                    className="tdm-inline-edit-action-btn tdm-inline-edit-cancel"
                    onClick={cancelEditTaskTitle}
                    title="Cancel editing task name"
                    aria-label="Cancel editing task name"
                  >
                    <CancelIcon />
                  </button>
                </div>
              )}
            </div>
            {taskTitleError && <p className="tdm-inline-edit-error">{taskTitleError}</p>}
            <div className="tdm-task-desc-row">
              <p
                ref={taskDescRef}
                className={`tdm-task-description tdm-task-description-editable${isEditingTaskDesc ? " is-editing" : ""}`}
                contentEditable={isEditingTaskDesc}
                suppressContentEditableWarning
                role="textbox"
                aria-label="Task description"
                onInput={(event) => setTaskDescDraft(event.currentTarget.textContent || "")}
                onKeyDown={handleTaskDescKeyDown}
                onClick={() => canEditTaskDetails && !isEditingTaskDesc && beginEditTaskDesc()}
              >
                {isEditingTaskDesc ? null : (taskDesc || taskData.description || "No description provided.")}
              </p>
              {canEditTaskDetails && isEditingTaskDesc && (
                <div className="tdm-inline-edit-actions">
                  <button
                    type="button"
                    className="tdm-inline-edit-action-btn tdm-inline-edit-save"
                    onClick={saveTaskDesc}
                    disabled={taskDescSaving}
                    title="Save task description"
                    aria-label="Save task description"
                  >
                    <SaveIcon />
                  </button>
                  <button
                    type="button"
                    className="tdm-inline-edit-action-btn tdm-inline-edit-cancel"
                    onClick={cancelEditTaskDesc}
                    title="Cancel editing task description"
                    aria-label="Cancel editing task description"
                  >
                    <CancelIcon />
                  </button>
                </div>
              )}
            </div>
            {taskDescError && <p className="tdm-inline-edit-error">{taskDescError}</p>}
            <div className="tdm-meta-grid">
              <div className="tdm-meta-item">
                <span className="tdm-meta-label">Created</span>
                <span className="tdm-meta-value tdm-meta-mono">{getCreatedAtLabel(taskData)}</span>
              </div>
              <div className="tdm-meta-item">
                <span className="tdm-meta-label">Target date</span>
                <span className={`tdm-meta-value tdm-meta-mono${isPastDue ? " is-overdue" : ""}`}>
                  {formatTargetDate(targetDate)}
                </span>
                {isPastDue ? <span className="tdm-meta-badge">Overdue</span> : null}
                {targetDateSubmitting ? <span className="tdm-meta-note">Updating...</span> : null}
              </div>
            </div>
            {targetDateError && <p className="tdm-target-error">{targetDateError}</p>}
            <div className="tdm-tags-area">
              <span className="tdm-tags-label">Tags:</span>
              <div className="tdm-tag-list">
                {(tags || []).map((t) => (
                  <span key={t.id || t.tagName} className="tdm-tag">
                    <span className="tdm-tag-name">{t.tagName || t.tag_name}</span>
                    {t?.isPending && <span className="tdm-tag-pending">Saving...</span>}
                    {canManageTags && !isCurrentTaskToReview && (
                      <button
                        type="button"
                        className="tdm-tag-remove"
                        onClick={() => handleDeleteTag(t)}
                        disabled={deletingTagId === t.id || t?.isPending}
                        aria-label={`Remove tag ${t.tagName || t.tag_name}`}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {canManageTags && !isCurrentTaskToReview && (
                <button type="button" className="tdm-manage-tags-btn" onClick={() => setShowTagsModal(true)}>
                  Add Tags
                </button>
              )}
              {canReview && (Array.isArray(taskCategories) ? taskCategories.find(c => String(c.id) === String(taskCategoryId) && String((c.name||c.name).toLowerCase()).includes('review')) : false) ? (
                <div className="tdm-review-actions">
                  <button type="button" className="tdm-approve-btn" onClick={openApproveModal}>Approve</button>
                  <button type="button" className="tdm-reject-btn" onClick={openRejectModal}>Reject</button>
                </div>
              ) : null}
            </div>

            {/* Latest review feedback removed from main card (moved to Activity/Review History) */}

            {/* <div className="tdm-priority-area">
              <label htmlFor={`task-priority-${taskData.id || "unknown"}`} className="tdm-priority-label">
                Priority: {capitalizeFirst(taskPriority)}
              </label>
            </div> */}
            {priorityError && <p className="tdm-priority-error">{priorityError}</p>}
            {prioritySubmitting && <p className="tdm-priority-pending">Updating...</p>}
            </article>

            <article className="tdm-section-card tdm-subtasks-shell">
              <div className="tdm-subtasks-header">
                <h3>Subtasks</h3>
              </div>
              {showAddSubtask ? (
                <div className="tdm-subtask-actions">
                  <div className="tdm-subtask-row tdm-subtask-row--composer">
                    <div className="tdm-subtask-left" />
                    <div className="tdm-subtask-main">
                      <div className="tdm-subtask-title-row">
                        <input
                          ref={newSubtaskInputRef}
                          type="text"
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          placeholder="New subtask title"
                          className="tdm-subtask-input"
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              await handleCreateSubtask();
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              setNewSubtaskTitle("");
                              setShowAddSubtask(false);
                            }
                          }}
                        />
                        <div className="tdm-subtask-action-buttons">
                          <button
                            type="button"
                            className="tdm-inline-edit-action-btn tdm-inline-edit-save"
                            onClick={async () => { await handleCreateSubtask(); }}
                            aria-label="Save subtask"
                            title="Save"
                          >
                            <SaveIcon />
                          </button>
                          <button
                            type="button"
                            className="tdm-inline-edit-action-btn tdm-inline-edit-cancel"
                            onClick={() => { setNewSubtaskTitle(""); setShowAddSubtask(false); }}
                            aria-label="Cancel"
                            title="Cancel"
                          >
                            <CancelIcon />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                !isCurrentTaskToReview && (canManageAdminTaskActions || createSubtasks) && (
                  <button
                    type="button"
                    className="tdm-subtask-add-row"
                    onClick={() => setShowAddSubtask(true)}
                  >
                    <span className="tdm-subtask-index"></span>
                    <span>+ New Subtask</span>
                  </button>
                )
              )}
              {subtaskError && <p className="tdm-subtask-error">{subtaskError}</p>}
              {localSubtasks.length === 0 ? (
                <p className="tdm-subtasks-empty">No subtasks added.</p>
              ) : (
                <ul className="tdm-subtasks-list">
                  {localSubtasks.map((st, idx) => {
                    const createdByLabelName = st?.createdBy?.firstName + ' ' + st?.createdBy?.lastName || "Unknown";
                    const createdAtLabel = st?.createdAt ? new Date(st.createdAt).toLocaleString() : "";
                    const isCompleted = st?.status === "finished" || st?.status === "completed" || !!st.completed;
                    const isPending = subtaskPendingIds[String(st?.id)] || st?.isPending;

                    return (
                      <li
                        key={st.id || `${idx}-${st.title || st}` }
                        className={`tdm-subtask-row${isCompleted ? " is-complete" : ""}`}
                      >
                        <div className="tdm-subtask-left">
                          <input
                            type="checkbox"
                            className="tdm-subtask-checkbox"
                            checked={isCompleted}
                            onChange={(e) => { e.stopPropagation(); handleToggleSubtask(st, e); }}
                            onClick={(e) => e.stopPropagation()}
                            disabled={isCurrentTaskToReview || isPending}
                            aria-label={`Mark ${st.title || 'subtask'} completed`}
                          />
                        </div>

                        <div className="tdm-subtask-main">
                          <div className="tdm-subtask-title-row">
                            <span className="tdm-subtask-index">{idx + 1}.</span>
                            <div className="tdm-subtask-title">{st.title || String(st)}</div>
                          </div>

                          <button
                              type="button"
                              className="tdm-subtask-delete-btn"
                              onClick={(e) => { e.stopPropagation(); handleDeleteSubtask(st); }}
                              disabled={isCurrentTaskToReview || isPending}
                              aria-label="Delete subtask"
                              title="Delete"
                            >
<TrashIcon />



                            </button>
                    
                          <div className="tdm-subtask-meta">
                            <span className="tdm-subtask-created-label">Created by: </span>
                            <span className="tdm-subtask-created-by">{createdByLabelName}</span>
                            {createdAtLabel ? <span className="tdm-subtask-created-at"> <b>On: </b> {createdAtLabel}</span> : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

            </article>
          </div>

          

          {/* <article className="tdm-section-card">
            <h3>Assigned Members</h3>
            {displayedAssignedMembers.length === 0 ? (
              <p>No assigned members.</p>
            ) : (
              <ul className="tdm-member-chip-list">
                {displayedAssignedMembers.map((member, index) => (
                  <li key={getMemberId(member) || `${index}-${getMemberLabel(member)}`} className="tdm-member-chip">
                    <span className="tdm-chip-avatar">{getInitials(member)}</span>
                    <span>{getMemberLabel(member)}</span>
                  </li>
                ))}
              </ul>
            )}
          </article> */}
        </section>

        <aside className="tdm-side-column">
          <div className="tdm-sidebar-tabs" role="tablist" aria-label="Task side tabs">
            <button
              type="button"
              className={`friends-tab ${sidebarTab === "comments" ? "active" : ""}`}
              onClick={() => setSidebarTab("comments")}
            >
              Comments
            </button>

            <button
              type="button"
              className={`friends-tab ${sidebarTab === "activity" ? "active" : ""}`}
              onClick={() => setSidebarTab("activity")}
            >
              Activity
            </button>

            <button
              type="button"
              className={`friends-tab ${sidebarTab === "attachments" ? "active" : ""}`}
              onClick={() => setSidebarTab("attachments")}
            >
              Attachments
            </button>
          </div>

          <div className="tdm-sidebar-panel">
            {sidebarTab === "comments" && commentsPanel}
            {sidebarTab === "activity" && activitiesPanel}
            {sidebarTab === "attachments" && attachmentsPanel}
          </div>
        </aside>
      </div>
      {maybePortal(
        previewFile && (
          <div
            className="tdm-file-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Attachment preview"
            onClick={(event) => {
              if (event.target === event.currentTarget) setPreviewFile(null);
            }}
          >
            <div className="tdm-file-preview-content">
              <div className="tdm-file-preview-header">
                <div>
                  <h3>{getAttachmentFileName(previewFile)}</h3>
                  <p>{formatFileSize(previewFile?.file_size)} · {formatAttachmentDate(previewFile?.created_on)}</p>
                </div>
                <div className="tdm-file-preview-actions">
                  <a href={previewFile?.download_url || previewFile?.url} target="_blank" rel="noreferrer" download={getAttachmentFileName(previewFile)}>
                    Download
                  </a>
                  <button type="button" className="tdm-close-btn" onClick={() => setPreviewFile(null)} aria-label="Close attachment preview">
                    &times;
                  </button>
                </div>
              </div>
              <FilePreview file={previewFile} />
            </div>
          </div>
        )
      )}
      {maybePortal(
        showAssigneesModal && (
          <div
            className="tdm-assignees-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => {
              if (event.target === event.currentTarget) setShowAssigneesModal(false);
            }}
          >
            <div className="tdm-assignees-content">
              <div className="tdm-assignees-header">
                <div>
                  <h3>Task Assignees</h3>
                  <p>Assign or review people working on this task.</p>
                </div>
                <button
                  type="button"
                  className="tdm-close-btn tdm-assignees-close"
                  onClick={() => setShowAssigneesModal(false)}
                  aria-label="Close assignees"
                >
                  &times;
                </button>
              </div>

              <div className="tdm-assignees-section">
                <label htmlFor="assigneeSearch" className="tdm-assignees-title">Search</label>
                <input
                  id="assigneeSearch"
                  type="text"
                  className="tdm-input"
                  placeholder="Search by name or email"
                  value={assigneeSearch}
                  onChange={(event) => setAssigneeSearch(event.target.value)}
                />
              </div>

              {assignmentError && <p className="tdm-assign-error">{assignmentError}</p>}

              {memberPool.length === 0 ? (
                <p className="tdm-assignees-empty">No project members available.</p>
              ) : (
                <div className="tdm-assignees-body">
                  <div className="tdm-assignees-section">
                    <div className="tdm-assignees-title">Project Owner</div>
                    {ownerMembers.length === 0 ? (
                      <p className="tdm-assignees-empty">No matching owners.</p>
                    ) : (
                      <ul className="tdm-project-members-list">
                        {ownerMembers.map(renderMemberRow)}
                      </ul>
                    )}
                  </div>

                  <div className="tdm-assignees-divider" />

                  <div className="tdm-assignees-section">
                    <div className="tdm-assignees-title">Project Members</div>
                    {nonOwnerMembers.length === 0 ? (
                      <p className="tdm-assignees-empty">No matching members.</p>
                    ) : (
                      <ul className="tdm-project-members-list">
                        {nonOwnerMembers.map(renderMemberRow)}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}
      {maybePortal(
        showTagsModal && (
          <div
            className="tdm-manage-tags-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowTagsModal(false);
            }}
          >
            <div className="tdm-manage-content">
              <div className="tdm-manage-header">
                <span className="tdm-manage-icon" aria-hidden="true">
                  <FilterIcon size={18} />
                </span>
                <div>
                  <h3>Manage Tags</h3>
                  <p className="tdm-manage-desc">
                    Categorize and filter tasks across the project.<br />
                    Add a new tag or choose from shared suggestions.
                  </p>
                </div>
              </div>
              {tagError && <p className="tdm-tag-error">{tagError}</p>}

              <div className="tdm-tag-composer">
                {canManageTags && !isCurrentTaskToReview && (
                  <div className="tdm-tag-input-wrap">
                    <span className="tdm-tag-search-icon" aria-hidden="true" />
                    <input
                      type="text"
                      placeholder="Type tag and press Enter"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          await handleAddTag(tagInput);
                        }
                      }}
                      className="tdm-input tdm-tag-input"
                    />
                  </div>
                )}

                <div className="tdm-tag-section-heading">
                  <span>Applied tags</span>
                  <span>{(tags || []).length} / 5</span>
                </div>
                <div className="tdm-current-tags">
                  {(tags || []).length === 0 ? (
                    <p className="tdm-no-current-tags">No tags applied yet</p>
                  ) : (
                    (tags || []).map((t) => {
                      const name = t?.tagName || t?.tag_name || t?.name || String(t);
                      const id = t?.id || name;
                      return (
                        <span key={id} className="tdm-tag tdm-current-tag">
                          <span className="tdm-tag-name">{name}</span>
                          {t?.isPending && <span className="tdm-tag-pending">Saving...</span>}
                          {canManageTags && !isCurrentTaskToReview && (
                            <button
                              type="button"
                              className="tdm-tag-remove"
                              onClick={() => handleDeleteTag(t)}
                              disabled={deletingTagId === t.id || t?.isPending}
                              aria-label={`Remove tag ${name}`}
                            >
                              ×
                            </button>
                          )}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="tdm-suggestions-array" aria-live="polite">
                <div className="tdm-tag-section-heading">
                  <span>Project suggestions</span>
                </div>
                <div className="tdm-suggestions-content tdm-suggestions-pills">
                  {(projectTagSuggestions || []).map((s) => {
                    const name = s?.tagName || s?.tag_name || s?.name || String(s);
                    const normName = String(name).replace(/\s+/g, " ").trim();
                    const key = s?.id || normName;
                    const alreadyApplied = (tags || []).some((tag) => {
                      const tagName = tag?.tagName || tag?.tag_name || tag?.name || String(tag);
                      return String(tagName).replace(/\s+/g, " ").trim().toLowerCase() === normName.toLowerCase();
                    });
                    if (!canManageTags || isCurrentTaskToReview) return null;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`tdm-suggestion-pill${alreadyApplied ? " is-applied" : ""}`}
                        onClick={() => handleAddTag(name)}
                        disabled={alreadyApplied}
                        title={`Add tag ${name}`}
                      >
                        <span aria-hidden="true">+</span>
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="tdm-tags-controls">
                <span className="tdm-tags-footer-hint">Tags are shared across the project</span>
                <button type="button" onClick={() => setShowTagsModal(false)} className="tdm-close-btn tdm-manage-close-bottom">
                  Done
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {maybePortal(
        showDeleteConfirm && (
          <div className="tdm-confirm-overlay" role="presentation" onClick={closeDeleteConfirm}>
            <div className="tdm-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-task-title" onClick={(event) => event.stopPropagation()}>
              <div className="tdm-confirm-title-row">
                <span className="tdm-confirm-icon" aria-hidden="true">
                  <TrashIcon />
                </span>
                <h3 id="delete-task-title">Delete this task?</h3>
              </div>
              <p>This will permanently remove the task and all of its activity. This cannot be undone.</p>

              <div className="tdm-confirm-actions">
                <button type="button" className="tdm-confirm-cancel" onClick={closeDeleteConfirm} disabled={deleteTaskSubmitting}>
                  Cancel
                </button>
                <button type="button" className="tdm-confirm-delete" onClick={confirmDeleteTask} disabled={deleteTaskSubmitting}>
                  {deleteTaskSubmitting ? "Deleting..." : "Delete Task"}
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {maybePortal(
        showApproveModal && (
          <div className="tdm-confirm-overlay" role="presentation" onClick={closeApproveModal}>
            <div
              className="tdm-confirm-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="approve-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="tdm-confirm-title-row">
                <h3 id="approve-title">Approve Task</h3>
              </div>
              <p>Please provide an approval note. This will be recorded in the review history.</p>
              <textarea
                id="tdm-approve-textarea"
                className="tdm-reject-textarea"
                value={approveReason}
                onChange={(e) => setApproveReason(e.target.value)}
                placeholder="Enter approval note"
                rows={4}
                autoComplete="off"
              />

              <div className="tdm-confirm-actions">
                <button type="button" className="tdm-confirm-cancel" onClick={closeApproveModal} disabled={approveSubmitting}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="tdm-confirm-approve"
                  onClick={handleSubmitApprove}
                  disabled={approveSubmitting}
                >
                  {approveSubmitting ? "Approving..." : "Approve Task"}
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {maybePortal(
        showRejectModal && (
          <div className="tdm-confirm-overlay" role="presentation" onClick={closeRejectModal}>
            <div
              className="tdm-confirm-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="reject-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="tdm-confirm-title-row">
                <h3 id="reject-title">Reject Task</h3>
              </div>
              <p>Please provide a reason for rejecting this task. This will be recorded in the review history.</p>
              <textarea
                id="tdm-reject-textarea"
                className="tdm-reject-textarea"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason"
                rows={4}
                autoComplete="off"
              />

              <div className="tdm-confirm-actions">
                <button type="button" className="tdm-confirm-cancel" onClick={closeRejectModal} disabled={rejectSubmitting}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="tdm-confirm-delete"
                  onClick={handleSubmitReject}
                  disabled={rejectSubmitting}
                >
                  {rejectSubmitting ? "Rejecting..." : "Reject Task"}
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {maybePortal(
        showReviewModal && (
          <div className="tdm-confirm-overlay" role="presentation" onClick={() => setShowReviewModal(false)}>
            <div className="tdm-confirm-modal tdm-review-modal" role="dialog" aria-modal="true" aria-labelledby="review-history-title" onClick={(e) => e.stopPropagation()}>
              <div className="tdm-confirm-title-row">
                <h3 id="review-history-title">Review History</h3>
              </div>
              {reviewsLoading ? (
                <div className="tdm-dropdown-note">Loading reviews...</div>
              ) : reviewsError ? (
                <div className="tdm-dropdown-note">{reviewsError}</div>
              ) : reviews.length === 0 ? (
                <div className="tdm-dropdown-note">No reviews yet.</div>
              ) : (
                <ul className="tdm-review-modal-list">
                  {reviews.map((r) => {
                    const actionNorm = getReviewEntryAction(r);
                    const commentText = getReviewEntryComment(r);
                    const isApproved = actionNorm === "approved";
                    return (
                      <li key={r.id} className="tdm-review-modal-item">
                        <div className="tdm-review-modal-header">
                          <div className="tdm-review-modal-icon">
                            {isApproved ? <ReviewApprovedIcon size={18} /> : <ReviewRejectedIcon size={18} />}
                          </div>
                          <div className="tdm-review-modal-info">
                            <div className="tdm-review-modal-name">
                              <strong>{r.reviewerName}</strong>
                              {r.reviewerRole && <span className="tdm-review-modal-role">{capitalizeFirst(r.reviewerRole)}</span>}
                            </div>
                          </div>
                          <div className="tdm-review-modal-time">{formatTimeAgo(r.createdAt)}</div>
                        </div>
                        {commentText ? (
                          <div
                            className={`tdm-review-modal-comment${isApproved ? " tdm-review-modal-comment--approved" : " tdm-review-modal-comment--rejected"}`}
                          >
                            {commentText}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="tdm-confirm-actions">
                <button type="button" className="tdm-confirm-cancel" onClick={() => setShowReviewModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}



export default function TaskDetailsModal({ onClose, ...props }) {
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const closeWithAnimation = () => {
    if (isClosing) return;
    setIsClosing(true);
    timerRef.current = setTimeout(() => {
      onClose?.();
    }, 220);
  };

  return (
    <div
      className={`tdm-overlay${isClosing ? " is-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Task details"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closeWithAnimation();
        }
      }}
    >
      <TaskDetailsContent {...props} onClose={closeWithAnimation} asPage={false} />
    </div>
  );
}
