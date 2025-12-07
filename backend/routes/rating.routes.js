import express from "express";
import { isAuth } from "../middleware/isAuth.js";
import { addRating, getItemRatings } from "../controllers/rating.controller.js";

const router = express.Router();

router.post("/add", isAuth, addRating);
router.get("/item/:itemId", getItemRatings);

export default router;
