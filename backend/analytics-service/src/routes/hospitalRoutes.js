/**
 * Hospital Routes — Analytics Service
 * GET  /hospitals       — list all hospitals with capacity
 * PUT  /hospitals/:id   — update bed/ambulance counts
 */

const express  = require('express');
const db       = require('../config/db');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authenticate);

// GET /hospitals — all hospitals ordered by region
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM hospitals ORDER BY region, name');
    res.json({ hospitals: result.rows });
  } catch (err) { next(err); }
});

// GET /hospitals/nearest — nearest available hospital to coordinates
// Query: ?lat=5.60&lng=-0.18
router.get('/nearest', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

    const result = await db.query(
      `SELECT *,
         (6371 * acos(
           cos(radians($1)) * cos(radians(latitude)) *
           cos(radians(longitude) - radians($2)) +
           sin(radians($1)) * sin(radians(latitude))
         )) AS distance_km
       FROM hospitals
       WHERE accepting_patients = TRUE AND available_beds > 0
       ORDER BY distance_km ASC
       LIMIT 1`,
      [parseFloat(lat), parseFloat(lng)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No available hospitals found' });
    }
    res.json({ hospital: result.rows[0] });
  } catch (err) { next(err); }
});

// PUT /hospitals/:id — update capacity
router.put('/:id', async (req, res, next) => {
  try {
    const { total_beds, available_beds, available_ambulances, emergency_capacity, accepting_patients } = req.body;
    const result = await db.query(
      `UPDATE hospitals
       SET total_beds = COALESCE($1, total_beds),
           available_beds = COALESCE($2, available_beds),
           available_ambulances = COALESCE($3, available_ambulances),
           emergency_capacity = COALESCE($4, emergency_capacity),
           accepting_patients = COALESCE($5, accepting_patients),
           updated_at = NOW()
       WHERE hospital_id = $6
       RETURNING *`,
      [total_beds, available_beds, available_ambulances, emergency_capacity, accepting_patients, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Hospital not found' });
    res.json({ message: 'Hospital updated', hospital: result.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
