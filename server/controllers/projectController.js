import { createProject as createProjectModel,
         getProjectsByOwner,
         getProjectsByMember,
         inviteMemberToProject as inviteMemberToProjectModel,
         getProjectInvitations as getProjectInvitationsModel,
         acceptProjectInvitation as acceptProjectInvitationModel,
         declineProjectInvitation as declineProjectInvitationModel,
 } from "../models/projectModel.js";

export async function createProject(req, res) {
  const projectName = (req.body?.project_name || req.body?.name || "").trim();
  const projectDescription = (req.body?.project_description || req.body?.description || "").trim();

  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!projectName) {
    return res.status(400).json({ message: "Project name is required" });
  }

  if (projectName.length > 255) {
    return res.status(400).json({ message: "Project name is too long" });
  }

  try {
    const createdProject = await createProjectModel({
      name: projectName,
      description: projectDescription,
      created_by: req.user.userId,
    });

    return res.status(201).json({
      message: "Project created successfully",
      project: createdProject.project,
      board: createdProject.board,
      categories: createdProject.categories,
    });
  } catch (error) {
    console.error("Project creation error:", error);
    return res.status(500).json({ message: "Unable to create project" });
  }
}

export async function getProjects(req, res) {
    if (!req.user?.userId) {
        return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const projects = await getProjectsByOwner(req.user.userId);
      return res.status(200).json({ projects });
    } catch (error) {
      console.error("Get projects error:", error);
      return res.status(500).json({ message: "Unable to fetch projects" });
    }
}

export async function getMemberProjects(req, res) {
    if (!req.user?.userId) {
        return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const projects = await getProjectsByMember(req.user.userId);
      return res.status(200).json({ projects });
    } catch (error) {
      console.error("Get member projects error:", error);
      return res.status(500).json({ message: "Unable to fetch member projects" });
    }
}

export async function inviteMemberToProject(req, res) {
  const projectId = (req.body?.project || req.body?.projectId || "").trim();
  const inviteeId = (req.body?.friend || req.body?.friendId || "").trim();

  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if(!projectId) {
    return res.status(400).json({ message: "A project is required."});
  }

  if(!inviteeId) {
    return res.status(400).json({ message: "You need to invite someone to this project."});
  }

  try {
    const inviteRequest = await inviteMemberToProjectModel({
      inviter_id: req.user.userId,
      invitee_id: inviteeId,
      project_id: projectId,
    });
    return res.status(201).json({ message: "Invite sent", inviteRequest });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to send invite" });
  }
}

export async function getProjectInvitations(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const projectInvitations = await getProjectInvitationsModel(req.user.userId);
    return res.status(200).json({ projectInvitations });
  } catch (error) {
    console.error("Get project invitations error:", error);
    return res.status(500).json({ message: "Unable to fetch project invitations" });
  }
}

export async function acceptProjectInvitation(req, res) {
  const userId = req.user?.userId;
  const { requestId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!requestId) {
    return res.status(400).json({ message: "Request ID is required" });
  }

  try {
    const request = await acceptProjectInvitationModel({ requestId, userId });
    return res.status(200).json({ message: "Project invitation accepted", request });
  } catch (error) {
    if (error?.code === "REQUEST_NOT_FOUND") {
      return res.status(404).json({ message: "Project invitation not found." });
    }

    if (error?.code === "INVALID_REQUEST_STATUS") {
      return res.status(409).json({ message: "Only pending invitations can be accepted." });
    }

    if (error?.code === "BOARD_NOT_FOUND") {
      return res.status(404).json({ message: "Project board not found." });
    }

    console.error("Accept project invitation error:", error);
    return res.status(500).json({ message: "Unable to accept project invitation" });
  }
}

export async function declineProjectInvitation(req, res) {
  const userId = req.user?.userId;
  const { requestId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!requestId) {
    return res.status(400).json({ message: "Request ID is required" });
  }

  try {
    const request = await declineProjectInvitationModel({ requestId, userId });
    return res.status(200).json({ message: "Project invitation declined", request });
  } catch (error) {
    if (error?.code === "REQUEST_NOT_FOUND") {
      return res.status(404).json({ message: "Project invitation not found." });
    }

    if (error?.code === "INVALID_REQUEST_STATUS") {
      return res.status(409).json({ message: "Only pending invitations can be declined." });
    }

    console.error("Decline project invitation error:", error);
    return res.status(500).json({ message: "Unable to decline project invitation" });
  }
}


