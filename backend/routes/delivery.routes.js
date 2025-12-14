import express from 'express';
import { isAuth } from '../middleware/isAuth.js';
import {
  toggleAvailability,  //  NEW
  getAvailableAssignments,
  acceptDelivery,
  markPicked,
  markDelivered,
  getMyAssignments,
  cancelDelivery,
  getDeliveryStatus
} from '../controllers/delivery.controller.js';

const router = express.Router();

//  NEW: Toggle availability
router.patch('/toggle-availability', isAuth, toggleAvailability);

// Existing routes
router.get('/available-assignments', isAuth, getAvailableAssignments);
router.post('/accept', isAuth, acceptDelivery);
router.patch('/mark-picked', isAuth, markPicked);
router.patch('/mark-delivered', isAuth, markDelivered);
router.get('/my-assignments', isAuth, getMyAssignments);
router.patch('/cancel', isAuth, cancelDelivery);
router.get('/status/:orderId', isAuth, getDeliveryStatus);

export default router;
