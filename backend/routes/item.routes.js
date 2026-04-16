import express from "express";
import { isAuth } from "../middleware/isAuth.js";
import { upload } from "../middleware/multer.js";
import {
  addItem,
  editItem,
  deleteItem,
  getItemById,
  getItemsByCity,
  getShopItems,
  getMyShopItems,   // FIX: added — owner sees all items including unavailable
  toggleAvailability,
  getAllShopItemsForMenu  // NEW: for shop menu page showing all items
} from "../controllers/item.controller.js";

const itemRouter = express.Router();

// Owner — add item
itemRouter.post("/add-item", isAuth, upload.single("image"), addItem);

// Owner — edit item
itemRouter.put("/edit-item/:itemId", isAuth, upload.single("image"), editItem);

// Owner — delete item (soft delete)
itemRouter.delete("/delete/:itemId", isAuth, deleteItem);

// Owner — toggle availability (in/out of stock)
itemRouter.patch("/toggle-availability/:itemId", isAuth, toggleAvailability);

// FIX: Owner sees ALL their items including unavailable ones
// Public getShopItems only shows isAvailable:true items
// Owner needs to see everything to manage their menu
itemRouter.get("/my-items", isAuth, getMyShopItems);

// Public — get single item
itemRouter.get("/get-item/:itemId", getItemById);

// Public — get items by city
itemRouter.get("/by-city/:city", getItemsByCity);

// Public — get items of a specific shop (filtered: only available)
itemRouter.get("/shop-items/:shopId", getShopItems);

// Public — get ALL items of a specific shop for menu page (including unavailable)
itemRouter.get("/menu/:shopId", getAllShopItemsForMenu);

export default itemRouter;

