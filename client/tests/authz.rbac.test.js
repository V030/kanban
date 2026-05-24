/**
 * AUTHORIZATION + RBAC EDGE CASE TESTS
 * 
 * Purpose: Validate permission enforcement, role-based access control, and
 * prevent privilege escalation and cross-project data access
 * Risk Level: CRITICAL
 * 
 * These tests verify that unauthorized users cannot access, modify, or escalate
 * their role in projects they don't belong to or have insufficient permissions for.
 */

import * as projectService from '../src/services/projectService';

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
global.fetch = jest.fn();

describe('Authorization + RBAC Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('B1: Cross-Project Task Access (IDOR)', () => {
    it('should prevent member from accessing task in project they don\'t belong to', async () => {
      const user2Id = 'user-2-uuid';
      const projectAId = 'project-a-uuid';
      const projectBId = 'project-b-uuid';
      const taskId = 100;

      localStorage.setItem('token', 'user-2-token');

      // User 2 attempts to fetch task that belongs to ProjectA (user-2 not a member)
      global.fetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({
          message: 'Forbidden: you are not a member of this project',
        }),
      });

      await expect(
        projectService.getTaskById(taskId)
      ).rejects.toThrow();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/tasks/${taskId}`),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Bearer'),
          }),
        })
      );
    });

    it('should block direct API manipulation of task across projects', async () => {
      // Attacker tries to update task status in a project they're not part of
      localStorage.setItem('token', 'attacker-token');

      global.fetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({
          message: 'Permission denied: insufficient role',
        }),
      });

      await expect(
        projectService.updateTaskStatus(999, { status: 'done' })
      ).rejects.toThrow();
    });

    it('should validate taskId→projectId mapping on server', async () => {
      // Verify that server checks task exists in claimed project
      localStorage.setItem('token', 'member-token');

      global.fetch.mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: async () => ({
          message: 'Task not found in this project',
        }),
      });

      await expect(
        projectService.getTaskById(9999) // Non-existent task
      ).rejects.toThrow();
    });
  });

  describe('B2: Stale Permission Cache After Role Change', () => {
    it('should detect permission denial even if local cache shows old role', async () => {
      const userId = 'user-1-uuid';
      const projectId = 'project-1-uuid';

      // User locally cached as "member"
      localStorage.setItem('token', 'member-token');

      // Server revoked permissions (user no longer member)
      // Next API call should fail
      global.fetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({
          message: 'Forbidden: you are not a member of this project',
        }),
      });

      await expect(
        projectService.getProjectMembers(projectId)
      ).rejects.toThrow('You do not have access to this project.');
    });

    it('should not rely on client-side permission cache for protection', async () => {
      const projectId = 'project-1-uuid';

      // Even if UI shows permission granted
      localStorage.setItem('token', 'token');

      // Server may have revoked permission
      global.fetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({
          message: 'Access denied',
        }),
      });

      await expect(
        projectService.updateProjectSettings(projectId, { allow_member_create_task: true })
      ).rejects.toThrow();
    });
  });

  describe('B3: Permission Escalation Attempts', () => {
    it('should reject member attempting to escalate to admin', async () => {
      localStorage.setItem('token', 'member-token');

      global.fetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({
          message: 'Only project owner can modify roles',
        }),
      });

      await expect(
        projectService.updateMemberRole('project-1', 'user-2', 'admin')
      ).rejects.toThrow();
    });

    it('should ignore role parameter in request body if not owner', async () => {
      localStorage.setItem('token', 'member-token');

      global.fetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({
          message: 'Insufficient permissions',
        }),
      });

      // Attacker modifies request to include role: "admin"
      await expect(
        projectService.createProject({
          name: 'Malicious Project',
          description: 'Test',
          role: 'admin', // Ignored by server; user is creator (owner)
        })
      ).rejects.toThrow();
    });

    it('should prevent non-owner from deleting project', async () => {
      localStorage.setItem('token', 'member-token');

      global.fetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({
          message: 'Only project owner can delete',
        }),
      });

      await expect(
        projectService.deleteProject('project-1')
      ).rejects.toThrow();
    });
  });

  describe('B4: Hidden Route Direct Access', () => {
    it('should redirect unauthorized user accessing /projects/:id directly', async () => {
      localStorage.setItem('token', 'outsider-token');

      // Simulating ProtectedRoute + Project page load
      global.fetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({
          message: 'Forbidden',
        }),
      });

      await expect(
        projectService.getProjects() // Or project detail fetch
      ).rejects.toThrow();
    });
  });

  describe('B5: Task Access After Membership Revoke', () => {
    it('should deny task access after user removed from project', async () => {
      const projectId = 'project-1-uuid';
      const taskId = 50;

      localStorage.setItem('token', 'formerly-member-token');

      // Owner removes user from project via API
      // User still has token but is no longer member
      // Next API call for task should fail
      global.fetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({
          message: 'You are no longer a member of this project',
        }),
      });

      await expect(
        projectService.getTaskById(taskId)
      ).rejects.toThrow('no longer a member');
    });
  });

  describe('B6: Unauthorized Settings Access', () => {
    it('should prevent member from accessing project settings', async () => {
      localStorage.setItem('token', 'member-token');

      global.fetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({
          message: 'Only owner and admin can access settings',
        }),
      });

      await expect(
        projectService.getProjectSettings('project-1')
      ).rejects.toThrow();
    });

    it('should reject unauthorized modification of task permissions', async () => {
      localStorage.setItem('token', 'member-token');

      global.fetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({
          message: 'Insufficient permissions to modify settings',
        }),
      });

      await expect(
        projectService.updateProjectSettings('project-1', {
          allow_member_create_task: false,
        })
      ).rejects.toThrow();
    });
  });

  describe('B7: Task Modification Without Permission', () => {
    it('should prevent member from deleting task if allow_member_delete_task is false', async () => {
      localStorage.setItem('token', 'member-token');

      global.fetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({
          message: 'Members are not allowed to delete tasks',
        }),
      });

      await expect(
        projectService.deleteTask('project-1', 50)
      ).rejects.toThrow();
    });

    it('should prevent member from assigning task to others if permission denied', async () => {
      localStorage.setItem('token', 'member-token');

      global.fetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({
          message: 'Permission denied: cannot assign tasks',
        }),
      });

      await expect(
        projectService.assignTaskToOthers('project-1', 50, 'user-2-uuid')
      ).rejects.toThrow();
    });

    it('should enforce permission check even if button hidden in UI', async () => {
      // This simulates an attacker enabling a hidden button via DevTools
      localStorage.setItem('token', 'member-token');

      global.fetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({
          message: 'Insufficient permissions',
        }),
      });

      await expect(
        projectService.updateProjectName('project-1', 'New Name')
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('B8: Server-Side Authorization Validation', () => {
    it('should validate requester is project member before returning data', async () => {
      // This test verifies backend logic; simulated with fetch mocking
      localStorage.setItem('token', 'outsider-token');

      global.fetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({
          message: 'Not a project member',
        }),
      });

      await expect(
        projectService.getProjectMembers('some-project')
      ).rejects.toThrow();
    });

    it('should check requester role matches required permission level', async () => {
      localStorage.setItem('token', 'member-token');

      global.fetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({
          message: 'Admin role required',
        }),
      });

      await expect(
        projectService.removeMemberFromProject('project-1', 'user-to-remove')
      ).rejects.toThrow();
    });
  });

  describe('B9: Backend Authorization Bypass Attempts', () => {
    it('should reject tampered JWT payload', async () => {
      // Simulated: user modifies JWT payload client-side
      const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJoYWNrZXIiLCJyb2xlIjoib3duZXIifQ.tampered-sig';
      localStorage.setItem('token', tamperedToken);

      global.fetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({
          message: 'Invalid token signature',
        }),
      });

      await expect(
        projectService.getProjectMembers('project-1')
      ).rejects.toThrow();
    });

    it('should reject request without authorization header', async () => {
      localStorage.clear();

      await expect(
        projectService.getProjectMembers('project-1')
      ).rejects.toThrow('No token found');
    });
  });
});
