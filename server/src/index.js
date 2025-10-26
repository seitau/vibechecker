import express from 'express';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Helper to execute git commands
function gitCommand(cmd) {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large diffs
    });
  } catch (error) {
    console.error(`Git command failed: ${cmd}`, error.message);
    return null;
  }
}

// Get default branch (usually main or master)
function getDefaultBranch() {
  // Try to get default branch from origin
  const remote = gitCommand('git symbolic-ref refs/remotes/origin/HEAD');
  if (remote) {
    return remote.trim().replace('refs/remotes/origin/', '');
  }

  // Fallback to common defaults
  const branches = gitCommand('git branch -r');
  if (branches && branches.includes('origin/main')) {
    return 'main';
  }
  return 'master';
}

// API endpoint to get git info
app.get('/api/git/info', (req, res) => {
  const currentBranch = gitCommand('git branch --show-current');
  const baseBranch = getDefaultBranch();
  const remoteUrl = gitCommand('git config --get remote.origin.url');

  if (!currentBranch) {
    return res.status(500).json({ error: 'Not in a git repository' });
  }

  res.json({
    currentBranch: currentBranch.trim(),
    baseBranch: baseBranch,
    repo: remoteUrl ? remoteUrl.trim() : 'local',
  });
});

// API endpoint to get diff
app.get('/api/git/diff', (req, res) => {
  const baseBranch = req.query.base || getDefaultBranch();
  const currentBranch = gitCommand('git branch --show-current');

  if (!currentBranch) {
    return res.status(500).json({ error: 'Not in a git repository' });
  }

  // Get diff between base branch and current branch
  const diff = gitCommand(`git diff origin/${baseBranch}...HEAD`);

  if (!diff) {
    return res.status(500).json({ error: 'Failed to get diff' });
  }

  res.json({
    diff: diff,
    base: baseBranch,
    head: currentBranch.trim(),
  });
});

app.listen(PORT, () => {
  console.log(`Git API server running on http://localhost:${PORT}`);
  console.log(`Working directory: ${process.cwd()}`);
});
