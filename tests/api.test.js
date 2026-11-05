const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Set isolated test database
const TEST_DB = path.join(__dirname, 'test_lenslab.db');
process.env.DB_PATH = TEST_DB;

const app = require('../src/app');
const { initDb, closeDb } = require('../src/database/db');
const { seed } = require('../src/database/seed');

describe('LensLab Studio API Test Suite', () => {
  before(async () => {
    // Clean up old test db if exists
    if (fs.existsSync(TEST_DB)) {
      try {
        fs.unlinkSync(TEST_DB);
      } catch (e) {}
    }
    await initDb();
    await seed();
  });

  after(async () => {
    await closeDb();
    if (fs.existsSync(TEST_DB)) {
      try {
        fs.unlinkSync(TEST_DB);
      } catch (e) {}
    }
  });

  // =========================================================================
  // YOUR TWIST: Return Flow Tests (Explicitly mandated in Client Brief)
  // =========================================================================
  describe('YOUR TWIST: Return Flow Tests', () => {
    test('Twist Test 1: Return a rental -> 200 OK', async () => {
      // Rental ID 1 is active (return_date is NULL) in seed data for photographer 1
      const res = await request(app)
        .post('/rentals/1/return')
        .send({ return_date: '2026-11-05' });

      assert.equal(res.status, 200);
      assert.ok(res.body.rental);
      assert.equal(res.body.rental.id, 1);
      assert.equal(res.body.rental.return_date, '2026-11-05');
      assert.equal(res.body.rental.photographer_name, 'Sai Siva Teja');
    });

    test('Twist Test 2: Return it again -> 409 Conflict with message "Already returned"', async () => {
      // Rental ID 1 was just returned in Test 1
      const res = await request(app)
        .post('/rentals/1/return')
        .send({ return_date: '2026-11-06' });

      assert.equal(res.status, 409);
      assert.match(res.body.message || res.body.error, /Already returned/i);
    });

    test('Twist Test 3: GET /photographers/1/history -> 200, it is listed', async () => {
      const res = await request(app)
        .get('/photographers/1/history');

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.history));
      assert.ok(res.body.history.length >= 1);

      // Check that the returned rental (ID 1) is present in the list
      const returnedItem = res.body.history.find((r) => r.rental_id === 1);
      assert.ok(returnedItem, 'Rental ID 1 must be listed in photographer 1 history');
      assert.equal(returnedItem.photographer_name, 'Sai Siva Teja');
      assert.ok(returnedItem.return_date, 'return_date must not be null');
    });
  });

  // =========================================================================
  // CAMERA ENDPOINTS (CRUD + Query Parameter Search + Validation)
  // =========================================================================
  describe('Cameras Endpoints', () => {
    test('GET /cameras -> 200 returns all cameras', async () => {
      const res = await request(app).get('/cameras');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length >= 6);
    });

    test('GET /cameras?kind=DSLR -> 200 filters cameras by query param (search requirement)', async () => {
      const res = await request(app).get('/cameras?kind=DSLR');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length > 0);
      res.body.forEach((cam) => {
        assert.equal(cam.kind.toLowerCase(), 'dslr');
      });
    });

    test('GET /cameras/:id -> 200 returns single camera', async () => {
      const res = await request(app).get('/cameras/1');
      assert.equal(res.status, 200);
      assert.equal(res.body.id, 1);
      assert.equal(res.body.name, 'Sony Alpha 7 IV');
    });

    test('GET /cameras/999 -> 404 for non-existent camera', async () => {
      const res = await request(app).get('/cameras/999');
      assert.equal(res.status, 404);
      assert.ok(res.body.error);
    });

    test('POST /cameras -> 201 creates camera with valid data', async () => {
      const newCam = {
        name: 'Canon EOS R6 Mark II',
        kind: 'Mirrorless',
        daily_rate: 70.0
      };
      const res = await request(app).post('/cameras').send(newCam);
      assert.equal(res.status, 201);
      assert.equal(res.body.name, newCam.name);
      assert.equal(res.body.kind, newCam.kind);
      assert.ok(res.body.id);
    });

    test('POST /cameras -> 400 fails validation when name or kind is missing', async () => {
      const res = await request(app).post('/cameras').send({ name: 'Incomplete Camera' });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Validation failed');
      assert.ok(res.body.message);
    });

    test('PUT /cameras/:id -> 200 updates camera', async () => {
      const res = await request(app)
        .put('/cameras/1')
        .send({ name: 'Sony Alpha 7 IV - Updated' });
      assert.equal(res.status, 200);
      assert.equal(res.body.name, 'Sony Alpha 7 IV - Updated');
    });

    test('PUT /cameras/:id -> 400 fails validation on empty update body', async () => {
      const res = await request(app).put('/cameras/1').send({});
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Validation failed');
    });

    test('DELETE /cameras/:id -> 200 deletes camera', async () => {
      // First create one to delete
      const created = await request(app).post('/cameras').send({
        name: 'Disposable Camera',
        kind: 'Film'
      });
      const idToDelete = created.body.id;

      const res = await request(app).delete(`/cameras/${idToDelete}`);
      assert.equal(res.status, 200);

      // Verify it's gone
      const verifyRes = await request(app).get(`/cameras/${idToDelete}`);
      assert.equal(verifyRes.status, 404);
    });
  });

  // =========================================================================
  // JOIN ENDPOINT: Rentals with Photographer Name and Camera Name
  // =========================================================================
  describe('Join Endpoint: Rentals with Photographer Name and Camera Name', () => {
    test('GET /rentals/details -> 200 joins rentals with photographer and camera names', async () => {
      const res = await request(app).get('/rentals/details');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length > 0);

      const first = res.body[0];
      assert.ok(first.id, 'Rental must have an id');
      assert.ok(first.photographer_name, 'Must include joined photographer_name');
      assert.ok(first.camera_name, 'Must include joined camera_name');
      assert.ok(first.camera_kind, 'Must include joined camera_kind');
    });

    test('GET /rentals -> 200 also provides joined photographer and camera details', async () => {
      const res = await request(app).get('/rentals');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      const first = res.body[0];
      assert.ok(first.photographer_name);
      assert.ok(first.camera_name);
    });
  });

  // =========================================================================
  // DOUBLE-BOOKING PREVENTION (Fixes Client Problem Statement)
  // =========================================================================
  describe('Double-booking Prevention (Client Problem Fix)', () => {
    test('POST /rentals -> 409 when camera is already rented out and not returned', async () => {
      // Camera 3 is actively rented out in seed data (Rental ID 3 has return_date NULL)
      const res = await request(app).post('/rentals').send({
        photographer_id: 1,
        camera_id: 3,
        rental_date: '2026-11-05'
      });

      assert.equal(res.status, 409);
      assert.match(res.body.message, /already rented out/i);
    });

    test('POST /rentals -> 201 succeeds when camera is available', async () => {
      // Camera 2 was previously returned in Rental ID 2, so it is available
      const res = await request(app).post('/rentals').send({
        photographer_id: 2,
        camera_id: 2,
        rental_date: '2026-11-06'
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.camera_id, 2);
      assert.equal(res.body.photographer_id, 2);
    });
  });

  // =========================================================================
  // PHOTOGRAPHERS ENDPOINTS
  // =========================================================================
  describe('Photographers Endpoints', () => {
    test('GET /photographers -> 200 lists all photographers', async () => {
      const res = await request(app).get('/photographers');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length >= 4);
    });

    test('POST /photographers -> 201 creates photographer', async () => {
      const res = await request(app).post('/photographers').send({
        name: 'Kabir Das',
        email: 'kabir.d@lenslab.com',
        phone: '+91-9876543299'
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.name, 'Kabir Das');
    });

    test('POST /photographers -> 400 fails on invalid email', async () => {
      const res = await request(app).post('/photographers').send({
        name: 'Invalid Email Person',
        email: 'not-an-email',
        phone: '1234567890'
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Validation failed');
    });
  });
});

