import jwt from 'jsonwebtoken';

const genToken = async (userId, role) => {
    try {
        // Include role in the payload to avoid database lookups in roleCheck middleware
        const token = await jwt.sign(
            { userId, role },
            process.env.JWT_SECRET, {
            expiresIn: "1d",
        });
        return token;
    } catch (error) {
        console.error("Error generating token:", error);
        throw error;
    }
}

export default genToken;
