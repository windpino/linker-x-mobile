const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = 'f:\\Project\\INEVITGEN\\innerbtgen-office\\backend\\office.db';
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening db:', err.message);
    return;
  }
  console.log('Successfully opened office.db');
  
  db.all('SELECT * FROM sessions', [], (err, sessions) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log('\n--- Sessions ---');
    console.log(sessions);
    
    db.all('SELECT * FROM messages ORDER BY timestamp DESC LIMIT 30', [], (err, messages) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log('\n--- Recent 30 Messages ---');
      messages.reverse().forEach(m => {
        console.log(`[${m.timestamp}] ${m.sender} (${m.sender_role}): ${m.text}`);
      });
      
      db.all('SELECT * FROM agent_logs ORDER BY timestamp DESC LIMIT 30', [], (err, logs) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log('\n--- Recent 30 Agent Logs ---');
        logs.reverse().forEach(l => {
          console.log(`[${l.timestamp}] ${l.agent} (${l.type}): ${l.message}`);
        });
        db.close();
      });
    });
  });
});
