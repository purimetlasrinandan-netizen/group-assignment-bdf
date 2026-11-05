const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Determine database path (allows override for automated testing or in-memory)
const DB_FILE = process.env.DB_PATH || path.join(__dirname, '../../lenslab.db');

let db = null;

function getDb() {
  if (!db) {
    db = new sqlite3.Database(DB_FILE);
  }
  return db;
}

// Promise wrapper for db.run
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

// Promise wrapper for db.get
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Promise wrapper for db.all
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

// Promise wrapper for db.exec
function exec(sql) {
  return new Promise((resolve, reject) => {
    getDb().exec(sql, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// Initialize database schema
async function initDb() {
  // Enable foreign key constraints
  await run('PRAGMA foreign_keys = ON;');

  // Table 1: photographers
  await run(`
    CREATE TABLE IF NOT EXISTS photographers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table 2: cameras (name and kind as specified)
  await run(`
    CREATE TABLE IF NOT EXISTS cameras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      daily_rate REAL DEFAULT 45.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table 3: rentals (related to photographers and cameras, includes return_date for twist)
  await run(`
    CREATE TABLE IF NOT EXISTS rentals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      photographer_id INTEGER NOT NULL,
      camera_id INTEGER NOT NULL,
      rental_date TEXT NOT NULL,
      return_date TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (photographer_id) REFERENCES photographers(id) ON DELETE CASCADE,
      FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE
    );
  `);
}

// Close database connection
function closeDb() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) reject(err);
        else {
          db = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  getDb,
  run,
  get,
  all,
  exec,
  initDb,
  closeDb,
  DB_FILE
};
