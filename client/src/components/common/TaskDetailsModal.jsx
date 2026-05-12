import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentUser } from "../../services/authService";
import { getTaskReviews, approveTaskReview, rejectTaskReview } from "../../services/projectService";
import "../styles/TaskDetailsModal.css";
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

function formatCategoryLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => capitalizeFirst(part))
    .join(" ");
}

const TASK_PRIORITY_OPTIONS = ["unset", "low", "medium", "high", "urgent"];

function normalizeTaskPriority(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "critical") return "urgent";
  if (normalized === "unset") return "unset";
  if (TASK_PRIORITY_OPTIONS.includes(normalized)) return normalized;
  return "unset";
}

export function TaskDetailsContent({ asPage = false, currentUserId, task, isAdminOrOwner, createSubtasks, fetchTaskComments, addTaskComment, addTaskCommentReply, canMembersAssignTaskToOthers, assignMemberToTask, unassignMemberFromTask, projectMembers = [], onAssign, onClose, projectId, taskCategories = [], getProjectTags, getTaskTags, createTaskTag, deleteTaskTag, updateTaskName, updateTaskDescription, updateTaskPriority, updateTaskStatus, updateTaskTargetDate, onDeleteTask }) {
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
  const [reviewFeedbackMode, setReviewFeedbackMode] = useState(null); // 'approve' | 'reject' | null
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewFeedbackText, setReviewFeedbackText] = useState("");
  const [reviewFeedbackSubmitting, setReviewFeedbackSubmitting] = useState(false);
  const reviewFeedbackTextareaRef = useRef(null);
  const isCurrentUserAssigned = useMemo(() => {
    if (!currentUserIdValue) return false;
    return assignees.some((member) => String(member?.id || member?.user_id || "") === String(currentUserIdValue));
  }, [assignees, currentUserIdValue]);
  const canChangeTaskCategory = isAdminOrOwner || isCurrentUserAssigned;
  const canEditTaskTitle = useMemo(() => {
    if (!currentUserIdValue) return false;
    const creatorId = taskData?.createdBy || taskData?.created_by;
    if (creatorId && String(creatorId) === String(currentUserIdValue)) return true;
    return assignees.some((member) => String(member?.id || member?.user_id || "") === String(currentUserIdValue));
  }, [assignees, currentUserIdValue, taskData?.createdBy, taskData?.created_by]);
  const currentMemberEntry = useMemo(() => {
    if (!Array.isArray(projectMembers)) return null;
    return projectMembers.find((m) => String(m?.id) === String(currentUserIdValue));
  }, [projectMembers, currentUserIdValue]);

  const currentUserRole = String(currentMemberEntry?.role || "").toLowerCase();
  const canReview = isAdminOrOwner || currentUserRole === "manager";
  const taskTitleRef = useRef(null);
  const taskDescRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuButtonRef = useRef(null);

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
    const ids = (Array.isArray(task?.assignees) ? task.assignees : [])
      .map(getMemberId)
      .filter(Boolean);
    setLocalAssignedIds(ids);
  }, [task?.assignees]);

  useEffect(() => {
    setLocalSubtasks(Array.isArray(task?.subtasks) ? [...task.subtasks] : []); 
  }, [task?.id, task?.subtasks])

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

  const openReviewFeedbackModal = (mode) => {
    setReviewFeedbackText("");
    setReviewFeedbackMode(mode);
  };

  const closeReviewFeedbackModal = () => {
    if (reviewFeedbackSubmitting) return;
    setReviewFeedbackMode(null);
  };

  const handleSubmitReviewFeedback = async () => {
    if (!task?.id || !reviewFeedbackMode) return;
    // Prefer live textarea value so the note is never lost to a stale render before the click.
    const text = String(
      reviewFeedbackTextareaRef.current?.value ?? reviewFeedbackText ?? ""
    ).trim();
    if (!text) return alert("Please provide a review note.");
    setReviewFeedbackSubmitting(true);
    try {
      const data =
        reviewFeedbackMode === "approve"
          ? await approveTaskReview(task.id, text)
          : await rejectTaskReview(task.id, text);
      const updated = data?.task || data;
      // Sync parent/board category when possible. Approve already moves the task server-side;
      // updateTaskStatus can fail for reviewers who may move tasks to Done via review API but
      // not via the generic status endpoint — must not block reloading reviews.
      if (updated && (updateTaskStatus instanceof Function)) {
        const newCategoryId = updated?.category_id ?? updated?.categoryId;
        if (newCategoryId) {
          try {
            await updateTaskStatus(task.id, newCategoryId);
          } catch (syncErr) {
            console.warn("Board sync after review skipped:", syncErr?.message || syncErr);
          }
        }
      }
      const revs = await getTaskReviews(task.id);
      setReviews(revs?.reviews || revs || []);
      setReviewFeedbackMode(null);
    } catch (err) {
      console.error(`${reviewFeedbackMode === "approve" ? "Approve" : "Reject"} review failed`, err);
      alert(err?.message || `Unable to ${reviewFeedbackMode === "approve" ? "approve" : "reject"} task review`);
    } finally {
      setReviewFeedbackSubmitting(false);
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
        setProjectTagSuggestions(suggestions);
      } catch (err) {
        console.error("Unable to load project tags", err);
        setProjectTagSuggestions([]);
      } finally {
        // no loading state needed here
      }
    }

    loadProjectSuggestions();
  }, [projectId, getProjectTags]);

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

    const tempId = `temp-comment-${Date.now()}`;
    const optimisticUser = currentUser
      ? {
          id: currentUserIdValue,
          firstName: currentUser.firstName || currentUser.first_name,
          lastName: currentUser.lastName || currentUser.last_name,
          email: currentUser.email,
          role: currentUser.role,
        }
      : { id: currentUserIdValue };

    const optimisticComment = {
      id: tempId,
      comment: trimmed,
      created_at: new Date().toISOString(),
      user: optimisticUser,
      replies: [],
      isPending: true,
    };

    setCommentSubmitting(true);
    setCommentsError("");
    setComments((prev) => [...prev, optimisticComment]);
    setNewComment("");

    try {
      await addTaskComment?.(task.id, currentUserIdValue, trimmed);
      await loadComments();
    } catch (err) {
      setComments((prev) => prev.filter((item) => String(item?.id) !== String(tempId)));
      setCommentsError(err?.message || "Unable to add comment.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleSubmitReply = async (commentId) => {
    const replyText = (replyInputs[commentId] || "").trim();
    if (!task?.id || !currentUserIdValue || !commentId || !replyText) return;

    const tempId = `temp-reply-${commentId}-${Date.now()}`;
    const optimisticUser = currentUser
      ? {
          id: currentUserIdValue,
          firstName: currentUser.firstName || currentUser.first_name,
          lastName: currentUser.lastName || currentUser.last_name,
          email: currentUser.email,
          role: currentUser.role,
        }
      : { id: currentUserIdValue };

    const optimisticReply = {
      id: tempId,
      commentReply: replyText,
      created_at: new Date().toISOString(),
      user: optimisticUser,
      isPending: true,
    };

    setReplySubmittingId(String(commentId));
    setCommentsError("");
    setComments((prev) =>
      prev.map((item) => {
        if (String(item?.id) !== String(commentId)) return item;
        const replies = Array.isArray(item?.replies) ? item.replies : [];
        return { ...item, replies: [...replies, optimisticReply] };
      })
    );

    try {
      await addTaskCommentReply?.(task.id, commentId, currentUserIdValue, replyText);
      setReplyInputs((prev) => ({ ...prev, [commentId]: "" }));
      setActiveReplyId("");
      await loadComments();
    } catch (err) {
      setComments((prev) =>
        prev.map((item) => {
          if (String(item?.id) !== String(commentId)) return item;
          const replies = Array.isArray(item?.replies) ? item.replies : [];
          return { ...item, replies: replies.filter((reply) => String(reply?.id) !== String(tempId)) };
        })
      );
      setCommentsError(err?.message || "Unable to add reply.");
    } finally {
      setReplySubmittingId("");
    }
  };

  const handleAddTag = async (tagName) => {
    const name = (tagName || tagInput || "").trim();
    if (!task?.id || !name) return;
    if ((tags || []).length >= 5) {
      setTagError("A task may have up to 5 tags");
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

    if (!task?.id || taskTitleSaving || !updateTaskName) {
      setIsEditingTaskTitle(false);
      setTaskTitle(trimmed);
      return;
    }

    const previousTitle = taskTitle;
    setTaskTitle(trimmed);
    setTaskTitleSaving(true);
    setTaskTitleError("");
    try {
      const data = await updateTaskName(task.id, trimmed);
      const updated = data?.task?.title || data?.title || trimmed;
      setTaskTitle(updated);
      setIsEditingTaskTitle(false);
    } catch (err) {
      setTaskTitle(previousTitle);
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

    if (!task?.id || taskDescSaving || !updateTaskDescription) {
      setIsEditingTaskDesc(false);
      setTaskDesc(trimmed);
      return;
    }

    const previousDesc = taskDesc;
    setTaskDesc(trimmed);
    setTaskDescSaving(true);
    setTaskDescError("");
    try {
      const data = await updateTaskDescription(task.id, trimmed);
      const updated = data?.task?.description || data?.description || trimmed;
      setTaskDesc(updated);
      setIsEditingTaskDesc(false);
    } catch (err) {
      setTaskDesc(previousDesc);
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

    const previousPriority = taskPriority;
    const normalized = normalizeTaskPriority(nextPriority);
    setTaskPriority(normalized);
    setPriorityError("");

    if (!updateTaskPriority) return;

    setPrioritySubmitting(true);
    try {
      const data = await updateTaskPriority(task.id, normalized);
      const saved = normalizeTaskPriority(data?.task?.priority || normalized);
      setTaskPriority(saved);
    } catch (err) {
      setPriorityError(err?.message || "Unable to update task priority.");
      setTaskPriority(previousPriority);
    } finally {
      setPrioritySubmitting(false);
    }
  };

  const handleUpdateTaskCategory = async (nextCategoryId) => {
    if (!task?.id || !nextCategoryId) return;

    const previousCategoryId = taskCategoryId;
    setTaskCategoryId(String(nextCategoryId));
    setTaskCategoryError("");

    if (!updateTaskStatus) return;

    setTaskCategorySubmitting(true);
    try {
      const data = await updateTaskStatus(task.id, nextCategoryId);
      const savedCategoryId = data?.task?.categoryId ?? data?.task?.category_id ?? nextCategoryId;
      setTaskCategoryId(String(savedCategoryId));
    } catch (err) {
      setTaskCategoryError(err?.message || "Unable to update task category.");
      setTaskCategoryId(previousCategoryId);
    } finally {
      setTaskCategorySubmitting(false);
    }
  };

  const handleUpdateTargetDate = async (nextValue) => {
    if (!task?.id) return;

    const previousTargetDate = targetDate;
    const previousPastDue = isPastDue;
    const parsed = nextValue ? new Date(nextValue) : null;
    const nextPastDue = parsed ? parsed.getTime() < Date.now() : false;

    setTargetDate(nextValue);
    setIsPastDue(nextPastDue);
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
      setTargetDate(previousTargetDate);
      setIsPastDue(previousPastDue);
    } finally {
      setTargetDateSubmitting(false);
    }
  };

  const renderMemberRow = (member, index) => {
    const resolvedMemberId = getMemberId(member);
    const memberId = resolvedMemberId || `${index}-${getMemberLabel(member)}`;
    const isAssigned = resolvedMemberId ? localAssignedIds.includes(resolvedMemberId) : false;
    const isPending = resolvedMemberId ? assignmentPendingIds[resolvedMemberId] : false;
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

        {(canMembersAssignTaskToOthers || isAdminOrOwner) && (
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

                if (shouldAssign) {
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
            {isPending ? "Updating..." : (isAssigned ? "Assigned" : "Assign")}
          </button>
        )}
      </li>
    );
  };

  const sortedComments = (comments || [])
    .slice()
    .sort((a, b) => new Date(a?.created_at || a?.createdAt) - new Date(b?.created_at || b?.createdAt));

  const commentsPanel = (
    <article className="tdm-section-card tdm-comments-panel">
      <h3>Comments</h3>

      {commentsError && <p className="tdm-comment-error">{commentsError}</p>}

      {commentsLoading ? (
        <p>Loading comments...</p>
      ) : (
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
                        {replySubmittingId === String(commentId) ? "Posting..." : "Post"}
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
      )}

      <div className="tdm-comments-composer">
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
        <button
          type="button"
          className="tdm-comment-submit"
          onClick={handleSubmitComment}
          disabled={commentSubmitting || !newComment.trim()}
        >
          {commentSubmitting ? "Posting..." : "Post Comment"}
        </button>
      </div>
    </article>
  );

  return (
    <div className="tdm-modal">
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

      <div className="tdm-grid">
        <section className="tdm-main-column">
          <article className="tdm-section-card tdm-focus-card">
            <div className="tdm-section-header">
              <h3 className="tdm-task-title-label">Task</h3>
              <div className="task-actions-wrap" ref={menuButtonRef}>
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

                {menuOpen && (
                  <div className="task-dropdown" ref={dropdownRef} role="dialog" aria-label="Task actions">
                    <div className="dropdown-section">
                      <p className="dropdown-label">Target Date</p>
                      <input
                        type="date"
                        className="tdm-input tdm-target-input"
                        value={toDateInputValue(targetDate)}
                        onChange={(event) => {
                          const next = event.target.value || null;
                          handleUpdateTargetDate(next);
                          // keep dropdown open for quick edits
                        }}
                        disabled={targetDateSubmitting}
                      />

                      <button
                        type="button"
                        className="tdm-target-clear"
                        onClick={() => handleUpdateTargetDate(null)}
                        disabled={targetDateSubmitting || !targetDate}
                      >
                        Clear
                      </button>
                    </div>

                    <div className="dropdown-section">
                      <p className="dropdown-label">Priority</p>
                      <select
                        id={`task-priority-${taskData.id || "unknown"}`}
                        className="tdm-priority-select"
                        value={taskPriority}
                        onChange={(event) => handleUpdateTaskPriority(event.target.value)}
                        disabled={prioritySubmitting}
                      >
                        {TASK_PRIORITY_OPTIONS.map((priorityOption) => (
                          <option key={priorityOption} value={priorityOption}>
                            {capitalizeFirst(priorityOption)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="dropdown-section">
                      <p className="dropdown-label">Mark as</p>
                      <select
                        id={`task-category-${taskData.id || "unknown"}`}
                        className="tdm-priority-select"
                        value={taskCategoryId || ""}
                        onChange={(event) => handleUpdateTaskCategory(event.target.value)}
                        disabled={taskCategorySubmitting || !canChangeTaskCategory || (Array.isArray(taskCategories) && taskCategories.length === 0)}
                      >
                        <option value="" disabled>
                          Select status
                        </option>
                        {(taskCategories || []).map((category) => {
                          const categoryId = String(category?.id || "");
                          const categoryName = String(category?.name || "");
                          const isDoneCategory = categoryName.trim().toLowerCase() === "done";
                          const disableDoneForMember = isDoneCategory && !isAdminOrOwner;

                          return (
                            <option key={categoryId || categoryName} value={categoryId} disabled={disableDoneForMember}>
                              {formatCategoryLabel(categoryName)}
                            </option>
                          );
                        })}
                      </select>
                      {!canChangeTaskCategory && (
                        <p className="tdm-dropdown-note">Assigned users only.</p>
                      )}
                      {canChangeTaskCategory && !isAdminOrOwner && (
                        <p className="tdm-dropdown-note">Done is for admins and owners only.</p>
                      )}
                    </div>

                    {taskCategoryError && <p className="tdm-dropdown-note">Status update failed.</p>}
                    {taskCategorySubmitting && <p className="tdm-dropdown-note">Updating...</p>}

                                    <div className="dropdown-section">
                                      <p className="dropdown-label">Review History</p>
                                      <button
                                        type="button"
                                        className="tdm-manage-tags-btn tdm-review-history-btn"
                                        onClick={() => { setMenuOpen(false); setShowReviewModal(true); }}
                                      >
                                        View review history
                                      </button>
                                    </div>

                    {isAdminOrOwner && onDeleteTask && (
                      <div className="dropdown-section">
                        <p className="dropdown-label">Remove Task</p>
                        <button
                          type="button"
                          className="tdm-delete-task-btn"
                          onClick={openDeleteConfirm}
                          disabled={deleteTaskSubmitting}
                        >
                          Remove Task
                        </button>
                        {deleteTaskError && <p className="tdm-delete-task-error">{deleteTaskError}</p>}
                      </div>
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
              >
                {isEditingTaskTitle ? null : (taskTitle || taskData.title || "Untitled task")}
              </h4>
              {canEditTaskTitle && !isEditingTaskTitle && (
                <button
                  type="button"
                  className="tdm-inline-edit-btn"
                  onClick={beginEditTaskTitle}
                  title="Edit task name"
                  aria-label="Edit task name"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M14.06 3.4a2 2 0 0 1 2.83 0l3.7 3.7a2 2 0 0 1 0 2.83l-9.9 9.9-5.55 1.38 1.38-5.55 9.9-9.9zM4 20h16v2H4z" />
                  </svg>
                </button>
              )}
              {canEditTaskTitle && isEditingTaskTitle && (
                <div className="tdm-inline-edit-actions">
                  <button
                    type="button"
                    className="tdm-inline-edit-save"
                    onClick={saveTaskTitle}
                    disabled={taskTitleSaving}
                  >
                    {taskTitleSaving ? "Saving..." : "Save"}
                  </button>
                  <button type="button" className="tdm-inline-edit-cancel" onClick={cancelEditTaskTitle}>
                    Cancel
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
              >
                {isEditingTaskDesc ? null : (taskDesc || taskData.description || "No description provided.")}
              </p>
              {canEditTaskTitle && !isEditingTaskDesc && (
                <button
                  type="button"
                  className="tdm-inline-edit-btn"
                  onClick={beginEditTaskDesc}
                  title="Edit task description"
                  aria-label="Edit task description"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M14.06 3.4a2 2 0 0 1 2.83 0l3.7 3.7a2 2 0 0 1 0 2.83l-9.9 9.9-5.55 1.38 1.38-5.55 9.9-9.9zM4 20h16v2H4z" />
                  </svg>
                </button>
              )}
              {canEditTaskTitle && isEditingTaskDesc && (
                <div className="tdm-inline-edit-actions">
                  <button
                    type="button"
                    className="tdm-inline-edit-save"
                    onClick={saveTaskDesc}
                    disabled={taskDescSaving}
                  >
                    {taskDescSaving ? "Saving..." : "Save"}
                  </button>
                  <button type="button" className="tdm-inline-edit-cancel" onClick={cancelEditTaskDesc}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
            {taskDescError && <p className="tdm-inline-edit-error">{taskDescError}</p>}
            <div className="tdm-meta-row">
              <span className="tdm-created-text">Created on: {getCreatedAtLabel(taskData)}</span>
            </div>
            <div className="tdm-meta-row tdm-target-row">
              <span className="tdm-target-label">Target Date:</span>
              <span className={`tdm-target-value${isPastDue ? " is-overdue" : ""}`}>
                {formatTargetDate(targetDate)}
              </span>
              {isPastDue ? <span className="tdm-overdue-badge">Overdue</span> : null}
              {targetDateSubmitting ? <span className="tdm-target-pending">Updating...</span> : null}
            </div>
            {targetDateError && <p className="tdm-target-error">{targetDateError}</p>}
            <div className="tdm-tags-area">
              <span className="tdm-tags-label">Tags:</span>
              <div className="tdm-tag-list">
                {(tags || []).map((t) => (
                  <span key={t.id || t.tagName} className="tdm-tag">
                    <span className="tdm-tag-name">{t.tagName || t.tag_name}</span>
                    {t?.isPending && <span className="tdm-tag-pending">Saving...</span>}
                    <button
                      type="button"
                      className="tdm-tag-remove"
                      onClick={() => handleDeleteTag(t)}
                      disabled={deletingTagId === t.id || t?.isPending}
                      aria-label={`Remove tag ${t.tagName || t.tag_name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <button type="button" className="tdm-manage-tags-btn" onClick={() => setShowTagsModal(true)}>
                Manage Tags
              </button>
              {canReview && (Array.isArray(taskCategories) ? taskCategories.find(c => String(c.id) === String(taskCategoryId) && String((c.name||c.name).toLowerCase()).includes('review')) : false) ? (
                <div className="tdm-review-actions">
                  <button type="button" className="tdm-approve-btn" onClick={() => openReviewFeedbackModal("approve")}>Approve</button>
                  <button type="button" className="tdm-reject-btn" onClick={() => openReviewFeedbackModal("reject")}>Reject</button>
                </div>
              ) : null}
            </div>

            {/* Latest review feedback below tags (matches Review History) */}
            {Array.isArray(reviews) && reviews.length > 0 ? (() => {
              const last = reviews[0];
              const action = getReviewEntryAction(last);
              const note = getReviewEntryComment(last);
              if (!note) return null;
              if (action === "rejected") {
                return <div className="tdm-rejected-label">Rejected: {note}</div>;
              }
              if (action === "approved") {
                return <div className="tdm-approved-label">Approved: {note}</div>;
              }
              return null;
            })() : null}

            {/* <div className="tdm-priority-area">
              <label htmlFor={`task-priority-${taskData.id || "unknown"}`} className="tdm-priority-label">
                Priority: {capitalizeFirst(taskPriority)}
              </label>
            </div> */}
            {priorityError && <p className="tdm-priority-error">{priorityError}</p>}
            {prioritySubmitting && <p className="tdm-priority-pending">Updating...</p>}
          </article>

          <article className="tdm-section-card">
            <h3>Subtasks (Optional)</h3>
            {subtaskError && <p className="tdm-subtask-error">{subtaskError}</p>}
            {localSubtasks.length === 0 ? (
              <p>No subtasks added.</p>
            ) : (
              <ul className="tdm-subtasks-list">
                {localSubtasks.map((st, idx) => {
                  const createdByLabelName = st?.createdBy?.firstName + ' ' + st?.createdBy?.lastName || "Unknown";
                  const createdAtLabel = st?.createdAt ? new Date(st.createdAt).toLocaleString() : "";
                  const isCompleted = st?.status === "completed" || !!st.completed;
                  const isPending = subtaskPendingIds[String(st?.id)] || st?.isPending;

                  return (
                    <li key={st.id || `${idx}-${st.title || st}` } className="tdm-subtask-row">
                      <div className="tdm-subtask-left">
                        <input
                          type="checkbox"
                          className="tdm-subtask-checkbox"
                          defaultChecked={isCompleted}
                          disabled
                          aria-disabled="true"
                          title="Subtask completion is not available yet."
                          aria-label={`Mark ${st.title || 'subtask'} completed`}
                        />
                      </div>

                      <div className="tdm-subtask-main">
                        <div className="tdm-subtask-title">{st.title || String(st)}</div>
                        {isPending && <div className="tdm-subtask-pending">Saving...</div>}
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

            <div className="tdm-subtask-actions">
              {showAddSubtask ? (
                <div className="tdm-add-subtask-form">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="New subtask title"
                    className="tdm-input"
                  />
                  <button
                    type="button"
                    className="tdm-add-subtask-btn"
                    onClick={async () => {
                      if (!newSubtaskTitle.trim()) return;

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

                      // build payload for backend
                      const subtaskData = {
                        taskId: task.id,
                        title: newSubtaskTitle.trim(),
                        createdBy: currentUserId,
                        status: "unfinished"
                      };

                      // persist via parent handler
                      try {
                        const created = await createSubtasks({ subtaskData });
                        const savedAt = created?.created_at || created?.createdAt || createdAt;
                        const createdById = created?.created_by || currentUser?.id || currentUserId;
                        const createdBy = currentUser
                          ? {
                              id: createdById,
                              firstName: currentUser.firstName || currentUser.first_name,
                              lastName: currentUser.lastName || currentUser.last_name,
                              email: currentUser.email,
                            }
                          : { id: createdById };

                        const nextSubtask = {
                          id: created?.id || tempId,
                          title: created?.title || subtaskData.title,
                          status: created?.status || subtaskData.status,
                          createdAt: savedAt,
                          createdBy,
                        };

                        setLocalSubtasks((prev) =>
                          prev.map((item) => (String(item?.id) === String(tempId) ? nextSubtask : item))
                        );

                        // reset UI state
                        setNewSubtaskTitle("");
                        setShowAddSubtask(false);
                      } catch (err) {
                        setLocalSubtasks((prev) => prev.filter((item) => String(item?.id) !== String(tempId)));
                        setSubtaskError(err?.message || "Failed to create subtask.");
                      } finally {
                        setSubtaskPendingIds((prev) => {
                          const next = { ...prev };
                          delete next[tempId];
                          return next;
                        });
                      }
                    }}
                  >
                    Add Subtask
                  </button>

                  <button type="button" className="tdm-cancel-subtask-btn" onClick={() => setShowAddSubtask(false)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button type="button" className="tdm-add-subtask-toggle" onClick={() => setShowAddSubtask(true)}>
                  + Add Subtask
                </button>
              )}
            </div>
          </article>

          

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
          {commentsPanel}
        </aside>
      </div>
      {showAssigneesModal && (
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
      )}
      {showTagsModal && (
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
                        <button
                          type="button"
                          className="tdm-tag-remove"
                          onClick={() => handleDeleteTag(t)}
                          disabled={deletingTagId === t.id || t?.isPending}
                          aria-label={`Remove tag ${name}`}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })
                )}
              </div>
            </div>

            <div className="tdm-suggestions-array" aria-live="polite">
              <div className="tdm-suggestions-label">Project suggestions</div>
              <div className="tdm-suggestions-content">
                [
                {(projectTagSuggestions || []).map((s, i) => {
                  const name = s?.tagName || s?.tag_name || s?.name || String(s);
                  const key = s?.id || name + "-" + i;
                  return (
                    <span key={key} className="tdm-sugg-item">
                      <button
                        type="button"
                        className="tdm-suggestion-in-array"
                        onClick={() => handleAddTag(name)}
                        title={`Add tag ${name}`}
                      >
                        {name}
                      </button>
                      {i < (projectTagSuggestions || []).length - 1 && <span className="tdm-sugg-sep">, </span>}
                    </span>
                  );
                })}
                ]
              </div>
            </div>

            <div className="tdm-tags-controls">
              <button type="button" onClick={() => setShowTagsModal(false)} className="tdm-cancel-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="tdm-footer">
        <button type="button" className="tdm-view-assignees-btn" onClick={() => setShowAssigneesModal(true)}>
          View Assignees
        </button>
        <button type="button" className="tdm-close-action" onClick={onClose}>
          Close
        </button>
      </footer>

      {showDeleteConfirm && (
        <div className="tdm-confirm-overlay" role="presentation" onClick={closeDeleteConfirm}>
          <div className="tdm-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-task-title" onClick={(event) => event.stopPropagation()}>
            <div className="tdm-confirm-title-row">
              <span className="tdm-confirm-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M12 2 1 21h22L12 2zm0 6.2c.6 0 1 .4 1 1V13c0 .6-.4 1-1 1s-1-.4-1-1V9.2c0-.6.4-1 1-1zm0 8.8a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6z" />
                </svg>
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
      )}

      {reviewFeedbackMode && (
        <div className="tdm-confirm-overlay" role="presentation" onClick={closeReviewFeedbackModal}>
          <div
            className="tdm-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-feedback-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tdm-confirm-title-row">
              <h3 id="review-feedback-title">{reviewFeedbackMode === "approve" ? "Approve Task" : "Reject Task"}</h3>
            </div>
            <p>
              {reviewFeedbackMode === "approve"
                ? "Add a review note with this approval. It will be recorded in the review history."
                : "Please provide a reason for rejecting this task. This will be recorded in the review history."}
            </p>
            <textarea
              ref={reviewFeedbackTextareaRef}
              id="tdm-review-feedback-textarea"
              className="tdm-reject-textarea"
              value={reviewFeedbackText}
              onChange={(e) => setReviewFeedbackText(e.target.value)}
              placeholder={
                reviewFeedbackMode === "approve" ? "Enter approval note" : "Enter rejection reason"
              }
              rows={4}
              autoComplete="off"
            />

            <div className="tdm-confirm-actions">
              <button type="button" className="tdm-confirm-cancel" onClick={closeReviewFeedbackModal} disabled={reviewFeedbackSubmitting}>
                Cancel
              </button>
              <button
                type="button"
                className={reviewFeedbackMode === "approve" ? "tdm-confirm-approve" : "tdm-confirm-delete"}
                onClick={handleSubmitReviewFeedback}
                disabled={reviewFeedbackSubmitting}
              >
                {reviewFeedbackSubmitting ? "Submitting..." : reviewFeedbackMode === "approve" ? "Approve Task" : "Reject Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && (
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
                        <div className="tdm-review-modal-icon">{isApproved ? "✔" : "✕"}</div>
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
      )}
    </div>
  );
}

export default function TaskDetailsModal({ onClose, ...props }) {
  return (
    <div
      className="tdm-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Task details"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <TaskDetailsContent {...props} onClose={onClose} asPage={false} />
    </div>
  );
}