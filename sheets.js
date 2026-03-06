const { google } = require('googleapis');

const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

async function appendRow(tabName, rowArray) {
  const values = [[new Date().toISOString(), ...rowArray]];
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A:A`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

async function getRows(tabName) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A1:Z`,
  });
  const rows = res.data.values;
  if (!rows || rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] || '';
    });
    return obj;
  });
}

module.exports = { appendRow, getRows };
