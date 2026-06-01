import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getCurrentUser, getProfile } from "../../services/authService";
import { getMemberProjects, getProjects, getTaskById } from "../../services/projectService";
import "../styles/Breadcrumbs.css";

function getUserFullName(user) {
  if (!user) return "";
  const first = user.firstName || user.first_name || "";
  const last = user.lastName || user.last_name || "";
  const fullName = `${first} ${last}`.trim();
  return fullName || user.username || user.email || "";
}

function getProjectName(project) {
  return project?.name || project?.title || "";
}

function getProjectId(project) {
  return project?.id || project?.projectId || null;
}

function getTaskTitle(task) {
  return task?.title || task?.name || "";
}

function isProjectMatch(project, id) {
  return String(project?.id || project?.projectId || "") === String(id || "");
}

function findProjectInState(state, projectId) {
  const stateProject = state?.project;
  if (projectId && isProjectMatch(stateProject, projectId)) {
    return stateProject;
  }

  const taskProject = state?.task?.project;
  if (projectId && isProjectMatch(taskProject, projectId)) {
    return taskProject;
  }

  if (!projectId) {
    return stateProject || taskProject || null;
  }

  return null;
}

function shouldHideBreadcrumb(pathname) {
  return pathname === "/main-page";
}

function shouldShowBackButton(pathname) {
  return ![
    "/main-page/dashboard",
    "/main-page/projects",
    "/main-page/friends",
    "/main-page/notifications",
    "/main-page/feedback",
    "/main-page/my-tasks",
    "/main-page/profile",
  ].includes(pathname);
}

export default function Breadcrumbs() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = useMemo(() => {
    if (!location.pathname) return "/";
    if (location.pathname.length > 1 && location.pathname.endsWith("/")) {
      return location.pathname.slice(0, -1);
    }
    return location.pathname;
  }, [location.pathname]);

  const [resolvedProjectName, setResolvedProjectName] = useState("");
  const [resolvedProjectId, setResolvedProjectId] = useState("");
  const [resolvedProject, setResolvedProject] = useState(null);
  const [resolvedTaskTitle, setResolvedTaskTitle] = useState("");
  const [resolvedProfileName, setResolvedProfileName] = useState("");

  useEffect(() => {
    let isActive = true;

    async function resolveDynamicLabels() {
      const state = location.state || {};
      const stateProject = findProjectInState(state);
      const nextProjectName = getProjectName(stateProject);
      const nextProjectId = getProjectId(stateProject);
      const nextTaskTitle = getTaskTitle(state?.task);
      const nextProfileName = getUserFullName(getCurrentUser());

      // First, set whatever we can get from location.state
      if (isActive) {
        setResolvedProjectName(nextProjectName);
        setResolvedProjectId(nextProjectId ? String(nextProjectId) : "");
        setResolvedProject(stateProject || null);
        setResolvedTaskTitle(nextTaskTitle);
        setResolvedProfileName(nextProfileName);
      }

      const projectKanbanMatch = pathname.match(/^\/main-page\/projects\/([^/]+)(?:\/kanban)?$/);
      const metricsMatch = pathname.match(/^\/main-page\/projects\/([^/]+)\/metrics$/);
      const extractedProjectId = projectKanbanMatch
        ? projectKanbanMatch[1]
        : metricsMatch
        ? metricsMatch[1]
        : null;
      const taskMatch = pathname.match(
        /^\/main-page\/projects\/([^/]+)\/kanban\/tasks\/([^/]+)$/
      );
      const taskId = taskMatch ? taskMatch[2] : null;
      const isProfileRoute = pathname === "/main-page/profile";

      // If we already have a project name from state, skip the API fetch
      if (nextProjectName && !taskId) {
        return;
      }

      if (taskId) {
        try {
          const data = await getTaskById(taskId);
          const task = data?.task || null;
          const taskTitle = getTaskTitle(task);
          const taskProject = task?.project || null;
          const projectName =
            getProjectName(taskProject) || getProjectName(stateProject);
          const projectId =
            getProjectId(taskProject) ||
            getProjectId(stateProject) ||
            task?.projectId ||
            task?.project_id ||
            null;

          if (isActive) {
            if (taskTitle) setResolvedTaskTitle(taskTitle);
            if (projectName) setResolvedProjectName(projectName);
            if (projectId) setResolvedProjectId(String(projectId));
            if (taskProject) setResolvedProject(taskProject);
          }
        } catch (error) {
          console.warn("[Breadcrumbs] Failed to resolve task labels:", error?.message);
        }
      }

      if (extractedProjectId) {
        try {
          const [ownedResult, memberResult] = await Promise.allSettled([
            getProjects(),
            getMemberProjects(),
          ]);

          const owned =
            ownedResult.status === "fulfilled"
              ? ownedResult.value?.projects || []
              : [];
          const member =
            memberResult.status === "fulfilled"
              ? memberResult.value?.projects || []
              : [];
          const allProjects = [...owned, ...member];

          const selectedProject =
            allProjects.find((project) =>
              isProjectMatch(project, extractedProjectId)
            ) || null;

          if (selectedProject && isActive) {
            const projectName = getProjectName(selectedProject);
            const projectId = getProjectId(selectedProject);
            setResolvedProjectName(projectName || "Project");
            if (projectId) {
              setResolvedProjectId(String(projectId));
            }
            setResolvedProject(selectedProject);
          }
        } catch (error) {
          console.warn("[Breadcrumbs] Failed to resolve project labels:", error?.message);
        }
      }

      if (isProfileRoute && !nextProfileName) {
        try {
          const profile = await getProfile();
          const profileUser = profile?.user || profile || null;
          const fullName = getUserFullName(profileUser);
          if (isActive && fullName) {
            setResolvedProfileName(fullName);
          }
        } catch (error) {
          console.warn("[Breadcrumbs] Failed to resolve profile name:", error?.message);
        }
      }
    }

    resolveDynamicLabels();

    return () => {
      isActive = false;
    };
  }, [location.state, pathname]);

  const segments = useMemo(() => {
    if (!pathname.startsWith("/main-page") || shouldHideBreadcrumb(pathname)) {
      return [];
    }

    if (pathname === "/main-page/dashboard") {
      return [
        { label: "Main Page", to: "/main-page/dashboard" },
        { label: "Home" },
      ];
    }

    if (pathname === "/main-page/notifications") {
      return [
        { label: "Main Page", to: "/main-page/dashboard" },
        { label: "Notifications" },
      ];
    }

    if (pathname === "/main-page/feedback") {
      return [
        { label: "Main Page", to: "/main-page/dashboard" },
        { label: "Feedback" },
      ];
    }

    if (pathname === "/main-page/my-tasks") {
      return [
        { label: "Main Page", to: "/main-page/dashboard" },
        { label: "My Tasks" },
      ];
    }

    if (pathname === "/main-page/friends") {
      return [
        { label: "Main Page", to: "/main-page/dashboard" },
        { label: "Friends" },
      ];
    }

    if (pathname === "/main-page/projects") {
      return [
        { label: "Main Page", to: "/main-page/dashboard" },
        { label: "Projects" },
      ];
    }

    // Match /main-page/projects/:projectId or /main-page/projects/:projectId/kanban
    const projectKanbanMatch = pathname.match(
      /^\/main-page\/projects\/([^/]+)(?:\/kanban)?$/
    );
    if (projectKanbanMatch) {
      return [
        { label: "Main Page", to: "/main-page/dashboard" },
        { label: "Projects", to: "/main-page/projects" },
        { label: resolvedProjectName || "Project" },
      ];
    }

    // Match /main-page/projects/:projectId/kanban/tasks/:taskId
    const taskMatch = pathname.match(
      /^\/main-page\/projects\/([^/]+)\/kanban\/tasks\/([^/]+)$/
    );
    if (taskMatch) {
      const projectId = taskMatch[1];
      const projectPath = `/main-page/projects/${projectId}/kanban`;

      return [
        { label: "Main Page", to: "/main-page/dashboard" },
        { label: "Projects", to: "/main-page/projects" },
        { label: resolvedProjectName || "Project", to: projectPath },
        { label: resolvedTaskTitle || "Task" },
      ];
    }

    // Match /main-page/projects/:projectId/metrics
    const metricsMatch = pathname.match(
      /^\/main-page\/projects\/([^/]+)\/metrics$/
    );
    if (metricsMatch) {
      return [
        { label: "Main Page", to: "/main-page/dashboard" },
        { label: "Projects", to: "/main-page/projects" },
        {
          label: resolvedProjectName || "Project",
          to: `/main-page/projects/${metricsMatch[1]}/kanban`,
        },
        { label: "Metrics" },
      ];
    }

    if (pathname === "/main-page/profile") {
      return [
        { label: "Main Page", to: "/main-page/dashboard" },
        { label: "Profile", to: "/main-page/profile" },
        { label: resolvedProfileName || "User" },
      ];
    }

    return [];
  }, [pathname, resolvedProfileName, resolvedProjectId, resolvedProjectName, resolvedTaskTitle]);

  if (segments.length === 0) {
    return null;
  }

  return (
    <nav className="global-breadcrumb" aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const key = `${segment.label}-${index}`;

          return (
            <li key={key} className="breadcrumb-item">
              {!isLast && segment.to ? (
                <Link to={segment.to} className="breadcrumb-link">
                  {segment.label}
                </Link>
              ) : (
                <span
                  className="breadcrumb-current"
                  aria-current={isLast ? "page" : undefined}
                >
                  {segment.label}
                </span>
              )}
              {!isLast && <span className="breadcrumb-separator">/</span>}
            </li>
          );
        })}
      </ol>

      {shouldShowBackButton(pathname) && (
        <button
          type="button"
          className="breadcrumb-back-btn"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          {"<"}
        </button>
      )}
    </nav>
  );
}