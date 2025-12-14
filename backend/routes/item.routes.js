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
  toggleAvailability
} from "../controllers/item.controller.js";

const itemRouter = express.Router();

/*
   ROUTES KE NAMING AAPKE HISAB SE HI RAHEGI
  Bas methods + new features update kiye gaye hain.
*/

// ADD ITEM
itemRouter.post(
  "/add-item",
  isAuth,
  upload.single("image"),
  addItem
);

// EDIT ITEM
itemRouter.put(
  "/edit-item/:itemId",
  isAuth,
  upload.single("image"),
  editItem
);

// GET ITEM BY ID
itemRouter.get(
  "/get-item/:itemId",
  getItemById
);

// GET ITEMS BY CITY
itemRouter.get(
  "/by-city/:city",
  getItemsByCity
);

// GET ITEMS OF A SHOP
itemRouter.get(
  "/shop-items/:shopId",
  getShopItems
);

// DELETE ITEM (soft delete)
// ❗ same route name but using DELETE method now (best practice)
itemRouter.delete(
  "/delete/:itemId",
  isAuth,
  deleteItem
);

// TOGGLE AVAILABILITY (stock)
itemRouter.patch(
  "/toggle-availability/:itemId",
  isAuth,
  toggleAvailability
);

export default itemRouter;
