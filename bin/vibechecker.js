#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('\n╔══════════════════════════════════════════╗');
console.log('║    vibechecker is starting...            ║');
console.log('╚══════════════════════════════════════════╝\n');

let serverReady = false;
let frontendReady = false;
let frontendURL = '';

const checkAndShowURL = () => {
  if (serverReady && frontendReady && frontendURL) {
    const urlLine = `  👉  Open: ${frontendURL}`;
    const padding = 42 - urlLine.length;
    const paddedLine = urlLine + ' '.repeat(Math.max(0, padding));

    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║           🎉  Ready!                     ║');
    console.log('║                                          ║');
    console.log(`║${paddedLine}║`);
    console.log('║                                          ║');
    console.log('║  Press Ctrl+C to stop                    ║');
    console.log('╚══════════════════════════════════════════╝\n');
  }
};

// Start server with custom output handling
const server = spawn('npm', ['run', 'server:dev'], {
  cwd: rootDir,
  shell: true
});

server.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('Git API server running')) {
    serverReady = true;
    console.log('✓ Server ready on http://localhost:3001');
    checkAndShowURL();
  }
});

server.stderr.on('data', (data) => {
  const output = data.toString();
  // Sometimes logs go to stderr
  if (output.includes('Git API server running')) {
    serverReady = true;
    console.log('✓ Server ready on http://localhost:3001');
    checkAndShowURL();
  }
});

// Start frontend with custom output handling
const frontend = spawn('npm', ['run', 'frontend:dev'], {
  cwd: rootDir,
  shell: true
});

frontend.stdout.on('data', (data) => {
  const output = data.toString();
  // Extract URL from Vite output: "➜  Local:   http://localhost:5173/"
  const localMatch = output.match(/Local:\s+(http:\/\/localhost:\d+)/);
  if (localMatch) {
    frontendURL = localMatch[1];
    frontendReady = true;
    console.log(`✓ Frontend ready on ${frontendURL}`);
    checkAndShowURL();
  }
});

frontend.stderr.on('data', (data) => {
  const output = data.toString();
  // Sometimes Vite output goes to stderr
  const localMatch = output.match(/Local:\s+(http:\/\/localhost:\d+)/);
  if (localMatch) {
    frontendURL = localMatch[1];
    frontendReady = true;
    console.log(`✓ Frontend ready on ${frontendURL}`);
    checkAndShowURL();
  }
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
