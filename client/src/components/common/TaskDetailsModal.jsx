import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "../../services/authService";
import "../styles/TaskDetailsModal.css";


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

export function TaskDetailsContent({ asPage = false, currentUserId, task, isAdminOrOwner, createSubtasks, fetchTaskComments, addTaskComment, addTaskCommentReply, canMembersAssignTaskToOthers, assignMemberToTask, unassignMemberFromTask, projectMembers = [], onAssign, onClose, projectId, getProjectTags, getTaskTags, createTaskTag, deleteTaskTag }) {
  const taskData = task || {};
  const currentUser = useMemo(() => getCurrentUser(), []);
  const [localSubtasks, setLocalSubtasks] = useState([]);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [newComment, setNewComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState("");
  const [replyInputs, setReplyInputs] = useState({});
  const [replySubmittingId, setReplySubmittingId] = useState("");
  const [tags, setTags] = useState(Array.isArray(taskData?.tags) ? taskData.tags : []);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [projectTagSuggestions, setProjectTagSuggestions] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [tagLoading, setTagLoading] = useState(false);
  const [tagSubmitting, setTagSubmitting] = useState(false);
  const [tagError, setTagError] = useState("");
  const [deletingTagId, setDeletingTagId] = useState(null);
  const [showAssigneesModal, setShowAssigneesModal] = useState(false);
  const assignees = useMemo(() => (Array.isArray(taskData.assignees) ? taskData.assignees : []), [taskData.assignees]);
  const [localAssignedIds, setLocalAssignedIds] = useState([]);

  useEffect(() => {
    const ids = (Array.isArray(task?.assignees) ? task.assignees : [])
      .map(getMemberId)
      .filter(Boolean);
    setLocalAssignedIds(ids);
  }, [task?.assignees]);

  useEffect(() => {
    setLocalSubtasks(Array.isArray(task?.subtasks) ? [...task.subtasks] : []); 
  }, [task?.id, task?.subtasks])

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
  }, [task?.id, loadComments]);

  useEffect(() => {
    async function loadProjectSuggestions() {
      if (!projectId || !getProjectTags) return setProjectTagSuggestions([]);
      setTagLoading(true);
      try {
        const data = await getProjectTags(projectId);
        const suggestions = data?.tags || data || [];
        setProjectTagSuggestions(suggestions);
      } catch (err) {
        console.error("Unable to load project tags", err);
        setProjectTagSuggestions([]);
      } finally {
        setTagLoading(false);
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

  const isOwnerMember = (member) => {
    const role = String(member?.role || member?.projectRole || member?.project_role || "").toLowerCase();
    return role === "owner" || member?.isOwner === true || member?.is_owner === true;
  };

  const ownerMembers = useMemo(
    () => memberPool.filter((member) => isOwnerMember(member)),
    [memberPool]
  );

  const nonOwnerMembers = useMemo(
    () => memberPool.filter((member) => !isOwnerMember(member)),
    [memberPool]
  );

  const displayedAssignedMembers = useMemo(() => {
    const allById = new Map();
    memberPool.forEach((member) => allById.set(getMemberId(member), member));

    return localAssignedIds
      .map((memberId) => allById.get(memberId))
      .filter(Boolean);
  }, [localAssignedIds, memberPool]);

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
    if (!task?.id || !currentUserId || !newComment.trim()) return;

    setCommentSubmitting(true);
    setCommentsError("");

    try {
      await addTaskComment?.(task.id, currentUserId, newComment.trim());
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
    if (!task?.id || !currentUserId || !commentId || !replyText) return;

    setReplySubmittingId(String(commentId));
    setCommentsError("");

    try {
      await addTaskCommentReply?.(task.id, commentId, currentUserId, replyText);
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
    if ((tags || []).length >= 5) {
      setTagError("A task may have up to 5 tags");
      return;
    }

    setTagSubmitting(true);
    setTagError("");
    try {
      const res = await createTaskTag?.(task.id, projectId, name);
      const created = res?.tag || res;
      if (created) {
        setTags((prev) => [...prev, created]);
        setTagInput("");
      }
    } catch (err) {
      setTagError(err?.message || "Unable to add tag");
    } finally {
      setTagSubmitting(false);
    }
  };

  const renderMemberRow = (member, index) => {
    const memberId = getMemberId(member) || `${index}-${getMemberLabel(member)}`;
    const isAssigned = localAssignedIds.includes(getMemberId(member));
    const roleLabel = member?.role || member?.projectRole || member?.project_role;
    const emailLabel = member?.email;

    return (
      <li key={memberId} className="tdm-project-member-row">
        <div className="tdm-member-main">
          <span className="tdm-member-avatar">{getInitials(member)}</span>
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
              try {
                if (isAssigned) {
                  await unassignMemberFromTask?.(task.id, member.id);
                  setAssignment(member, false);
                } else {
                  await assignMemberToTask?.(task.id, member.id);
                  setAssignment(member, true);
                }
                onAssign?.(taskData.id, member);
              } catch (err) {
                console.error("Failed to update task assignment", err);
              }
            }}
          >
            {isAssigned ? "Assigned" : "Assign"}
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
        <ul className="tdm-comment-list tdm-comments-list" role="list" aria-label="Comments">
          {sortedComments.length === 0 ? (
            <li className="tdm-comment-empty" role="listitem">No comments yet.</li>
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
                <li key={commentId} className="tdm-comment-item" role="listitem">
                  <div className="tdm-comment-head">
                    <span className="tdm-comment-avatar">{getInitials(commentUser)}</span>
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
                    <ul className="tdm-replies" role="list" aria-label="Replies">
                      {sortedReplies.map((replyItem, replyIndex) => {
                        const replyUser = replyItem?.user || {};
                        const replyTimeLabel = formatTimeAgo(replyItem?.createdAt || replyItem?.created_at);
                        const replyKey = replyItem?.id || `${commentId}-reply-${replyIndex}`;

                        return (
                          <li key={replyKey} className="tdm-reply-item" role="listitem">
                            <span className="tdm-reply-avatar">{getInitials(replyUser)}</span>
                            <div className="tdm-reply-body">
                              <div className="tdm-reply-name-row">
                                <span className="tdm-reply-name">{getMemberLabel(replyUser)}</span>
                                {replyUser?.role ? (
                                  <span className="tdm-reply-role">{capitalizeFirst(replyUser.role)}</span>
                                ) : null}
                              </div>
                              {replyTimeLabel && <span className="tdm-reply-time">{replyTimeLabel}</span>}
                              <p className="tdm-reply-text">{replyItem?.commentReply || replyItem?.comment_reply || ""}</p>
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
            <h3>Task</h3>
            <h4 className="tdm-task-title">{taskData.title || "Untitled task"}</h4>
            <p className="tdm-task-description">{taskData.description || "No description provided."}</p>
            <div className="tdm-meta-row">
              <span className="tdm-created-text">Created {getCreatedAtLabel(taskData)}</span>
            </div>
            <div className="tdm-tags-area">
              <span className="tdm-tags-label">Tags:</span>
              <div className="tdm-tag-list">
                {(tags || []).map((t) => (
                  <span key={t.id || t.tagName} className="tdm-tag">
                    <span className="tdm-tag-name">{t.tagName || t.tag_name}</span>
                    <button
                      type="button"
                      className="tdm-tag-remove"
                      onClick={async () => {
                        if (!t?.id) return;
                        setDeletingTagId(t.id);
                        try {
                          await deleteTaskTag?.(task.id, t.id);
                          setTags((prev) => prev.filter((x) => String(x.id) !== String(t.id)));
                        } catch (err) {
                          console.error("Failed to remove tag", err);
                        } finally {
                          setDeletingTagId(null);
                        }
                      }}
                      disabled={deletingTagId === t.id}
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
            </div>
          </article>

          <article className="tdm-section-card">
            <h3>Subtasks (Optional)</h3>
            {localSubtasks.length === 0 ? (
              <p>No subtasks added.</p>
            ) : (
              <ul className="tdm-subtasks-list">
                {localSubtasks.map((st, idx) => {
                  const createdByLabelEmail = st?.createdBy?.email || "Unknown";
                  const createdByLabelName = st?.createdBy?.firstName + ' ' + st?.createdBy?.lastName || "Unknown";
                  const createdAtLabel = st?.createdAt ? new Date(st.createdAt).toLocaleString() : "";
                  const isCompleted = st?.status === "completed" || !!st.completed;

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
                        const createdAt = created?.created_at || created?.createdAt || new Date().toISOString();
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
                          id: created?.id || `${task.id}-${Date.now()}`,
                          title: created?.title || subtaskData.title,
                          status: created?.status || subtaskData.status,
                          createdAt,
                          createdBy,
                        };

                        setLocalSubtasks((prev) => [...prev, nextSubtask]);

                        // reset UI state
                        setNewSubtaskTitle("");
                        setShowAddSubtask(false);
                      } catch (err) {
                        console.error("Failed to create subtask:", err);
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
                <h3>Project Assignees</h3>
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

            {memberPool.length === 0 ? (
              <p className="tdm-assignees-empty">No project members available.</p>
            ) : (
              <div className="tdm-assignees-body">
                <div className="tdm-assignees-section">
                  <div className="tdm-assignees-title">Project Owner</div>
                  {ownerMembers.length === 0 ? (
                    <p className="tdm-assignees-empty">No owner assigned.</p>
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
                    <p className="tdm-assignees-empty">No members found.</p>
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
                        <button
                          type="button"
                          className="tdm-tag-remove"
                          onClick={async () => {
                            if (!t?.id) return;
                            setDeletingTagId(t.id);
                            try {
                              await deleteTaskTag?.(task.id, t.id);
                              setTags((prev) => prev.filter((x) => String(x.id) !== String(t.id)));
                            } catch (err) {
                              console.error("Failed to remove tag", err);
                            } finally {
                              setDeletingTagId(null);
                            }
                          }}
                          disabled={deletingTagId === t.id}
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