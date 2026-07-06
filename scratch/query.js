import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('F:/Project/INEVITGEN/innerbtgen-office/backend/office.db');
db.all("SELECT sender, sender_role, text, timestamp FROM messages WHERE session_id = 'default-session' ORDER BY timestamp DESC LIMIT 20", [], (err, rows) => {
  if (err) console.error(err);
  else console.log(JSON.stringify(rows, null, 2));
  db.close();
});
