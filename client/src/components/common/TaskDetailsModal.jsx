import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCurrentUser } from "../../services/authService";
import { getTaskReviews, approveTaskReview, rejectTaskReview, deleteSubtask, updateSubtask } from "../../services/projectService";
import { SkeletonCommentInline, SkeletonRow } from "./SkeletonComponents";
import { SendIcon, SaveIcon, CancelIcon, TrashIcon, ReviewApprovedIcon, ReviewRejectedIcon } from "./AppIcons";
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

  return parsedDate.toLocaleString();
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

function normalizeTaskPriority(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "critical") return "urgent";
  if (normalized === "unset") return "unset";
  if (TASK_PRIORITY_OPTIONS.includes(normalized)) return normalized;
  return "unset";
}

export function TaskDetailsContent({ asPage = false, currentUserId, task, isAdminOrOwner, createSubtasks, fetchTaskComments, addTaskComment, addTaskCommentReply, canMembersAssignTaskToOthers, canMembersTakeTask = false, canMembersReviewTasks = false, canMembersDeleteTask = false, canMembersCreateTag = false, canAdminsManageTasks = false, assignMemberToTask, unassignMemberFromTask, takeSelfTask, unassignSelfTask, projectMembers = [], onAssign, onClose, projectId, taskCategories = [], getProjectTags, getTaskTags, createTaskTag, deleteTaskTag, updateTaskName, updateTaskDescription, updateTaskPriority, updateTaskStatus, updateTaskTargetDate, onDeleteTask }) {
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
  const canEditTaskTitle = useMemo(() => {
    if (currentUserRole === "owner") return true;
    if (currentUserRole === "admin") return canAdminsManageTasks;
    if (!currentUserIdValue) return false;
    const creatorId = taskData?.createdBy || taskData?.created_by;
    if (creatorId && String(creatorId) === String(currentUserIdValue)) return true;
    return assignees.some((member) => String(member?.id || member?.user_id || "") === String(currentUserIdValue));
  }, [assignees, canAdminsManageTasks, currentUserIdValue, currentUserRole, taskData?.createdBy, taskData?.created_by]);
  const canManageAdminTaskActions = currentUserRole === "owner" || (currentUserRole === "admin" && canAdminsManageTasks);
  const canReview = isAdminOrOwner || currentUserRole === "manager" || (currentUserRole === "member" && canMembersReviewTasks);
  const canManageTags = isAdminOrOwner || (currentUserRole === "member" && canMembersCreateTag);
  const canChangeTaskCategory = canManageAdminTaskActions || currentUserRole === "manager" || (currentUserRole === "member" && isCurrentUserAssigned);

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
    if (!canManageAdminTaskActions && menuOpen) {
      setMenuOpen(false);
    }
  }, [canManageAdminTaskActions, menuOpen]);

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
    setTagError("");
    setTaskPriority(normalizeTaskPriority(task?.priority));
    setTargetDate(task?.targetDate || task?.target_date || null);
    setIsPastDue(!!(task?.isPastDue ?? task?.is_past_due));
    loadComments();
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
  }, [task?.id, loadComments, getTaskTags, task?.priority, task?.targetDate, task?.target_date, task?.isPastDue, task?.is_past_due, task?.tags]);

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

  const handleAddTag = async (tagName) => {
    const name = (tagName || tagInput || "").trim();
    if (!task?.id || !name) return;
    if (!canManageTags) {
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
    if (!canManageTags) {
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

    const currentCategoryName = String(task?.categoryName || "").trim().toLowerCase();
    const nextCategory = (taskCategories || []).find((cat) => String(cat?.id || "") === String(nextCategoryId || ""));
    const nextCategoryName = String(nextCategory?.name || "").trim().toLowerCase();
    const movingToDone = nextCategoryName === "done";
    const movingToToDo = nextCategoryName === "to_do" || nextCategoryName === "todo";
    const isFromTodo = currentCategoryName === "to_do" || currentCategoryName === "todo";
    const isFromInProgress = currentCategoryName === "in_progress" || currentCategoryName === "in progress";
    const isFromToReview = currentCategoryName === "to_review" || currentCategoryName === "to review";

    // Check permission rules for members
    if (!isAdminOrOwner && currentUserRole !== "manager") {
      // Rule 0: TODO and In Progress cannot move directly to Done
      if (movingToDone && (isFromTodo || isFromInProgress)) {
        setTaskCategoryError("Members cannot move tasks directly to Done. Tasks must be reviewed first.");
        return;
      }

      // Rule 1: Cannot move FROM in_progress TO done
      if (isFromInProgress && movingToDone) {
        setTaskCategoryError("Members cannot move tasks directly from In Progress to Done. Tasks must be reviewed first.");
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

    // If selecting TODO or DONE from the dropdown, prompt for approval/rejection first
    if (movingToDone || movingToToDo) {
      // close the menu and show the appropriate modal to collect a review note
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
    const isToReview = String(taskData?.categoryName || taskData?.category_name || "").toLowerCase().includes("review");
    const canToggleSelf = isCurrentUserRow && (isAdminOrOwner || canMembersTakeTask) && !isToReview;
    const canToggleOthers = !isCurrentUserRow && (isAdminOrOwner || (canMembersTakeTask && canMembersAssignTaskToOthers));
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

  const [sidebarTab, setSidebarTab] = useState("comments");

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
        {reviewsError && <p className="tdm-comment-error">{reviewsError}</p>}

        {reviewsLoading ? (
          <div className="skeleton-list">
            <SkeletonRow showAvatar={false} lineCount={3} />
            <SkeletonRow showAvatar={false} lineCount={2} />
          </div>
        ) : (
          <div className="tdm-activities-list-wrap">
            {Array.isArray(reviews) && reviews.length > 0 ? (
              <ul className="tdm-review-list" aria-label="Activity">
                {reviews.map((rev, idx) => {
                  const actor = rev?.user || rev?.actor || {};
                  const roleLabel = rev?.reviewerRole || actor?.role || actor?.projectRole || actor?.project_role;
                  const displayName = rev?.reviewerName || getMemberLabel(actor);
                  const actionNorm = getReviewEntryAction(rev) || rev?.action || "";
                  const isApproved = String(actionNorm).toLowerCase() === "approved";
                  const isRejected = String(actionNorm).toLowerCase() === "rejected";
                  const comment = getReviewEntryComment(rev);
                  const timeLabel = formatTimeAgo(rev?.createdAt || rev?.created_at);

                  return (
                    <li key={rev.id || idx} className="tdm-review-row">
                      <div className="tdm-review-icon">
                        {(() => {
                          const memberFromProject = (projectMembers || []).find((m) =>
                            String(m?.id || m?.userId || m?.user_id || "") === String(rev?.reviewerId || rev?.reviewer_id || "")
                          );
                          const memberImg =
                            memberFromProject?.profileImageBase64 ||
                            memberFromProject?.profile_image_base64 ||
                            memberFromProject?.avatar ||
                            memberFromProject?.avatarUrl ||
                            memberFromProject?.imageUrl ||
                            memberFromProject?.profileImage ||
                            memberFromProject?.profile_image;

                          const avatarSrc = normalizeProfileImage(
                            rev?.reviewerProfileImageBase64 ||
                              rev?.reviewer_profile_image_base64 ||
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
                            <i className="ti ti-activity" aria-hidden="true" />
                          );
                        })()}
                      </div>
                      <div className="tdm-review-meta">
                        <div className="tdm-review-modal-name">
                          <strong>{displayName}</strong>
                          {roleLabel ? <span className="tdm-review-modal-role">{capitalizeFirst(roleLabel)}</span> : null}
                        </div>
                        <div className="tdm-review-modal-time">{timeLabel}</div>
                        {comment ? <div className="tdm-review-comment">{comment}</div> : null}
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

  const attachmentsPanel = (
    <article className="tdm-section-card tdm-attachments-panel">
      <div className="tdm-attachments-body">
        <div className="tdm-empty-state">No attachments yet.</div>
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

      <div className="tdm-grid">
        <section className="tdm-main-column">
          <div className="tdm-task-shell">
            <article className="tdm-section-card tdm-focus-card">
              <div className="tdm-section-header">
                <h3 className="tdm-task-title-label">Task</h3>
                <div className="task-actions-wrap">

                {canManageAdminTaskActions && (
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
                        disabled={prioritySubmitting || (currentUserRole === "admin" && !canAdminsManageTasks)}
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
                        disabled={targetDateSubmitting || (currentUserRole === "admin" && !canAdminsManageTasks)}
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
                onClick={() => canEditTaskTitle && !isEditingTaskTitle && beginEditTaskTitle()}
              >
                {isEditingTaskTitle ? null : (taskTitle || taskData.title || "Untitled task")}
              </h4>
              {canEditTaskTitle && isEditingTaskTitle && (
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
                onClick={() => canEditTaskTitle && !isEditingTaskDesc && beginEditTaskDesc()}
              >
                {isEditingTaskDesc ? null : (taskDesc || taskData.description || "No description provided.")}
              </p>
              {canEditTaskTitle && isEditingTaskDesc && (
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
                    {canManageTags && (
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

              {canManageTags && (
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
                (canManageAdminTaskActions || createSubtasks) && (
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
              <h3>Manage Tags</h3>
              <p className="tdm-manage-desc">
                Tags help categorize and filter tasks across the project. Add new tags or choose
                from project suggestions. A task may have up to 5 tags.
              </p>
              {tagError && <p className="tdm-tag-error">{tagError}</p>}

              <div className="tdm-tag-composer">
                {canManageTags && (
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
                )}

                <div className="tdm-current-tags">
                  {(tags || []).length === 0 ? (
                    <p className="tdm-no-current-tags">This task has no tags yet.</p>
                  ) : (
                    (tags || []).map((t) => {
                      const name = t?.tagName || t?.tag_name || t?.name || String(t);
                      const id = t?.id || name;
                      return (
                        <span key={id} className="tdm-tag tdm-current-tag">
                          <span className="tdm-tag-name">{name}</span>
                          {t?.isPending && <span className="tdm-tag-pending">Saving...</span>}
                          {canManageTags && (
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
                <div className="tdm-suggestions-label">Project suggestions</div>
                <div className="tdm-suggestions-content tdm-suggestions-pills">
                  {(projectTagSuggestions || []).map((s) => {
                    const name = s?.tagName || s?.tag_name || s?.name || String(s);
                    const normName = String(name).replace(/\s+/g, " ").trim();
                    const key = s?.id || normName;
                    if (!canManageTags) return null;
                    return (
                      <button
                        key={key}
                        type="button"
                        className="tdm-suggestion-pill"
                        onClick={() => handleAddTag(name)}
                        title={`Add tag ${name}`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="tdm-tags-controls">
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