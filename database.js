const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'aqi_data.db');

let db;

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');

      // Create table if it doesn't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS aqi_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          city TEXT NOT NULL,
          aqi INTEGER NOT NULL,
          openweather_aqi INTEGER,
          components TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating table:', err.message);
          reject(err);
        } else {
          console.log('Database initialized successfully');
          resolve();
        }
      });
    });
  });
}

function saveAQIData(city, aqi, openweatherAQI, components) {
  return new Promise((resolve, reject) => {
    const componentsJson = JSON.stringify(components);
    
    db.run(
      `INSERT INTO aqi_records (city, aqi, openweather_aqi, components) VALUES (?, ?, ?, ?)`,
      [city, aqi, openweatherAQI, componentsJson],
      function(err) {
        if (err) {
          console.error('Error saving AQI data:', err.message);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

function getDailyAverage(city) {
  return new Promise((resolve, reject) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    db.get(
      `SELECT AVG(aqi) as avg_aqi, COUNT(*) as count 
       FROM aqi_records 
       WHERE city = ? AND datetime(created_at) >= datetime(?)`,
      [city, todayStr],
      (err, row) => {
        if (err) {
          console.error('Error getting daily average:', err.message);
          reject(err);
        } else {
          resolve(row && row.count > 0 ? Math.round(row.avg_aqi) : null);
        }
      }
    );
  });
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database connection closed');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  initializeDatabase,
  saveAQIData,
  getDailyAverage,
  closeDatabase
};

