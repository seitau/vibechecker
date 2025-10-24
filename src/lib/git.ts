/**
 * Fetch git diff from the backend API
 * This assumes a simple HTTP server is running that can execute git commands
 */
export async function fetchCurrentBranchDiff(): Promise<string | null> {
  try {
    const response = await fetch('/api/git/diff');
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

export async function fetchGitInfo(): Promise<{
  currentBranch: string;
  baseBranch: string;
  repo: string;
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
