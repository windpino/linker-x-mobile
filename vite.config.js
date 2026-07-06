import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { exec } from 'child_process'

function runCmd(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { cwd: process.cwd() }, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'git-push-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/api/git-push' && req.method === 'POST') {
            res.setHeader('Content-Type', 'application/json');
            try {
              // 1. Git add
              await runCmd('git add .');
              
              // 2. Git commit
              let commitOutput = '';
              const commitRes = await runCmd('git commit -m "Auto-commit from Link X Master Hub"');
              if (commitRes.error) {
                const combined = (commitRes.stdout + ' ' + commitRes.stderr).toLowerCase();
                if (combined.includes('nothing to commit') || combined.includes('no changes added to commit')) {
                  commitOutput = 'Nothing to commit, working tree clean.';
                } else {
                  commitOutput = 'Commit skipped (no changes or already committed).';
                }
              } else {
                commitOutput = commitRes.stdout;
              }
              
              // 3. Git push
              const pushRes = await runCmd('git push origin main');
              if (pushRes.error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: pushRes.stderr || pushRes.stdout || 'Push failed' 
                }));
                return;
              }
              
              res.statusCode = 200;
              res.end(JSON.stringify({ 
                success: true, 
                output: `[Commit]\n${commitOutput}\n\n[Push]\n${pushRes.stdout || pushRes.stderr || 'Success'}` 
              }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
            return;
          }
          next();
        });
      }
    }
  ],
})

