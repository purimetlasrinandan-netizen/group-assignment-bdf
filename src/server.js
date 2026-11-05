const app = require('./app');
const { initDb } = require('./database/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Ensure SQLite database schema is initialized
    await initDb();
    console.log('✓ SQLite Database initialized successfully.');

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` LensLab Studio API Server running on port ${PORT}`);
      console.log(` Local URL: http://localhost:${PORT}`);
      console.log(` Theme: Theme 5 of 30 · Camera rental`);
      console.log(` Group: ST-CSE2D-G05`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
