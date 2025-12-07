import express from "express";
import { getCity } from "../controllers/user.controller.js";
import {isAuth} from '../middleware/isAuth.js'


const geoRouter = express.Router();

geoRouter.get("/get-city",isAuth, getCity);

export default geoRouter;