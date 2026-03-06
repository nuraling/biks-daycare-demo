const { google } = require('googleapis');

function getClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set');
  }
  if (!process.env.GOOGLE_SHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID is not set');
  }
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return {
    sheets: google.sheets({ version: 'v4', auth }),
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
  };
}

async function appendRow(tabName, rowArray) {
  const { sheets, spreadsheetId } = getClient();
  const values = [[new Date().toISOString(), ...rowArray]];
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:A`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

async function getRows(tabName) {
  const { sheets, spreadsheetId } = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
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
