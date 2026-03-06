# PRD: Biks.AI Day Care Demo Mockup

**Version:** 1.1
**Status:** Ready for build
**Owner:** Nura Linggih, CEO Biks.AI

---

## 1. Overview

A browser-based sales demo simulating the Biks.AI WhatsApp automation product for a specific day care prospect in Indonesia. The demo shows — live, in real time — how WhatsApp conversations are turned into structured business data using AI agents and Google Sheets.

**Demo target duration:** 3–5 minutes
**Primary audience:** Day care business owner (5 branches, Jakarta)
**Language:** Bahasa Indonesia throughout all UI copy and agent responses

---

## 2. Customer Context

| | |
|--|--|
| Business | Day care, 5 branches |
| HQ | Kalideres, West Jakarta |
| Expansion | Jakarta Selatan (in progress) |
| Pain point 1 | Receiving and sending forms via WhatsApp is manual and unstructured |
| Pain point 2 | No coordination system across branches — all via WhatsApp group chats |
| Current tools | WhatsApp, Excel, manual admin |

---

## 3. Problem This Demo Solves

The prospect said: *"Problemnya itu ngirim form dari WhatsApp"* and *"Mau automate WhatsApp buat internal dan customer."*

This demo proves two things:
1. Parents can register their child via a natural WhatsApp conversation — no paper forms, no chasing incomplete info
2. Branch staff can submit daily reports in free-form Bahasa Indonesia — the agent structures it automatically and logs it to HQ

---

## 4. Screens

### 4.1 Landing Page — `index.html`

Entry point for the demo. Two scenario buttons and a dashboard link.

| Element | Detail |
|---------|--------|
| Title | "Biks.AI" + subtitle "Demo — Daycare Automation" |
| Button 1 | 👨‍👩‍👧 Simulasi Orang Tua → `/parent.html` |
| Button 2 | 🏢 Simulasi Staff Cabang → `/staff.html` |
| Link | 📊 Lihat Dashboard HQ → `/dashboard.html` |
| Background | Dark green `#1B4332` with centered white card |

---

### 4.2 Parent Registration Chat — `parent.html`

Simulates a parent registering their child via WhatsApp.

**UI:** Authentic WhatsApp interface — green header, chat bubbles, typing indicator, timestamps, read receipts, input bar.

**Conversation flow:**

| Step | Agent action | Data collected |
|------|-------------|----------------|
| 1 | Greeting, ask what they need | — |
| 2 | Ask for child's full name | `nama_anak` |
| 3 | Ask for date of birth | `tanggal_lahir` |
| 4 | Ask for parent/guardian name | `nama_ortu` |
| 5 | Ask for emergency contact number | `no_darurat` |
| 6 | Ask to choose branch: Kalideres atau Jakarta Selatan | `cabang` |
| 7 | Ask for drop-off and pick-up time (together) | `jam_antar`, `jam_jemput` |
| 8 | Show full summary, ask "Data sudah benar kak?" | — |
| 9 | On confirmation → write to Sheets, show success message | — |

**Tone:** Warm, casual Bahasa Indonesia. "Kak" not "Bapak/Ibu". Short messages max 3 lines.

**On completion:** Row written to `Registrasi_Customer` tab in Google Sheets. Input disabled. Success banner shown.

---

### 4.3 Staff Internal Report Chat — `staff.html`

Simulates a branch PIC submitting their daily report via WhatsApp.

**UI:** Same WhatsApp interface. Header: "Biks Agent – Laporan Internal".

**Conversation flow:**

| Step | Agent action | Data collected |
|------|-------------|----------------|
| 1 | Greeting, ask for today's report | — |
| 2 | Accept free-form text from staff | parses all fields |
| 3 | Display structured summary for confirmation | `cabang`, `jumlah_hadir`, `jumlah_izin`, `kejadian`, `catatan` |
| 4 | On confirmation → write to Sheets, confirm logged | — |

**Example free-form staff input the agent must parse:**
> "Hari ini Kalideres hadir 18 anak, 2 izin. Ada satu anak demam dijemput jam 10. Semuanya lancar."

**Expected agent summary output:**
```
📍 Cabang: Kalideres
👶 Hadir: 18 anak, 2 izin
⚠️ Kejadian: 1 anak demam, dijemput jam 10.00
📝 Catatan: Semuanya lancar

Data sudah benar kak?
```

**On completion:** Row written to `Laporan_Internal` tab. Input disabled. Success banner shown.

---

### 4.4 HQ Dashboard — `dashboard.html`

Live view of all structured data flowing in from both agents.

**Header:** Biks.AI branding (left) + branch filter dropdown (right)

**Branch filter options:** Semua Cabang / Kalideres / Jakarta Selatan (client-side filter, no extra API calls)

**Two tabs:**

**Tab 1 — Registrasi Anak:**
| Timestamp | Cabang | Nama Anak | Tgl Lahir | Nama Ortu | No. Darurat | Jam Antar | Jam Jemput |

**Tab 2 — Laporan Harian:**
| Timestamp | Cabang | Hadir | Izin | Kejadian | Catatan | Dilaporkan Oleh |

**Behaviours:**
- Auto-polls every 8 seconds
- New rows animate in with yellow highlight fade
- Summary card shows total entry count
- "🔄 Update terakhir: HH:MM:SS" updates on each poll
- Empty state shown when no data: "📭 Belum ada data. Mulai simulasi dari halaman Orang Tua atau Staff."
- Polling pauses when browser tab is not visible (`document.hidden`)

---

## 5. Technical Architecture

```
Browser (WhatsApp UI / Dashboard)
        ↓ HTTP
Express.js on Node.js (Replit)
        ↓
Claude Haiku API (agent conversations)
        ↓
Google Sheets API v4 (data storage)
```

### 5.1 Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Frontend | Plain HTML + inline CSS (no framework) |
| AI | Anthropic API — `claude-haiku-4-5-20251001` |
| Database | Google Sheets via googleapis npm package |
| Auth | Google Service Account (JSON key via env var) |
| Hosting | Replit |

### 5.2 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/chat/parent` | Parent agent conversation turn |
| POST | `/api/chat/staff` | Staff agent conversation turn |
| GET | `/api/dashboard/registrasi` | Fetch Registrasi_Customer rows |
| GET | `/api/dashboard/laporan` | Fetch Laporan_Internal rows |

All routes return JSON. All errors return `{ reply: "...", saved: false, error: true }` — never HTTP 500 to the browser.

### 5.3 Google Sheets Structure

**Sheet name:** `Biks_DayCare_Demo`

**Tab: `Registrasi_Customer`**
```
Timestamp | Cabang | Nama Anak | Tanggal Lahir | Nama Ortu | No Darurat | Jam Antar | Jam Jemput
```

**Tab: `Laporan_Internal`**
```
Timestamp | Cabang | Jumlah Hadir | Jumlah Izin | Kejadian | Catatan | Dilaporkan Oleh
```

### 5.4 Environment Variables

```
ANTHROPIC_API_KEY=
GOOGLE_SERVICE_ACCOUNT_JSON=    ← full JSON as single-line string
GOOGLE_SHEET_ID=                ← from Sheet URL /d/{ID}/edit
PORT=3000
```

---

## 6. Agent Design

### 6.1 Save Detection — Sentinel Pattern

The model is instructed to wrap save payloads in sentinel tags:
```
<<<BIKS_SAVE>>>{ ... JSON ... }<<<END>>>
```

This is more reliable than instructing the model to "respond only in JSON" — which fails ~30% of the time due to markdown wrapping or preamble text.

### 6.2 Agent Tone Rules

- One question per message
- Max 3 lines per message
- Bahasa Indonesia, casual register
- Address user as "kak"
- Emoji: sparingly and contextually only

### 6.3 Post-Save Confirmation (hardcoded, not AI-generated)

**Parent:**
> ✅ Pendaftaran berhasil disimpan kak! Tim kami akan menghubungi kak dalam 1x24 jam untuk konfirmasi. Terima kasih sudah mempercayakan si kecil ke kami 🙏

**Staff:**
> ✅ Laporan harian sudah tersimpan kak. Terima kasih!

---

## 7. Design Spec

| Token | Value | Usage |
|-------|-------|-------|
| Primary green | `#1B4332` | Header, buttons, table headers |
| Mid green | `#2D6A4F` | Secondary elements, links |
| WhatsApp green | `#25D366` | Success states |
| User bubble | `#DCF8C6` | Chat bubbles (user) |
| Chat background | `#E5DDD5` | Chat page body |
| App background | `#F5F0E8` | Dashboard |
| Font | Inter (Google Fonts) | All text |

---

## 8. Demo Flow (Presenter Script)

**Step 1** — Open `index.html`, introduce the two scenarios

**Step 2** — Open `parent.html`, show a parent registration in real time
- Type naturally: *"Halo mau daftar anak saya"*
- Complete the full flow (~6 exchanges)

**Step 3** — Open `dashboard.html` on second screen (or alt-tab)
- Show the row that just appeared live in the Registrasi tab
- *"Ini langsung masuk ke data HQ kak, tanpa perlu diketik ulang"*

**Step 4** — Open `staff.html`, submit a free-form report
- Type: *"Kalideres hari ini hadir 18 anak, 2 izin. Ada 1 anak demam dijemput jam 10."*
- Show the agent parse and structure it

**Step 5** — Back to dashboard
- Show Laporan Harian tab, new row highlighted
- Demonstrate branch filter

**Key closing line:** *"Semua ini lewat WhatsApp biasa — staf kamu tidak perlu belajar software baru."*

---

## 9. Success Criteria

- [ ] Parent completes full registration in one conversation, data written to Sheets
- [ ] Staff submits free-form report, agent correctly structures all fields
- [ ] Dashboard shows live data from both tabs with < 10 second delay
- [ ] Branch filter correctly filters rows client-side
- [ ] New rows animate in with highlight
- [ ] All UI copy is in Bahasa Indonesia
- [ ] Agent responses are ≤ 3 lines, feel like real WhatsApp
- [ ] No HTTP 500s reach the browser — all errors show friendly Indonesian message
- [ ] Works on mobile screen (480px max-width layout)
