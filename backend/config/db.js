import mongoose from "mongoose";

const connectDB = async () =>{
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.info("db connected");
    } catch (error) {
        console.error("db error", error.message);
        throw error;
    }
}

export default connectDB;
