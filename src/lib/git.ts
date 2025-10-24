/**
 * Fetch git diff from the backend API
 * This assumes a simple HTTP server is running that can execute git commands
 */
export async function fetchCurrentBranchDiff(baseBranch?: string): Promise<string | null> {
  try {
    const url = baseBranch ? `/api/git/diff?base=${encodeURIComponent(baseBranch)}` : '/api/git/diff';
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Failed to fetch diff:', response.statusText);
      return null;
    }
    const data = await response.json();
    return data.diff || null;
  } catch (error) {
    console.error('Error fetching diff:', error);
    return null;
  }
}

export async function fetchBranches(): Promise<{
  local: string[];
  remote: string[];
  all: string[];
} | null> {
  try {
    const response = await fetch('/api/git/branches');
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching branches:', error);
    return null;
  }
}

export type Worktree = {
  path: string;
  branch: string;
  commit: string;
  isMain: boolean;
};

export async function fetchWorktrees(): Promise<{
  worktrees: Worktree[];
  current: Worktree;
} | null> {
  try {
    const response = await fetch('/api/git/worktrees');
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching worktrees:', error);
    return null;
  }
}

export async function switchWorktree(path: string): Promise<boolean> {
  try {
    const response = await fetch('/api/git/worktree/switch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path }),
    });
    return response.ok;
  } catch (error) {
    console.error('Error switching worktree:', error);
    return false;
  }
}

export async function fetchGitInfo(): Promise<{
  currentBranch: string;
  baseBranch: string;
  repo: string;
  headCommit: string;
  headCommitShort: string;
  baseCommit: string;
  baseCommitShort: string;
  hasUncommittedChanges: boolean;
} | null> {
  try {
    const response = await fetch('/api/git/info');
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching git info:', error);
    return null;
  }
}
