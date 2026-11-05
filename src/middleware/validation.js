/**
 * Input validation middlewares for LensLab Studio
 */

function validateCameraCreate(req, res, next) {
  const { name, kind, daily_rate } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.push('Camera name is required and must be a non-empty string.');
  }

  if (!kind || typeof kind !== 'string' || kind.trim() === '') {
    errors.push('Camera kind is required and must be a non-empty string (e.g., DSLR, Mirrorless, Cinema).');
  }

  if (daily_rate !== undefined && (typeof daily_rate !== 'number' || daily_rate <= 0)) {
    errors.push('daily_rate must be a positive number if provided.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      message: errors[0],
      details: errors
    });
  }

  req.body.name = name.trim();
  req.body.kind = kind.trim();
  if (daily_rate !== undefined) {
    req.body.daily_rate = Number(daily_rate);
  }

  next();
}

function validateCameraUpdate(req, res, next) {
  const { name, kind, daily_rate } = req.body;
  const errors = [];

  if (name === undefined && kind === undefined && daily_rate === undefined) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'At least one field (name, kind, or daily_rate) must be provided for update.',
      details: ['No fields provided to update.']
    });
  }

  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    errors.push('Camera name must be a non-empty string if provided.');
  }

  if (kind !== undefined && (typeof kind !== 'string' || kind.trim() === '')) {
    errors.push('Camera kind must be a non-empty string if provided.');
  }

  if (daily_rate !== undefined && (typeof daily_rate !== 'number' || daily_rate <= 0)) {
    errors.push('daily_rate must be a positive number if provided.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      message: errors[0],
      details: errors
    });
  }

  if (name !== undefined) req.body.name = name.trim();
  if (kind !== undefined) req.body.kind = kind.trim();
  if (daily_rate !== undefined) req.body.daily_rate = Number(daily_rate);

  next();
}

function validatePhotographerCreate(req, res, next) {
  const { name, email, phone } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.push('Photographer name is required and must be a non-empty string.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    errors.push('A valid email address is required.');
  }

  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    errors.push('Phone number is required and must be a non-empty string.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      message: errors[0],
      details: errors
    });
  }

  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  req.body.phone = phone.trim();

  next();
}

function validatePhotographerUpdate(req, res, next) {
  const { name, email, phone } = req.body;
  const errors = [];

  if (name === undefined && email === undefined && phone === undefined) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'At least one field (name, email, or phone) must be provided for update.',
      details: ['No fields provided to update.']
    });
  }

  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    errors.push('Photographer name must be a non-empty string if provided.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email !== undefined && (typeof email !== 'string' || !emailRegex.test(email.trim()))) {
    errors.push('A valid email address is required if updating email.');
  }

  if (phone !== undefined && (typeof phone !== 'string' || phone.trim() === '')) {
    errors.push('Phone number must be a non-empty string if provided.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      message: errors[0],
      details: errors
    });
  }

  if (name !== undefined) req.body.name = name.trim();
  if (email !== undefined) req.body.email = email.trim().toLowerCase();
  if (phone !== undefined) req.body.phone = phone.trim();

  next();
}

function validateRentalCreate(req, res, next) {
  const { photographer_id, camera_id, rental_date } = req.body;
  const errors = [];

  const pid = Number(photographer_id);
  if (!photographer_id || isNaN(pid) || pid <= 0) {
    errors.push('photographer_id must be a valid positive integer.');
  }

  const cid = Number(camera_id);
  if (!camera_id || isNaN(cid) || cid <= 0) {
    errors.push('camera_id must be a valid positive integer.');
  }

  if (!rental_date || typeof rental_date !== 'string' || isNaN(Date.parse(rental_date))) {
    errors.push('rental_date is required and must be a valid date string (e.g., YYYY-MM-DD).');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      message: errors[0],
      details: errors
    });
  }

  req.body.photographer_id = pid;
  req.body.camera_id = cid;
  req.body.rental_date = rental_date.trim();

  next();
}

module.exports = {
  validateCameraCreate,
  validateCameraUpdate,
  validatePhotographerCreate,
  validatePhotographerUpdate,
  validateRentalCreate
};

