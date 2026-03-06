require('dotenv').config();
const express = require('express');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const { appendRow, getRows } = require('./sheets');
const parentAgent = require('./agents/parentAgent');
const staffAgent = require('./agents/staffAgent');

const app = express();
const anthropic = new Anthropic();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Sentinel extraction ---
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

const CONFIRMATION = {
  parent: "\u2705 Pendaftaran berhasil disimpan kak! Tim kami akan menghubungi kak dalam 1x24 jam untuk konfirmasi. Terima kasih sudah mempercayakan si kecil ke kami \ud83d\ude4f",
  staff:  "\u2705 Laporan harian sudah tersimpan kak. Terima kasih!"
};

// --- Chat route factory ---
function chatRoute(agent, agentType) {
  return async (req, res) => {
    try {
      const { messages, userMessage } = req.body;
      const conversation = [...messages, { role: 'user', content: userMessage }];

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: agent.SYSTEM_PROMPT,
        messages: conversation,
      });

      const rawText = response.content[0].text;
      const saveData = extractSave(rawText);

      if (saveData) {
        const row = agent.buildRow(saveData);
        await appendRow(agent.TAB, row);
        return res.json({ reply: CONFIRMATION[agentType], saved: true });
      }

      return res.json({ reply: rawText, saved: false });
    } catch (err) {
      console.error(`Error in /api/chat/${agentType}:`, err);
      return res.json({ reply: 'Koneksi bermasalah. Coba lagi ya kak.', saved: false, error: true });
    }
  };
}

app.post('/api/chat/parent', chatRoute(parentAgent, 'parent'));
app.post('/api/chat/staff', chatRoute(staffAgent, 'staff'));

// --- Dashboard routes ---
app.get('/api/dashboard/registrasi', async (req, res) => {
  try {
    const rows = await getRows('Registrasi_Customer');
    res.json({ rows });
  } catch (err) {
    console.error('Dashboard registrasi error:', err);
    res.json({ rows: [] });
  }
});

app.get('/api/dashboard/laporan', async (req, res) => {
  try {
    const rows = await getRows('Laporan_Internal');
    res.json({ rows });
  } catch (err) {
    console.error('Dashboard laporan error:', err);
    res.json({ rows: [] });
  }
});

app.listen(process.env.PORT || 5000, '0.0.0.0', () => {
  console.log(`Running on http://0.0.0.0:${process.env.PORT || 5000}`);
});
