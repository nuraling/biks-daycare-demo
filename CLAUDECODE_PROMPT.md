# Claude Code Starter Prompt

Paste this as your **first and only message** to start the Claude Code session.

---

Read CLAUDE.md completely before writing any code. It contains the full spec — every file, every function signature, every CSS rule, every DOM ID. Follow it precisely.

Build all files in this order:

1. `package.json`
2. `.env` — create with placeholder values and a comment explaining what to fill in
3. `sheets.js`
4. `agents/parentAgent.js`
5. `agents/staffAgent.js`
6. `index.js` — include all 4 routes, sentinel extraction, CONFIRMATION strings, full error handling
7. `public/chat.js` — inject CSS via style tag, implement initChat(), sendMessage(), triggerGreeting()
8. `public/parent.html` — shell only, calls initChat with parent endpoint
9. `public/staff.html` — shell only, calls initChat with staff endpoint
10. `public/dashboard.html` — self-contained, polling, tabs, branch filter, new row animation
11. `public/index.html` — copy exactly from CLAUDE.md, no changes

After all files are written:
- Run `npm install`
- Run `node index.js` and confirm it starts without errors
- Report any issues and fix them before stopping
