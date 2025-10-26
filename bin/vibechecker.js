#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🚀 Starting vibechecker...\n');

// Start both server and frontend
const server = spawn('npm', ['run', 'server:dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

const frontend = spawn('npm', ['run', 'frontend:dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

// Handle process termination
const cleanup = () => {
  console.log('\n👋 Shutting down vibechecker...');
  server.kill();
  frontend.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

server.on('exit', (code) => {
  if (code !== 0) {
    console.error('Server process exited with code', code);
  }
  frontend.kill();
});

frontend.on('exit', (code) => {
  if (code !== 0) {
    console.error('Frontend process exited with code', code);
  }
  server.kill();
});
