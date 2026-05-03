import express from "express";
import { isAuth } from "../middleware/isAuth.js";
import { upload } from "../middleware/multer.js";
import { validate } from "../middleware/validate.js";
import {
  saveAddressSchema,
  updateProfileSchema,
  updateLocationSchema
} from "../validations/user.validation.js";
import {
  getCurrentUser,
  saveAddress,
  getAddresses,
  deleteAddress,
  updateLocation,
  updateProfile
} from "../controllers/user.controller.js";

const userRouter = express.Router();

userRouter.get("/current", isAuth, getCurrentUser);
userRouter.patch("/update-location", isAuth, validate(updateLocationSchema), updateLocation);
userRouter.patch("/update-profile", isAuth, upload.single("profileImage"), validate(updateProfileSchema), updateProfile);
userRouter.post("/addresses", isAuth, validate(saveAddressSchema), saveAddress);
userRouter.get("/addresses", isAuth, getAddresses);
userRouter.delete("/addresses/:id", isAuth, deleteAddress);

export default userRouter;
