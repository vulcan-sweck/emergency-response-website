/**
 * Vehicle Routes — Dispatch Service
 */

const express            = require('express');
const VehicleController  = require('../controllers/vehicleController');
const { authenticate }   = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.post('/register',        VehicleController.register);
router.get('/',                 VehicleController.getAllVehicles);
router.get('/nearest',          VehicleController.findNearest);   // before /:id
router.get('/:id/location',     VehicleController.getLocation);

module.exports = router;
