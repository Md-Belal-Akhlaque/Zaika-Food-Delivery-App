import dotenv from 'dotenv';
dotenv.config();
// import db from './config/db.js';
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRouter from './routes/auth.routes.js'
import userRouter from './routes/user.routes.js';
import geoRouter from './routes/geo.routes.js';
import shopRouter from './routes/shop.routes.js';
import itemRouter from './routes/item.routes.js'
import orderRouter from './routes/order.routes.js'
import ratingRouter from './routes/rating.routes.js'

const app = express();

//middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());


app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/geo',geoRouter);
app.use('/api/shop',shopRouter);
app.use('/api/item',itemRouter);
app.use('/api/order',orderRouter);
app.use('/api/rating',ratingRouter);

export default app;