/**
 * Error message transformer for user-friendly notifications
 * Maps technical errors to friendly, actionable messages
 */

const ERROR_MESSAGE_MAP = {
  // Auth errors
  'invalid credentials': 'Email or password is incorrect. Please try again.',
  'user already exists': 'This email is already registered. Please log in or use a different email.',
  'email and password are required': 'Please enter both email and password.',
  'missing fields': 'Please fill in all required fields.',
  'no token found': 'Session expired. Please log in again.',
  'session expired': 'Your session has expired. Please log in again.',
  'invalid / expired token': 'Your session has expired. Please log in again.',
  'user not authenticated': 'Please log in to continue.',
  'access denied': 'You do not have permission to perform this action.',

  // Password reset errors
  'failed to request password reset': 'Unable to send reset code. Please try again.',
  'failed to verify otp': 'The code is invalid or expired. Please request a new one.',
  'invalid or expired otp': 'The code is invalid or expired. Please request a new one.',
  'otp verified': 'Code verified! You can now reset your password.',
  'failed to complete password reset': 'Unable to reset your password. Please try again.',
  'failed to reset password': 'Unable to reset your password. Please try again.',
  'invalid or expired reset token': 'The reset link has expired. Please request a new one.',
  'current password is incorrect': 'Your current password is incorrect.',
  'new password must be at least 6 characters': 'Password must be at least 6 characters long.',
  'new password must be different from the current password': 'Please choose a different password.',

  // Profile errors
  'profile updated successfully': 'Your profile has been updated.',
  'unable to update profile': 'Unable to update your profile. Please try again.',
  'email already in use': 'This email is already in use by another account.',

  // Project errors
  'project created successfully': 'Project created successfully!',
  'project not found': 'This project no longer exists or has been deleted.',
  'forbidden: you are not a member of this project': 'You do not have access to this project.',
  'forbidden: you don\'t have permission to modify the board': 'You do not have permission to modify this project.',
  'cannot remove owner': 'The project owner cannot be removed.',
  'unable to create project': 'Unable to create project. Please try again.',
  'unable to delete project': 'Unable to delete project. Please try again.',
  'unable to update project': 'Unable to update project. Please try again.',
  'project name is required': 'Please enter a project name.',
  'project name is too long': 'Project name is too long. Please use a shorter name.',
  'project description is required': 'Please enter a project description.',
  'task description is required': 'Please enter a task description.',

  // Task errors
  'task created successfully': 'Task created successfully!',
  'task moved successfully': 'Task moved successfully!',
  'task approved and moved to done': 'Task approved and moved to Done!',
  'task rejected and moved to todo': 'Task returned to To-Do. Assignee can make revisions.',
  'task not found': 'This task no longer exists.',
  'forbidden: you don\'t have permission to approve reviews': 'You do not have permission to approve this task.',
  'unable to create task': 'Unable to create task. Please try again.',
  'unable to delete task': 'Unable to delete task. Please try again.',
  'unable to update task': 'Unable to update task. Please try again.',
  'task name is required': 'Please enter a task name.',
  'categoryid is required': 'Please select a task category.',
  'invalid priority': 'Please select a valid priority level.',

  // Member errors
  'member is already assigned to this task': 'This team member is already assigned to this task.',
  'cannot change owner while members exist': 'Remove other members before changing the owner.',
  'member not found': 'Team member not found.',
  'unable to assign task': 'Unable to assign task. Please try again.',
  'unable to unassign task': 'Unable to unassign task. Please try again.',
  'member role updated successfully': 'Team member role updated.',

  // Friend errors
  'friend request sent successfully': 'Friend request sent!',
  'friend request accepted': 'Friend request accepted!',
  'friend request declined': 'Friend request declined.',
  'friend request canceled': 'Friend request canceled.',
  'friend request already exists': 'You have already sent a friend request to this user.',
  'you are already friends': 'You are already friends with this user.',
  'friend not found': 'This friend no longer exists.',
  'unable to add friend': 'Unable to send friend request. Please try again.',
  'unable to accept friend request': 'Unable to accept friend request. Please try again.',
  'unable to decline friend request': 'Unable to decline friend request. Please try again.',

  // Invite errors
  'invite sent': 'Invite sent successfully!',
  'project invitation accepted': 'Project invitation accepted!',
  'project invitation declined': 'Project invitation declined.',
  'already member': 'This user is already a member of the project.',
  'unable to send invite': 'Unable to send invite. Please try again.',
  'unable to accept invitation': 'Unable to accept invitation. Please try again.',
  'unable to decline invitation': 'Unable to decline invitation. Please try again.',

  // Comment errors
  'comment added successfully': 'Comment added!',
  'reply added successfully': 'Reply added!',
  'unable to add comment': 'Unable to add comment. Please try again.',
  'unable to add reply': 'Unable to add reply. Please try again.',

  // Tag errors
  'tag already exists for this task': 'This tag already exists for this task.',
  'unable to create tag': 'Unable to create tag. Please try again.',
  'unable to delete tag': 'Unable to delete tag. Please try again.',

  // Rate limit errors
  'too many login attempts. please try again later': 'Too many login attempts. Please wait a moment and try again.',
  'too many password reset attempts. please try again later': 'Too many password reset attempts. Please wait before trying again.',
  'too many requests': 'You\'re doing that too quickly. Please wait a moment.',

  // Generic errors
  'server error': 'Something went wrong. Please try again.',
  'unable to': 'Unable to complete this action. Please try again.',
  'failed to': 'This action failed. Please try again.',
  'network error': 'Network error. Please check your connection and try again.',
};

/**
 * Transform a technical error message to a user-friendly one
 * @param {string|Error} error - The error message or Error object
 * @returns {string} User-friendly error message
 */
export function transformErrorMessage(error) {
  if (!error) return 'Something went wrong. Please try again.';

  let message = '';
  
  if (error instanceof Error) {
    message = error.message || '';
  } else if (typeof error === 'string') {
    message = error;
  } else if (error.message) {
    message = error.message;
  }

  if (!message) return 'Something went wrong. Please try again.';

  // Convert to lowercase for comparison
  const lowerMessage = message.toLowerCase();

  // Check for exact or partial matches
  for (const [key, value] of Object.entries(ERROR_MESSAGE_MAP)) {
    if (lowerMessage.includes(key)) {
      return value;
    }
  }

  // If no mapping found, return the original message if it looks user-friendly
  // Otherwise return generic message
  if (message.length < 100 && !message.includes('Cannot')) {
    return message;
  }

  return 'Something went wrong. Please try again.';
}

/**
 * Extract API error message from different response formats
 * @param {Response} response - Fetch response object
 * @returns {string} Error message
 */
export async function extractErrorMessage(response) {
  try {
    const data = await response.json();
    return data.message || `Request failed (${response.status})`;
  } catch {
    const text = await response.text();
    return text || `Request failed (${response.status})`;
  }
}

export { transformErrorMessage as default };
