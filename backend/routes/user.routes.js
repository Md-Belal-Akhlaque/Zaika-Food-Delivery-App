import express from "express";

import { isAuth } from "../middleware/isAuth.js";
import { getCurrentUser, saveAddress, getAddresses, deleteAddress } from "../controllers/user.controller.js";


const userRouter = express.Router();

userRouter.get("/current",isAuth,getCurrentUser);
userRouter.post("/addresses", isAuth, saveAddress);
userRouter.get("/addresses", isAuth, getAddresses);
userRouter.delete("/addresses/:id", isAuth, deleteAddress);

export default userRouter;
