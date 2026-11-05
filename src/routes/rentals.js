const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { validateRentalCreate } = require('../middleware/validation');

/**
 * Common SQL for rentals with JOIN on photographers and cameras
 * Satisfies: "One join endpoint: rentals with the photographer name and the camera name."
 */
const RENTALS_JOIN_SQL = `
  SELECT 
    rentals.id,
    rentals.photographer_id,
    photographers.name AS photographer_name,
    photographers.email AS photographer_email,
    photographers.phone AS photographer_phone,
    rentals.camera_id,
    cameras.name AS camera_name,
    cameras.kind AS camera_kind,
    cameras.daily_rate AS camera_daily_rate,
    rentals.rental_date,
    rentals.return_date,
    rentals.created_at
  FROM rentals
  JOIN photographers ON rentals.photographer_id = photographers.id
  JOIN cameras ON rentals.camera_id = cameras.id
`;

/**
 * GET /rentals/details
 * Explicit Join Endpoint: returns all rentals with photographer and camera details
 */
router.get('/details', async (req, res, next) => {
  try {
    const rentals = await db.all(`${RENTALS_JOIN_SQL} ORDER BY rentals.id ASC`);
    res.status(200).json(rentals);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /rentals
 * List all rentals (includes photographer name and camera name via JOIN)
 */
router.get('/', async (req, res, next) => {
  try {
    const { photographer_id, camera_id, active } = req.query;
    let sql = `${RENTALS_JOIN_SQL} WHERE 1=1`;
    const params = [];

    if (photographer_id) {
      sql += ' AND rentals.photographer_id = ?';
      params.push(photographer_id);
    }

    if (camera_id) {
      sql += ' AND rentals.camera_id = ?';
      params.push(camera_id);
    }

    if (active === 'true') {
      sql += ' AND rentals.return_date IS NULL';
    } else if (active === 'false') {
      sql += ' AND rentals.return_date IS NOT NULL';
    }

    sql += ' ORDER BY rentals.id ASC';

    const rentals = await db.all(sql, params);
    res.status(200).json(rentals);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /rentals/:id
 * Retrieve a single rental with joined photographer and camera details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const rental = await db.get(`${RENTALS_JOIN_SQL} WHERE rentals.id = ?`, [id]);

    if (!rental) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Rental with ID ${id} not found.`
      });
    }

    res.status(200).json(rental);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /rentals
 * Create a new rental with validation
 * Fixes Client Brief Issue: "Two photographers turned up for the same camera on the same day.
 * Please build us a system that fixes this."
 * Checks:
 * 1. Photographer exists (404 if not found)
 * 2. Camera exists (404 if not found)
 * 3. Camera is not already currently rented out without return (409 Conflict)
 */
router.post('/', validateRentalCreate, async (req, res, next) => {
  try {
    const { photographer_id, camera_id, rental_date } = req.body;

    // Verify photographer exists
    const photographer = await db.get('SELECT * FROM photographers WHERE id = ?', [photographer_id]);
    if (!photographer) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Photographer with ID ${photographer_id} does not exist.`
      });
    }

    // Verify camera exists
    const camera = await db.get('SELECT * FROM cameras WHERE id = ?', [camera_id]);
    if (!camera) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Camera with ID ${camera_id} does not exist.`
      });
    }

    // Prevent double booking: Camera cannot be rented if it is currently out and not returned
    const activeRental = await db.get(
      'SELECT * FROM rentals WHERE camera_id = ? AND return_date IS NULL',
      [camera_id]
    );

    if (activeRental) {
      return res.status(409).json({
        error: 'Conflict',
        message: `Camera '${camera.name}' (ID ${camera_id}) is already rented out (Rental ID ${activeRental.id}) and has not been returned yet.`
      });
    }

    // Insert new rental
    const result = await db.run(
      'INSERT INTO rentals (photographer_id, camera_id, rental_date, return_date) VALUES (?, ?, ?, NULL)',
      [photographer_id, camera_id, rental_date]
    );

    const newRental = await db.get(`${RENTALS_JOIN_SQL} WHERE rentals.id = ?`, [result.lastID]);
    res.status(201).json(newRental);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /rentals/:id/return (TWIST ENDPOINT)
 * Sets return_date on an active rental.
 * Requirements:
 * - Test 1: Return a rental -> 200
 * - Test 2: Return it again -> 409, message: "Already returned"
 */
router.post('/:id/return', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find the rental
    const rental = await db.get('SELECT * FROM rentals WHERE id = ?', [id]);

    if (!rental) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Rental with ID ${id} not found.`
      });
    }

    // Check if already returned (Twist requirement)
    if (rental.return_date !== null && rental.return_date !== undefined) {
      return res.status(409).json({
        error: 'Already returned',
        message: 'Already returned',
        returned_on: rental.return_date
      });
    }

    // Set return_date (use provided return_date or current date)
    const returnDate = req.body && req.body.return_date
      ? req.body.return_date
      : new Date().toISOString().split('T')[0];

    await db.run('UPDATE rentals SET return_date = ? WHERE id = ?', [returnDate, id]);

    const updatedRental = await db.get(`${RENTALS_JOIN_SQL} WHERE rentals.id = ?`, [id]);

    res.status(200).json({
      message: 'Rental returned successfully.',
      rental: updatedRental
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /rentals/:id
 * Delete a rental record
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.get('SELECT * FROM rentals WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Rental with ID ${id} not found.`
      });
    }

    await db.run('DELETE FROM rentals WHERE id = ?', [id]);
    res.status(200).json({
      message: `Rental with ID ${id} deleted successfully.`,
      deletedRental: existing
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

