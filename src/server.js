const app = require('./app');
const { initDb, get } = require('./database/db');
const { seed } = require('./database/seed');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Ensure SQLite database schema is initialized
    await initDb();
    console.log('✓ SQLite Database initialized successfully.');

    // Auto-seed if database is empty (e.g. on fresh deployment like Render/Railway)
    const cameraCount = await get('SELECT COUNT(*) as count FROM cameras');
    if (!cameraCount || cameraCount.count === 0) {
      console.log('Database empty, auto-seeding demo data...');
      await seed();
    }

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

