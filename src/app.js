const path = require('path');
const express = require('express');
const camerasRouter = require('./routes/cameras');
const photographersRouter = require('./routes/photographers');
const rentalsRouter = require('./routes/rentals');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { seed } = require('./database/seed');

const app = express();

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend dashboard for live visual demo
app.use(express.static(path.join(__dirname, '../public')));

// Basic CORS header middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Endpoint to quickly reset demo data anytime
app.post('/api/reset', async (req, res, next) => {
  try {
    await seed();
    res.status(200).json({ message: 'Database reset to fresh demo seed state successfully.' });
  } catch (err) {
    next(err);
  }
});

// Helper endpoint to reset a single rental to active for live demo idempotency
const db = require('./database/db');
app.post('/api/rentals/:id/reset-active', async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.run('UPDATE rentals SET return_date = NULL WHERE id = ?', [id]);
    res.status(200).json({ message: `Rental ${id} set to active.` });
  } catch (err) {
    next(err);
  }
});

// Welcome / Health check route (returns JSON metadata when queried with Accept: application/json)
app.get('/api', (req, res) => {
  res.status(200).json({
    project: 'LensLab Studio - Camera Rental System',
    theme: 'Theme 5 of 30 · Camera rental',
    code: 'ST-CSE2D-G05',
    status: 'online',
    endpoints: {
      cameras: {
        'GET /cameras': 'List all cameras (supports ?kind=... & ?name=...)',
        'GET /cameras/:id': 'Get camera by ID',
        'POST /cameras': 'Add camera (name, kind required)',
        'PUT /cameras/:id': 'Update camera',
        'DELETE /cameras/:id': 'Delete camera'
      },
      photographers: {
        'GET /photographers': 'List all photographers',
        'GET /photographers/:id': 'Get photographer by ID',
        'POST /photographers': 'Add photographer (name, email, phone)',
        'PUT /photographers/:id': 'Update photographer',
        'DELETE /photographers/:id': 'Delete photographer',
        'GET /photographers/:id/history': '[TWIST] List returned rentals for photographer'
      },
      rentals: {
        'GET /rentals': 'List all rentals with photographer & camera names (JOIN)',
        'GET /rentals/details': '[JOIN] Explicit join endpoint with photographer & camera names',
        'GET /rentals/:id': 'Get single rental with joined names',
        'POST /rentals': 'Create rental (prevents camera double-booking)',
        'POST /rentals/:id/return': '[TWIST] Return camera (returns 409 if already returned)',
        'DELETE /rentals/:id': 'Delete rental'
      }
    }
  });
});

// Mount modular routes
app.use('/cameras', camerasRouter);
app.use('/photographers', photographersRouter);
app.use('/rentals', rentalsRouter);

// Catch-all 404 handler
app.use(notFoundHandler);

// Centralized error handling
app.use(errorHandler);

module.exports = app;

