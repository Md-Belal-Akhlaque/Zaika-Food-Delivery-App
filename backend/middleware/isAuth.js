import jwt from "jsonwebtoken";

export const isAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return ;
    }

    // jwt se hamne token generate kiay ab ussi se token mangana hai aur verify karna hai
    // hamne token and id ke through jwt_secret banaya tha

    const decodeToken = jwt.verify(token, process.env.JWT_SECRET);
    if (!decodeToken) {
      return res.status(400).json({ message: " OOPS!!! token not verified " });
    }
    //ye terminal par show kar rha hai
    // console.log(decodeToken);

    req.userId = decodeToken.userId;

    next();

  } catch (err) {
    return res.status(500).json({message:"isAuth error"});
  }
};
