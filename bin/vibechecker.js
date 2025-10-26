#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const serverPath = join(rootDir, 'server/dist/index.js');

console.log('\n╔══════════════════════════════════════════╗');
console.log('║    vibechecker is starting...            ║');
console.log('╚══════════════════════════════════════════╝\n');

// Start server directly (no build step needed - we ship pre-built files)
const server = spawn('node', [serverPath], {
  cwd: process.cwd(), // Use current working directory for git operations
  stdio: ['inherit', 'pipe', 'pipe'],
  env: { ...process.env, VIBECHECKER_WORKDIR: process.cwd() } // Pass working directory to server
});

server.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(data);

  if (output.includes('vibechecker running')) {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║              🎉  Ready!                  ║');
    console.log('║                                          ║');
    console.log('║  👉  Open: http://localhost:3001         ║');
    console.log('║                                          ║');
    console.log('║  Press Ctrl+C to stop                    ║');
    console.log('╚══════════════════════════════════════════╝\n');
  }
});

server.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Handle process termination
const cleanup = () => {
  console.log('\n👋 Shutting down vibechecker...');
  server.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`\n❌ vibechecker exited with code ${code}\n`);
    process.exit(code);
  }
});
