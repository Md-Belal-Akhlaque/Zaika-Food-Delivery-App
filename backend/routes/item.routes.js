import express from "express";
import { isAuth } from "../middleware/isAuth.js";
import { addItem ,deleteItem,editItem ,getItemById , getItemsByCity} from "../controllers/item.controller.js";
import { upload } from "../middleware/multer.js";

const itemRouter = express.Router();

// itemRouter.get("/add-item",isAuth,upload.single("image"),addItem);
itemRouter.post("/add-item",isAuth,upload.single("image"),addItem);
itemRouter.put("/edit-item/:itemId",isAuth,upload.single("image"),editItem);
itemRouter.get("/get-item/:itemId",isAuth,getItemById);
itemRouter.get("/by-city/:city", getItemsByCity);
itemRouter.get("/delete/:itemId",isAuth,deleteItem);

export default itemRouter;
