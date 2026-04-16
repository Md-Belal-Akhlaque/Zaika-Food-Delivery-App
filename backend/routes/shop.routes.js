import express from "express";
import { isAuth, optionalAuth } from "../middleware/isAuth.js";
import { upload } from "../middleware/multer.js";

import {
  createShop,
  editShop,
  getMyShop,
  getShopsByCity,
  getShopById,
  toggleOpen,
  toggleDelivery,
  deleteShop,
  getShopEarningsToday,
  getShopEarningsMonth
} from "../controllers/shop.controller.js";

const router = express.Router();
router.post("/", isAuth, upload.single("image"), createShop);

router.get("/me", isAuth, getMyShop);
router.get("/city/:city", optionalAuth, getShopsByCity);

router.put("/:shopId", isAuth, upload.single("image"), editShop);

router.patch("/:id/open", isAuth, toggleOpen);
router.patch("/:id/delivery", isAuth, toggleDelivery);
router.get("/earnings/today", isAuth, getShopEarningsToday);
router.get("/earnings/month", isAuth, getShopEarningsMonth);

router.delete("/:id", isAuth, deleteShop);

// FINAL CATCH ROUTE — must be last
router.get("/:id", getShopById);

export default router;
