import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { TaskDetailsContent } from "../components/common/TaskDetailsModal";
import {
  getProjectMembers,
  createSubtask,
  getTaskCategories,
  getTaskComments,
  createTaskComment,
  createTaskCommentReply,
  assignTaskToOthers,
  unassignTaskFromMember,
  getProjectTags,
  getTaskTags,
  createTaskTag,
  deleteTaskTag,
} from "../services/projectService";
import { getCurrentUser } from "../services/authService";
import "../components/styles/TaskDetailsModal.css";

export default function TaskDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { taskId } = useParams();

  const initialTask = location.state?.task || null;
  const initialProject = location.state?.project || null;
  const initialMembers = location.state?.projectMembers || [];
  const initialIsAdmin = location.state?.isAdminOrOwner || false;
  const initialCanAssign = location.state?.canMembersAssignTaskToOthers || false;

  const [task, setTask] = useState(initialTask);
  const [project, setProject] = useState(initialProject);
  const [projectMembers, setProjectMembers] = useState(initialMembers);
  const [membersLoading, setMembersLoading] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState("");

  const currentUser = getCurrentUser();

  useEffect(() => {
    // If we don't have project members but have project id, try loading members
    if (!projectMembers || projectMembers.length === 0) {
      if (project?.id) loadMembers(project.id);
    }
  }, [project, projectMembers]);

  useEffect(() => {
    if (task || !taskId) return;
    loadTaskById(taskId);
  }, [task, taskId]);

  async function loadMembers(projectId) {
    if (!projectId) return;
    setMembersLoading(true);
    try {
      const data = await getProjectMembers(projectId);
      // `getProjectMembers` returns an object with `members` in some places; normalize
      const members = data?.members || data || [];
      setProjectMembers(members);
    } catch (err) {
      console.error("Unable to load project members", err);
    } finally {
      setMembersLoading(false);
    }
  }

  async function loadTaskById(id) {
    setTaskLoading(true);
    setTaskError("");

    let nextProject = project;
    if (!nextProject) {
      const cached = localStorage.getItem("selectedProject");
      if (cached) {
        try {
          nextProject = JSON.parse(cached);
        } catch (error) {
          console.error("Failed to parse selected project:", error);
        }
      }
    }

    if (!nextProject?.id) {
      setTaskError("Project not available. Please open from the board.");
      setTaskLoading(false);
      return;
    }

    setProject(nextProject);

    try {
      const data = await getTaskCategories(nextProject.id);
      const categories = data?.categories || [];
      const allTasks = categories.flatMap((category) => category.tasks || []);
      const found = allTasks.find((item) => String(item.id) === String(id));

      if (!found) {
        setTaskError("Task not found.");
      } else {
        setTask(found);
      }
    } catch (err) {
      setTaskError(err?.message || "Unable to load task.");
    } finally {
      setTaskLoading(false);
    }
  }

  const handleClose = () => {
    navigate(-1);
  };

  // If task not passed via state, show fallback message
  if (!task) {
    return (
      <div className="page-shell tdm-page-container">
        <div className="tdm-section-card">
          <h3>{taskLoading ? "Loading task..." : "Task not available"}</h3>
          <p>{taskError || "Open this page from the board to see task details."}</p>
          <div style={{ marginTop: 12 }}>
            <button onClick={() => navigate(-1)} className="tdm-close-action">Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell tdm-page-container" role="main">
      <TaskDetailsContent
        asPage={true}
        currentUserId={currentUser?.id || ""}
        task={task}
        projectMembers={projectMembers}
        projectId={project?.id}
        isAdminOrOwner={initialIsAdmin}
        canMembersAssignTaskToOthers={initialCanAssign}
        assignMemberToTask={async (tId, memberId) => assignTaskToOthers(tId, memberId)}
        unassignMemberFromTask={async (tId, memberId) => unassignTaskFromMember(tId, memberId)}
        createSubtasks={async ({ subtaskData }) => createSubtask(subtaskData)}
        fetchTaskComments={async (tId) => getTaskComments(tId)}
        addTaskComment={async (tId, userId, comment) => createTaskComment(tId, userId, comment)}
        addTaskCommentReply={async (tId, commentId, userId, reply) => createTaskCommentReply(tId, commentId, userId, reply)}
        getProjectTags={getProjectTags}
        getTaskTags={getTaskTags}
        createTaskTag={createTaskTag}
        deleteTaskTag={deleteTaskTag}
        onClose={handleClose}
      />
    </div>
  );
}
