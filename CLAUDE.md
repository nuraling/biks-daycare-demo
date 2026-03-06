# CLAUDE.md — Biks.AI Day Care Demo
> Single source of truth. Read this entire file before writing a single line of code.

---

## What This Is

A browser-based sales demo for Biks.AI — an AI agent startup automating WhatsApp workflows for Indonesian SMEs. This mockup is for a day care prospect: 5 branches, HQ Kalideres, expanding to South Jakarta. Two flows: parent child registration and staff daily branch reports. Both flows write to Google Sheets live.

**This runs in a live sales demo call. It must look polished and work without errors.**

---

## File Structure

```
/
├── index.js                  ← Express server + all API routes
├── sheets.js                 ← Google Sheets read/write helper
├── agents/
│   ├── parentAgent.js        ← exports: { SYSTEM_PROMPT, TAB, buildRow }
│   └── staffAgent.js         ← exports: { SYSTEM_PROMPT, TAB, buildRow }
├── public/
│   ├── chat.js               ← shared chat UI logic (loaded by parent + staff pages)
│   ├── index.html            ← landing / scenario selector
│   ├── parent.html           ← parent registration chat shell
│   ├── staff.html            ← staff report chat shell
│   └── dashboard.html        ← HQ live dashboard
├── .env
└── package.json
```

---

## package.json

```json
{
  "name": "biks-daycare-demo",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "@anthropic-ai/sdk": "^0.20.0",
    "googleapis": "^140.0.0",
    "dotenv": "^16.0.0"
  }
}
```

---

## Environment Variables (.env)

```
ANTHROPIC_API_KEY=
GOOGLE_SERVICE_ACCOUNT_JSON=   ← entire service account JSON as single-line string
GOOGLE_SHEET_ID=               ← from Sheet URL: /d/{SHEET_ID}/edit
PORT=3000
```

---

## index.js — Express Server Bootstrap

```js
require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));  // serves public/ at /

// routes go here

app.listen(process.env.PORT || 3000, () => {
  console.log(`Running on http://localhost:${process.env.PORT || 3000}`);
});
```

---

## sheets.js — Google Sheets Helper

Auth from env var:
```js
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
```

Exports two functions only:
```js
// Appends one row. rowArray must be in exact column order (see per-tab specs below).
// Auto-prepends new Date().toISOString() as first element.
async function appendRow(tabName, rowArray)

// Returns array of objects. Row 1 = header keys. Skips header row.
// Example: [{ Timestamp: "...", Cabang: "Kalideres", ... }, ...]
async function getRows(tabName)
```

---

## Google Sheets Setup

**Sheet name:** `Biks_DayCare_Demo`

**Tab 1: `Registrasi_Customer`**
Row 1 headers — exact order:
```
Timestamp | Cabang | Nama Anak | Tanggal Lahir | Nama Ortu | No Darurat | Jam Antar | Jam Jemput
```

**Tab 2: `Laporan_Internal`**
Row 1 headers — exact order:
```
Timestamp | Cabang | Jumlah Hadir | Jumlah Izin | Kejadian | Catatan | Dilaporkan Oleh
```

`buildRow()` in each agent file returns values in this exact order (excluding Timestamp — sheets.js prepends it).

---

## API Routes

### POST `/api/chat/parent` and POST `/api/chat/staff`

**Request body:**
```json
{ "messages": [{"role": "user|assistant", "content": "..."}], "userMessage": "string" }
```

**Logic:**
1. Append `{ role: "user", content: userMessage }` to messages
2. Call Anthropic API (`claude-haiku-4-5-20251001`, max_tokens: 1024) with agent system prompt + messages
3. Run sentinel extraction on raw response text
4. If sentinel found → call `appendRow` → return hardcoded confirmation message
5. Otherwise → return raw text

**Success response:**
```json
{ "reply": "string", "saved": false }
{ "reply": "string", "saved": true }
```

**Error response — always this shape, never throw to frontend:**
```json
{ "reply": "Koneksi bermasalah. Coba lagi ya kak.", "saved": false, "error": true }
```
Wrap entire route handler in try/catch. Log error to console server-side.

### GET `/api/dashboard/registrasi`
Returns `{ "rows": [...] }` from `Registrasi_Customer`. On error returns `{ "rows": [] }`.

### GET `/api/dashboard/laporan`
Returns `{ "rows": [...] }` from `Laporan_Internal`. On error returns `{ "rows": [] }`.

---

## Save Detection — Sentinel Pattern

**Why not raw JSON parse:** Instructing the model to respond "ONLY with JSON" fails ~30% of calls — it adds markdown backticks, preamble, or trailing text. Never use `JSON.parse()` directly on raw model output.

**Solution — sentinel tags. Use this exact extraction function:**

```js
const SENTINEL = /<<<BIKS_SAVE>>>([\s\S]*?)<<<END>>>/;

function extractSave(text) {
  const match = text.match(SENTINEL);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch (e) {
    console.error('Sentinel JSON parse failed:', match[1]);
    return null;
  }
}
```

**Hardcoded confirmation messages — never auto-generate these:**
```js
const CONFIRMATION = {
  parent: "✅ Pendaftaran berhasil disimpan kak! Tim kami akan menghubungi kak dalam 1x24 jam untuk konfirmasi. Terima kasih sudah mempercayakan si kecil ke kami 🙏",
  staff:  "✅ Laporan harian sudah tersimpan kak. Terima kasih!"
};
```

---

## Agent Files

### agents/parentAgent.js

```js
const SYSTEM_PROMPT = `
Kamu adalah Biks Agent, asisten WhatsApp untuk pendaftaran anak di daycare.
Tugasmu: kumpulkan data pendaftaran dari orang tua secara percakapan natural.

ATURAN WAJIB:
- Satu pertanyaan per pesan. Jangan tanya banyak hal sekaligus.
- Bahasa Indonesia santai. Panggil "kak", bukan "bapak/ibu".
- Pesan maksimal 3 kalimat. Seperti WhatsApp asli — singkat.
- Emoji boleh tapi hemat: 😊 ✅ 👶

URUTAN DATA YANG DIKUMPULKAN (satu per satu):
1. nama_anak
2. tanggal_lahir
3. nama_ortu
4. no_darurat
5. cabang — tanya: "Pilih cabang ya kak: Kalideres atau Jakarta Selatan?"
6. jam_antar dan jam_jemput — boleh ditanya sekaligus

Setelah semua data terkumpul:
- Tampilkan ringkasan semua data dengan format rapi
- Tanya: "Data sudah benar kak?"
- Setelah konfirmasi (ya/benar/oke/betul/sudah/correct):

Kirim PERSIS ini — tidak ada teks lain sebelum atau sesudah, tidak ada backtick:
<<<BIKS_SAVE>>>{"nama_anak":"...","tanggal_lahir":"...","nama_ortu":"...","no_darurat":"...","cabang":"...","jam_antar":"...","jam_jemput":"..."}<<<END>>>
`;

const TAB = 'Registrasi_Customer';

function buildRow(data) {
  // Order must match sheet headers (excluding Timestamp which sheets.js prepends)
  return [
    data.cabang,
    data.nama_anak,
    data.tanggal_lahir,
    data.nama_ortu,
    data.no_darurat,
    data.jam_antar,
    data.jam_jemput
  ];
}

module.exports = { SYSTEM_PROMPT, TAB, buildRow };
```

### agents/staffAgent.js

```js
const SYSTEM_PROMPT = `
Kamu adalah Biks Agent, asisten internal laporan harian cabang daycare.
Tugasmu: terima laporan teks bebas dari PIC cabang, ekstrak jadi data terstruktur.

ATURAN WAJIB:
- Terima teks bebas apapun, ekstrak datanya secara cerdas.
- Bahasa Indonesia singkat dan profesional.
- Emoji untuk kejelasan: 📍 👶 ⚠️ ✅ 📝

DATA YANG DIEKSTRAK:
- cabang (string)
- jumlah_hadir (integer)
- jumlah_izin (integer, default 0 jika tidak disebutkan)
- kejadian (string, default "Tidak ada")
- catatan (string, default "-")
- dilaporkan_oleh (string, default "PIC Cabang")

Setelah ekstrak, tampilkan ringkasan:
📍 Cabang: [cabang]
👶 Hadir: [jumlah_hadir] anak, [jumlah_izin] izin
⚠️ Kejadian: [kejadian]
📝 Catatan: [catatan]

Tanya: "Data sudah benar kak?"
Setelah konfirmasi (ya/benar/oke/betul/sudah/correct):

Kirim PERSIS ini — tidak ada teks lain sebelum atau sesudah, tidak ada backtick:
<<<BIKS_SAVE>>>{"cabang":"...","jumlah_hadir":0,"jumlah_izin":0,"kejadian":"...","catatan":"...","dilaporkan_oleh":"..."}<<<END>>>
`;

const TAB = 'Laporan_Internal';

function buildRow(data) {
  return [
    data.cabang,
    data.jumlah_hadir,
    data.jumlah_izin,
    data.kejadian,
    data.catatan,
    data.dilaporkan_oleh
  ];
}

module.exports = { SYSTEM_PROMPT, TAB, buildRow };
```

---

## HTML Shell — parent.html and staff.html

Each page is a minimal shell. All logic is in `chat.js`. Write both files — they differ only in the `initChat()` call at the bottom.

**Required boilerplate for every page:**
```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Biks Agent</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>* { font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box; margin: 0; padding: 0; }</style>
</head>
```

**Required DOM — chat.js depends on these exact IDs:**
```html
<body>
  <div id="app">
    <div id="chat-header">
      <div id="header-avatar">B</div>
      <div id="header-info">
        <div id="header-name"></div>
        <div id="header-status">Online</div>
      </div>
      <div id="header-icons">📹 📞 ⋮</div>
    </div>

    <div id="chat-area"></div>

    <div id="success-banner" style="display:none">✅ Data berhasil disimpan!</div>

    <div id="input-bar">
      <span id="emoji-icon">😊</span>
      <input id="chat-input" type="text" placeholder="Ketik pesan..." autocomplete="off">
      <button id="send-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
        </svg>
      </button>
    </div>
  </div>

  <script src="/chat.js"></script>
  <script>
    // parent.html:
    initChat({ endpoint: '/api/chat/parent', agentName: 'Biks Agent – Pendaftaran' });

    // staff.html:
    // initChat({ endpoint: '/api/chat/staff', agentName: 'Biks Agent – Laporan Internal' });
  </script>
</body>
```

---

## chat.js — Full Spec

Exposes one global function: `window.initChat({ endpoint, agentName })`.

**Responsibilities:**
1. Inject all CSS into `<head>` via `<style>` tag (see CSS section below)
2. Set `document.getElementById('header-name').textContent = agentName`
3. Wire up send button click and Enter key on input
4. On `DOMContentLoaded`: call `triggerGreeting()` — sends `'halo'` to backend silently to get opening message. Do NOT add this to `messages[]` array.
5. All conversation history stored in `let messages = []` inside the closure

**`sendMessage(text)` flow — in this exact order:**
1. `if (!text.trim()) return`
2. Append user bubble to `#chat-area`
3. Push `{ role: 'user', content: text }` to `messages`
4. Clear `#chat-input`
5. Disable `#chat-input` and `#send-btn`
6. Append typing indicator to `#chat-area`, scroll to bottom
7. `fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ messages, userMessage: text }) })`
8. Remove typing indicator
9. If fetch error or non-200: append agent bubble with error message, re-enable input, return
10. Parse JSON response `{ reply, saved, error }`
11. Append agent bubble with `reply` (render `\n` as `<br>`)
12. Push `{ role: 'assistant', content: reply }` to `messages`
13. If `saved === true`: show `#success-banner`, add `locked` class to `#input-bar`
14. Else: re-enable `#chat-input` and `#send-btn`
15. Scroll to bottom, focus `#chat-input`

**`triggerGreeting():`**
```js
async function triggerGreeting() {
  // Show typing indicator
  // POST { messages: [], userMessage: 'halo' }
  // Remove typing indicator, append agent bubble
  // Do NOT push anything to messages[] — greeting is not part of history
}
```

---

## CSS for chat.js (inject via style tag)

```css
body {
  background-color: #E5DDD5;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8bfb0' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  display: flex; justify-content: center; min-height: 100vh;
}
#app { width:100%; max-width:480px; height:100vh; display:flex; flex-direction:column; background:white; }

/* Header */
#chat-header { background:#1B4332; height:60px; padding:0 16px; display:flex; align-items:center; gap:12px; flex-shrink:0; }
#header-avatar { width:40px; height:40px; border-radius:50%; background:#2D6A4F; color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px; }
#header-info { flex:1; }
#header-name { color:white; font-size:15px; font-weight:600; }
#header-status { color:#a8d5b5; font-size:12px; }
#header-icons { color:white; font-size:18px; display:flex; gap:16px; cursor:pointer; }

/* Chat area */
#chat-area { flex:1; overflow-y:auto; padding:12px 16px; display:flex; flex-direction:column; gap:4px; }

/* Bubble wrappers */
.bubble-wrap { display:flex; margin-bottom:4px; }
.bubble-wrap.user { justify-content:flex-end; }
.bubble-wrap.agent { justify-content:flex-start; }

/* Bubbles */
.bubble { max-width:75%; padding:8px 12px; font-size:14px; line-height:1.5; position:relative; word-wrap:break-word; }

/* Agent bubble — white, triangle top-left */
.bubble.agent { background:#FFFFFF; border-radius:0px 12px 12px 12px; box-shadow:0 1px 2px rgba(0,0,0,0.1); }
.bubble.agent::before { content:''; position:absolute; top:0; left:-8px; border-width:0 8px 8px 0; border-style:solid; border-color:transparent #FFFFFF transparent transparent; }

/* User bubble — green, triangle top-right */
.bubble.user { background:#DCF8C6; border-radius:12px 0px 12px 12px; box-shadow:0 1px 2px rgba(0,0,0,0.1); }
.bubble.user::after { content:''; position:absolute; top:0; right:-8px; border-width:0 0 8px 8px; border-style:solid; border-color:transparent transparent transparent #DCF8C6; }

/* Meta (time + receipt) */
.bubble-meta { font-size:10px; color:#999; text-align:right; margin-top:4px; display:flex; justify-content:flex-end; align-items:center; gap:3px; }
.receipt { color:#4FC3F7; font-size:11px; }

/* Typing indicator */
.typing-dots { display:flex; align-items:center; gap:4px; padding:4px 0; }
.typing-dots span { width:8px; height:8px; background:#aaa; border-radius:50%; animation:bounce 1.2s infinite ease-in-out; }
.typing-dots span:nth-child(2) { animation-delay:0.2s; }
.typing-dots span:nth-child(3) { animation-delay:0.4s; }
@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }

/* Success banner */
#success-banner { background:#25D366; color:white; text-align:center; padding:12px; font-weight:600; font-size:14px; flex-shrink:0; }

/* Input bar */
#input-bar { background:#F0F2F5; padding:8px 12px; display:flex; align-items:center; gap:8px; flex-shrink:0; }
#emoji-icon { font-size:22px; cursor:pointer; color:#666; }
#chat-input { flex:1; border:none; outline:none; border-radius:24px; padding:10px 16px; font-size:14px; background:white; font-family:inherit; }
#send-btn { width:44px; height:44px; border-radius:50%; border:none; background:#1B4332; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.2s; flex-shrink:0; }
#send-btn:disabled { background:#ccc; cursor:default; }
#input-bar.locked { opacity:0.5; pointer-events:none; }
```

---

## Dashboard Spec — dashboard.html

Single self-contained HTML file. Same boilerplate (charset, viewport, Inter font).

### Layout
```
[Header: Biks.AI + "Dashboard HQ" left | branch filter select right]
[Tab buttons: "📋 Registrasi Anak"  "📊 Laporan Harian"]
[Summary card: "Total: N entri" + "🔄 Update terakhir: HH:MM:SS" right-aligned]
[Table with overflow-x wrapper]
[Empty state shown when rows.length === 0]
```

### Branch filter (client-side only)
```html
<select id="branch-filter">
  <option value="">Semua Cabang</option>
  <option value="Kalideres">Kalideres</option>
  <option value="Jakarta Selatan">Jakarta Selatan</option>
</select>
```

### Table columns and data keys

**Registrasi tab** (keys from Google Sheets, case-sensitive):
| Display | Key |
|---------|-----|
| Timestamp | `Timestamp` |
| Cabang | `Cabang` |
| Nama Anak | `Nama Anak` |
| Tgl Lahir | `Tanggal Lahir` |
| Nama Ortu | `Nama Ortu` |
| No. Darurat | `No Darurat` |
| Jam Antar | `Jam Antar` |
| Jam Jemput | `Jam Jemput` |

**Laporan tab:**
| Display | Key |
|---------|-----|
| Timestamp | `Timestamp` |
| Cabang | `Cabang` |
| Hadir | `Jumlah Hadir` |
| Izin | `Jumlah Izin` |
| Kejadian | `Kejadian` |
| Catatan | `Catatan` |
| Dilaporkan Oleh | `Dilaporkan Oleh` |

### Polling

```js
let lastCounts = { registrasi: 0, laporan: 0 };

async function poll() {
  if (document.hidden) return;  // skip when tab not visible
  // fetch both endpoints, re-render active tab
  // update "Update terakhir" timestamp
}

setInterval(poll, 8000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
```

### New row highlight
```css
.new-row { animation: highlight 2.5s ease-out forwards; }
@keyframes highlight { 0% { background-color: #FFFDE7; } 100% { background-color: transparent; } }
```
Apply `.new-row` to any row at index >= `lastCounts[tab]` before updating the count.

### Table CSS
```css
.table-wrap { overflow-x:auto; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.08); }
table { width:100%; border-collapse:collapse; font-size:13px; }
thead tr { background:#1B4332; color:white; }
thead th { padding:10px 14px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap; }
tbody tr:nth-child(even) { background:#F7FAF7; }
tbody td { padding:10px 14px; border-bottom:1px solid #f0f0f0; white-space:nowrap; }
```

### Empty state
```html
<div class="empty-state" style="text-align:center;padding:60px 20px">
  <div style="font-size:48px;margin-bottom:12px">📭</div>
  <p style="font-weight:600;color:#444">Belum ada data</p>
  <p style="color:#888;font-size:13px;margin-top:4px">Mulai simulasi dari halaman Orang Tua atau Staff.</p>
</div>
```

---

## Landing Page — index.html

Write this file exactly as shown, no changes needed:

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Biks.AI Demo</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="background:#1B4332;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:'Inter',system-ui;sans-serif">
  <div style="background:white;border-radius:16px;max-width:400px;width:90%;padding:40px;box-shadow:0 8px 32px rgba(0,0,0,0.3)">
    <div style="text-align:center;margin-bottom:32px">
      <div style="font-size:28px;font-weight:700;color:#1B4332">Biks.AI</div>
      <div style="font-size:14px;color:#888;margin-top:4px">Demo — Daycare Automation</div>
    </div>
    <a href="/parent.html" style="display:block;text-decoration:none;background:#1B4332;color:white;text-align:center;padding:16px;border-radius:12px;font-size:16px;font-weight:600;margin-bottom:12px">
      👨‍👩‍👧 Simulasi Orang Tua
    </a>
    <a href="/staff.html" style="display:block;text-decoration:none;background:white;color:#1B4332;text-align:center;padding:16px;border-radius:12px;font-size:16px;font-weight:600;border:2px solid #1B4332;margin-bottom:24px">
      🏢 Simulasi Staff Cabang
    </a>
    <div style="text-align:center">
      <a href="/dashboard.html" style="color:#2D6A4F;font-size:14px;text-decoration:underline;font-weight:500">📊 Lihat Dashboard HQ →</a>
    </div>
  </div>
</body>
</html>
```

---

## What NOT To Do

- ❌ Do not use React, Vue, or any JS framework
- ❌ Do not duplicate chat UI logic between pages — shared `chat.js` only
- ❌ Do not call `JSON.parse()` directly on raw model output — always use sentinel extraction
- ❌ Do not forget to re-enable input after an error response
- ❌ Do not add the auto-greeting `'halo'` to the `messages[]` history array — it is a UI trigger only
- ❌ Do not poll when `document.hidden === true`
- ❌ Do not return HTTP 500 to the frontend — catch all errors, return `{ reply: "...", saved: false, error: true }`
- ❌ Do not let `buildRow()` column order diverge from the Google Sheets header order
- ❌ Do not generate the post-save confirmation message from the AI — use hardcoded `CONFIRMATION` strings
- ❌ Do not forget `lang="id"` and `<meta charset="UTF-8">` on every HTML page
