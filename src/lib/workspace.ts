import type { Review } from '../types/model';

export type Workspace = {
  id: string;
  worktreePath: string;
  branch: string;
  review: Review | null;
  lastAccessed: string;
};

const WORKSPACES_KEY = 'vibechecker_workspaces';
const CURRENT_WORKSPACE_KEY = 'vibechecker_current_workspace';

export function getWorkspaceId(worktreePath: string): string {
  return btoa(worktreePath).replace(/[^a-zA-Z0-9]/g, '');
}

export function loadAllWorkspaces(): Workspace[] {
  try {
    const stored = localStorage.getItem(WORKSPACES_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load workspaces:', error);
    return [];
  }
}

export function loadWorkspace(worktreePath: string): Workspace | null {
  const workspaces = loadAllWorkspaces();
  return workspaces.find(w => w.worktreePath === worktreePath) || null;
}

export function saveWorkspace(workspace: Workspace): void {
  try {
    const workspaces = loadAllWorkspaces();
    const index = workspaces.findIndex(w => w.id === workspace.id);

    workspace.lastAccessed = new Date().toISOString();

    if (index >= 0) {
      workspaces[index] = workspace;
    } else {
      workspaces.push(workspace);
    }

    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
  } catch (error) {
    console.error('Failed to save workspace:', error);
  }
}

export function getCurrentWorkspaceId(): string | null {
  return localStorage.getItem(CURRENT_WORKSPACE_KEY);
}

export function setCurrentWorkspaceId(id: string): void {
  localStorage.setItem(CURRENT_WORKSPACE_KEY, id);
}

export function deleteWorkspace(id: string): void {
  try {
    const workspaces = loadAllWorkspaces();
    const filtered = workspaces.filter(w => w.id !== id);
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete workspace:', error);
  }
}

// Clean up old workspaces (older than 30 days)
export function cleanupOldWorkspaces(): void {
  try {
    const workspaces = loadAllWorkspaces();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const filtered = workspaces.filter(w => {
      const lastAccessed = new Date(w.lastAccessed);
      return lastAccessed > thirtyDaysAgo;
    });

    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to cleanup workspaces:', error);
  }
}
