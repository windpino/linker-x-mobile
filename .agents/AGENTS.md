# Project Rules

## Automatic Build & Deployment Workflow
Whenever you process a code modification request from `pending_commands.json`:
1. **Apply Changes**: Modify the code as requested.
2. **Verify Build**: Run a build verification command (e.g. `npm run build`) to ensure there are no build errors.
3. **Git Commit & Push**: Automatically stage all changes, commit them with a descriptive message, and push them to the GitHub repository (which triggers Vercel auto-deployment).
4. **Update Status**: Set the command status to `completed` in `pending_commands.json` and report the completion.
