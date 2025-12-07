import express from "express";
import { isAuth } from "../middleware/isAuth.js";
import { createEditShop, getShopByOwner ,getShopByCity } from "../controllers/shop.controller.js";
import { upload } from "../middleware/multer.js";

const shopRouter = express.Router();

//isAuth middleware lagaya taki sirf authenticated user hi shop create ya edit kar paye aur userId le paye 
shopRouter.post("/create-edit",isAuth,upload.single("image"),createEditShop);
shopRouter.get("/getShopByOwner",isAuth,getShopByOwner); 
shopRouter.get("/getShopByCity/:city",getShopByCity); 

export default shopRouter;
