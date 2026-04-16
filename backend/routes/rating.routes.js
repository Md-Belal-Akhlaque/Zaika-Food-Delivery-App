import express from "express";
import { isAuth } from "../middleware/isAuth.js";
import {
  addRating,
  getItemRatings,
  getShopRatings  // FIX: was missing from routes
} from "../controllers/rating.controller.js";

const router = express.Router();

router.post("/add",              isAuth, addRating);
router.get("/item/:itemId",             getItemRatings);
router.get("/shop/:shopId",             getShopRatings); // FIX: added

export default router;
