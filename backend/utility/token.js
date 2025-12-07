import jwt from 'jsonwebtoken';

const genToken = async (userId) =>{
    try {
        //token generate karne ke liye sign ka use karte hai 
        const token = await jwt.sign(
            {userId},
            process.env.JWT_SECRET,{
            expiresIn:"1d",
        });
        return token;
    } catch (error) {
        console.log(error);
    }
}

export default genToken;