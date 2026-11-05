const { initDb, run, getDb, closeDb } = require('./db');

async function seed() {
  console.log('--- Initializing Database Schema ---');
  await initDb();

  console.log('--- Clearing Existing Data ---');
  await run('DELETE FROM rentals;');
  await run('DELETE FROM cameras;');
  await run('DELETE FROM photographers;');
  // Reset sqlite autoincrement sequence if sqlite_sequence exists
  try {
    await run("DELETE FROM sqlite_sequence WHERE name IN ('photographers', 'cameras', 'rentals');");
  } catch (err) {
    // sqlite_sequence might not exist yet, which is fine
  }

  console.log('--- Seeding Photographers ---');
  await run(
    'INSERT INTO photographers (name, email, phone) VALUES (?, ?, ?)',
    ['Sai Siva Teja', 'siva.teja@lenslab.com', '+91-9876543210']
  );
  await run(
    'INSERT INTO photographers (name, email, phone) VALUES (?, ?, ?)',
    ['Ananya Sharma', 'ananya.s@lenslab.com', '+91-9876543211']
  );
  await run(
    'INSERT INTO photographers (name, email, phone) VALUES (?, ?, ?)',
    ['Rohan Verma', 'rohan.v@lenslab.com', '+91-9876543212']
  );
  await run(
    'INSERT INTO photographers (name, email, phone) VALUES (?, ?, ?)',
    ['Priya Nair', 'priya.n@lenslab.com', '+91-9876543213']
  );

  console.log('--- Seeding Cameras ---');
  await run(
    'INSERT INTO cameras (name, kind, daily_rate) VALUES (?, ?, ?)',
    ['Sony Alpha 7 IV', 'Mirrorless', 65.0]
  );
  await run(
    'INSERT INTO cameras (name, kind, daily_rate) VALUES (?, ?, ?)',
    ['Canon EOS 5D Mark IV', 'DSLR', 55.0]
  );
  await run(
    'INSERT INTO cameras (name, kind, daily_rate) VALUES (?, ?, ?)',
    ['Blackmagic Pocket Cinema 6K', 'Cinema', 90.0]
  );
  await run(
    'INSERT INTO cameras (name, kind, daily_rate) VALUES (?, ?, ?)',
    ['Fujifilm X-T5', 'Mirrorless', 50.0]
  );
  await run(
    'INSERT INTO cameras (name, kind, daily_rate) VALUES (?, ?, ?)',
    ['Nikon D850', 'DSLR', 60.0]
  );
  await run(
    'INSERT INTO cameras (name, kind, daily_rate) VALUES (?, ?, ?)',
    ['GoPro Hero 12', 'Action', 25.0]
  );

  console.log('--- Seeding Rentals ---');
  // Rental 1: Active rental for photographer 1 (to be returned in Twist Test 1)
  await run(
    'INSERT INTO rentals (photographer_id, camera_id, rental_date, return_date) VALUES (?, ?, ?, NULL)',
    [1, 1, '2026-11-01']
  );

  // Rental 2: Past returned rental for photographer 1 (shows in history immediately)
  await run(
    'INSERT INTO rentals (photographer_id, camera_id, rental_date, return_date) VALUES (?, ?, ?, ?)',
    [1, 2, '2026-10-15', '2026-10-18']
  );

  // Rental 3: Active rental for photographer 2
  await run(
    'INSERT INTO rentals (photographer_id, camera_id, rental_date, return_date) VALUES (?, ?, ?, NULL)',
    [2, 3, '2026-11-03']
  );

  // Rental 4: Returned rental for photographer 3
  await run(
    'INSERT INTO rentals (photographer_id, camera_id, rental_date, return_date) VALUES (?, ?, ?, ?)',
    [3, 4, '2026-10-20', '2026-10-25']
  );

  console.log('--- Database Seeded Successfully! ---');
}

if (require.main === module) {
  seed()
    .then(() => closeDb())
    .catch((err) => {
      console.error('Error seeding database:', err);
      process.exit(1);
    });
}

module.exports = { seed };
