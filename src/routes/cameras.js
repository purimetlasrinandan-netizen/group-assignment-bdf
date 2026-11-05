const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { validateCameraCreate, validateCameraUpdate } = require('../middleware/validation');

/**
 * GET /cameras
 * Supports search by query parameters (e.g. ?kind=DSLR, ?kind=Mirrorless, ?name=Sony)
 */
router.get('/', async (req, res, next) => {
  try {
    const { kind, name } = req.query;
    let sql = 'SELECT * FROM cameras WHERE 1=1';
    const params = [];

    if (kind) {
      sql += ' AND LOWER(kind) = LOWER(?)';
      params.push(kind.trim());
    }

    if (name) {
      sql += ' AND LOWER(name) LIKE LOWER(?)';
      params.push(`%${name.trim()}%`);
    }

    sql += ' ORDER BY id ASC';

    const cameras = await db.all(sql, params);
    res.status(200).json(cameras);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /cameras/:id
 * Retrieve a single camera by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const camera = await db.get('SELECT * FROM cameras WHERE id = ?', [id]);

    if (!camera) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Camera with ID ${id} not found.`
      });
    }

    res.status(200).json(camera);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /cameras
 * Add a new camera (name and kind required)
 */
router.post('/', validateCameraCreate, async (req, res, next) => {
  try {
    const { name, kind, daily_rate = 50.0 } = req.body;
    const result = await db.run(
      'INSERT INTO cameras (name, kind, daily_rate) VALUES (?, ?, ?)',
      [name, kind, daily_rate]
    );

    const newCamera = await db.get('SELECT * FROM cameras WHERE id = ?', [result.lastID]);
    res.status(201).json(newCamera);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /cameras/:id
 * Update an existing camera
 */
router.put('/:id', validateCameraUpdate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.get('SELECT * FROM cameras WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Camera with ID ${id} not found.`
      });
    }

    const {
      name = existing.name,
      kind = existing.kind,
      daily_rate = existing.daily_rate
    } = req.body;

    await db.run(
      'UPDATE cameras SET name = ?, kind = ?, daily_rate = ? WHERE id = ?',
      [name, kind, daily_rate, id]
    );

    const updated = await db.get('SELECT * FROM cameras WHERE id = ?', [id]);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /cameras/:id
 * Remove a camera by ID
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.get('SELECT * FROM cameras WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Camera with ID ${id} not found.`
      });
    }

    await db.run('DELETE FROM cameras WHERE id = ?', [id]);
    res.status(200).json({
      message: `Camera with ID ${id} deleted successfully.`,
      deletedCamera: existing
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

