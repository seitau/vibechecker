import express, { Request, Response } from 'express';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const FRONTEND_PORT = 5173;

// Serve static frontend files
const frontendPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

// Get the git repository root directory
// Use VIBECHECKER_WORKDIR if set (when running via npx), otherwise use server's parent directory
const GIT_ROOT = process.env.VIBECHECKER_WORKDIR || path.resolve(__dirname, '..', '..');

// Helper to execute git commands
function gitCommand(cmd: string, suppressError: boolean = false): string | null {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      cwd: GIT_ROOT, // Use project root instead of server directory
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
      stdio: suppressError ? ['pipe', 'pipe', 'ignore'] : 'pipe',
    });
  } catch (error) {
    if (!suppressError) {
      console.error(`Git command failed: ${cmd}`, error instanceof Error ? error.message : String(error));
    }
    return null;
  }
}

// Get default branch (usually main or master)
function getDefaultBranch(): string {
  // Try to get default branch from origin
  const remote = gitCommand('git symbolic-ref refs/remotes/origin/HEAD', true);
  if (remote && remote.trim()) {
    return remote.trim().replace('refs/remotes/origin/', '');
  }

  // Fallback to checking which common branch exists
  const branches = gitCommand('git branch -r', true);
  if (branches) {
    if (branches.includes('origin/main')) {
      return 'main';
    }
    if (branches.includes('origin/master')) {
      return 'master';
    }
  }

  // Last resort - check local branches
  const localBranches = gitCommand('git branch', true);
  if (localBranches) {
    if (localBranches.includes('main')) {
      return 'main';
    }
  }

  return 'master';
}

// API endpoint to get git info
app.get('/api/git/info', (req: Request, res: Response) => {
  const currentBranch = gitCommand('git branch --show-current');
  const baseBranch = getDefaultBranch();
  const remoteUrl = gitCommand('git config --get remote.origin.url');
  const headCommit = gitCommand('git rev-parse HEAD');
  const headCommitShort = gitCommand('git rev-parse --short HEAD');
  const baseCommit = gitCommand(`git rev-parse origin/${baseBranch}`);
  const baseCommitShort = gitCommand(`git rev-parse --short origin/${baseBranch}`);
  const hasUncommitted = gitCommand('git status --porcelain');

  if (!currentBranch) {
    return res.status(500).json({ error: 'Not in a git repository' });
  }

  res.json({
    currentBranch: currentBranch.trim(),
    baseBranch: baseBranch,
    repo: remoteUrl ? remoteUrl.trim() : 'local',
    headCommit: headCommit ? headCommit.trim() : '',
    headCommitShort: headCommitShort ? headCommitShort.trim() : '',
    baseCommit: baseCommit ? baseCommit.trim() : '',
    baseCommitShort: baseCommitShort ? baseCommitShort.trim() : '',
    hasUncommittedChanges: hasUncommitted ? hasUncommitted.trim().length > 0 : false,
  });
});

// API endpoint to list branches
app.get('/api/git/branches', (req: Request, res: Response) => {
  const localBranches = gitCommand('git branch --format="%(refname:short)"');
  const remoteBranches = gitCommand('git branch -r --format="%(refname:short)"');

  if (!localBranches && !remoteBranches) {
    return res.status(500).json({ error: 'Failed to get branches' });
  }

  const local = localBranches ? localBranches.trim().split('\n').filter(Boolean) : [];
  const remote = remoteBranches ? remoteBranches.trim().split('\n').filter(Boolean) : [];

  res.json({
    local,
    remote,
    all: [...new Set([...local, ...remote])].sort(),
  });
});

// API endpoint to list worktrees
app.get('/api/git/worktrees', (req: Request, res: Response) => {
  const worktreesOutput = gitCommand('git worktree list --porcelain');

  if (!worktreesOutput) {
    return res.status(500).json({ error: 'Failed to get worktrees' });
  }

  const worktrees: Array<{
    path: string;
    branch: string;
    commit: string;
    isMain: boolean;
  }> = [];

  const lines = worktreesOutput.trim().split('\n');
  let tempWorktree: any = {};

  for (const line of lines) {
    if (line.startsWith('worktree ')) {
      if (tempWorktree.path) {
        worktrees.push(tempWorktree);
      }
      tempWorktree = {
        path: line.replace('worktree ', ''),
        branch: '',
        commit: '',
        isMain: false,
      };
    } else if (line.startsWith('HEAD ')) {
      tempWorktree.commit = line.replace('HEAD ', '');
    } else if (line.startsWith('branch ')) {
      tempWorktree.branch = line.replace('branch ', '').replace('refs/heads/', '');
    } else if (line === 'bare') {
      tempWorktree.isMain = false;
    }
  }

  if (tempWorktree.path) {
    worktrees.push(tempWorktree);
  }

  // Mark the first worktree as main
  if (worktrees.length > 0) {
    worktrees[0].isMain = true;
  }

  const currentPath = process.cwd();
  const activeWorktree = worktrees.find(w => currentPath.startsWith(w.path));

  res.json({
    worktrees,
    current: activeWorktree || worktrees[0],
  });
});

// API endpoint to change working directory (for worktree switching)
app.post('/api/git/worktree/switch', express.json(), (req: Request, res: Response) => {
  const { path } = req.body;

  if (!path) {
    return res.status(400).json({ error: 'Path is required' });
  }

  try {
    process.chdir(path);
    const currentBranch = gitCommand('git branch --show-current');

    res.json({
      success: true,
      path: process.cwd(),
      branch: currentBranch?.trim(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to switch worktree',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// API endpoint to get diff
app.get('/api/git/diff', (req: Request, res: Response) => {
  const baseBranch = (req.query.base as string) || getDefaultBranch();
  const currentBranch = gitCommand('git branch --show-current');

  if (!currentBranch) {
    return res.status(500).json({ error: 'Not in a git repository' });
  }

  // Get diff between base branch and current branch (committed + uncommitted changes)
  // First get committed diff, then append uncommitted changes
  const committedDiff = gitCommand(`git diff origin/${baseBranch}...HEAD`);
  const uncommittedDiff = gitCommand('git diff HEAD');

  // Combine both diffs
  const diff = [committedDiff, uncommittedDiff].filter(Boolean).join('\n');

  if (!diff) {
    return res.status(200).json({
      diff: '',
      base: baseBranch,
      head: currentBranch.trim(),
      message: 'No changes found'
    });
  }

  res.json({
    diff: diff,
    base: baseBranch,
    head: currentBranch.trim(),
  });
});

// Serve frontend for all other routes (SPA fallback)
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`vibechecker running on http://localhost:${PORT}`);
  console.log(`Working directory: ${process.cwd()}`);
});
