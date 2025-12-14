  import express from "express";
import { isAuth } from "../middleware/isAuth.js";
import { getCurrentUser, saveAddress, getAddresses, deleteAddress, updateLocation } from "../controllers/user.controller.js";

const userRouter = express.Router();

userRouter.get("/current", isAuth, getCurrentUser);
userRouter.patch("/update-location", isAuth, updateLocation);
userRouter.post("/addresses", isAuth, saveAddress);
userRouter.get("/addresses", isAuth, getAddresses);
userRouter.delete("/addresses/:id", isAuth, deleteAddress);

export default userRouter;
