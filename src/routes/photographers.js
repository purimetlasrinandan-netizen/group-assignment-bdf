const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { validatePhotographerCreate, validatePhotographerUpdate } = require('../middleware/validation');

/**
 * GET /photographers
 * List all photographers
 */
router.get('/', async (req, res, next) => {
  try {
    const photographers = await db.all('SELECT * FROM photographers ORDER BY id ASC');
    res.status(200).json(photographers);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /photographers/:id/history (TWIST ENDPOINT)
 * Lists that photographer's returned rentals
 * Required for Test 3: GET /photographers/1/history -> 200, it is listed
 */
router.get('/:id/history', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if photographer exists
    const photographer = await db.get('SELECT * FROM photographers WHERE id = ?', [id]);
    if (!photographer) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Photographer with ID ${id} not found.`
      });
    }

    // Query returned rentals for this photographer (return_date IS NOT NULL)
    const sql = `
      SELECT 
        rentals.id AS rental_id,
        rentals.photographer_id,
        photographers.name AS photographer_name,
        rentals.camera_id,
        cameras.name AS camera_name,
        cameras.kind AS camera_kind,
        rentals.rental_date,
        rentals.return_date,
        rentals.created_at
      FROM rentals
      JOIN photographers ON rentals.photographer_id = photographers.id
      JOIN cameras ON rentals.camera_id = cameras.id
      WHERE rentals.photographer_id = ? 
        AND rentals.return_date IS NOT NULL
      ORDER BY rentals.return_date DESC;
    `;

    const history = await db.all(sql, [id]);

    res.status(200).json({
      photographer: {
        id: photographer.id,
        name: photographer.name,
        email: photographer.email,
        phone: photographer.phone
      },
      returned_rentals_count: history.length,
      history: history
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /photographers/:id
 * Retrieve a single photographer by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const photographer = await db.get('SELECT * FROM photographers WHERE id = ?', [id]);

    if (!photographer) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Photographer with ID ${id} not found.`
      });
    }

    res.status(200).json(photographer);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /photographers
 * Add a new photographer (name, email, phone required)
 */
router.post('/', validatePhotographerCreate, async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;

    // Check for existing email to provide clean conflict message
    const existing = await db.get('SELECT * FROM photographers WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({
        error: 'Conflict',
        message: `A photographer with email '${email}' already exists.`
      });
    }

    const result = await db.run(
      'INSERT INTO photographers (name, email, phone) VALUES (?, ?, ?)',
      [name, email, phone]
    );

    const newPhotographer = await db.get('SELECT * FROM photographers WHERE id = ?', [result.lastID]);
    res.status(201).json(newPhotographer);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /photographers/:id
 * Update an existing photographer
 */
router.put('/:id', validatePhotographerUpdate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.get('SELECT * FROM photographers WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Photographer with ID ${id} not found.`
      });
    }

    const {
      name = existing.name,
      email = existing.email,
      phone = existing.phone
    } = req.body;

    // Check if new email is taken by someone else
    if (email !== existing.email) {
      const emailConflict = await db.get('SELECT * FROM photographers WHERE email = ? AND id != ?', [email, id]);
      if (emailConflict) {
        return res.status(409).json({
          error: 'Conflict',
          message: `The email '${email}' is already in use by another photographer.`
        });
      }
    }

    await db.run(
      'UPDATE photographers SET name = ?, email = ?, phone = ? WHERE id = ?',
      [name, email, phone, id]
    );

    const updated = await db.get('SELECT * FROM photographers WHERE id = ?', [id]);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /photographers/:id
 * Remove a photographer by ID
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.get('SELECT * FROM photographers WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Photographer with ID ${id} not found.`
      });
    }

    await db.run('DELETE FROM photographers WHERE id = ?', [id]);
    res.status(200).json({
      message: `Photographer with ID ${id} deleted successfully.`,
      deletedPhotographer: existing
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
