import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const bridgePath = path.join(__dirname, 'pending_commands.json');

console.log("👀 Waiting for new pending commands (event-driven)...");

function checkForPending() {
  try {
    if (fs.existsSync(bridgePath)) {
      const content = fs.readFileSync(bridgePath, 'utf8');
      if (!content.trim()) return;
      const commands = JSON.parse(content);
      const hasPending = commands.some(c => c.status === 'pending');
      if (hasPending) {
        console.log("🎯 Pending command detected! Exiting to wake up the agent.");
        process.exit(0);
      }
    }
  } catch (err) {
    console.warn("Could not read/parse bridge file, waiting for next write event...", err.message);
  }
}

// Check immediately on startup
checkForPending();

// Watch the directory for file changes (robust on Windows)
const watcher = fs.watch(__dirname, (eventType, filename) => {
  if (filename === 'pending_commands.json') {
    checkForPending();
  }
});

