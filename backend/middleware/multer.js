
//forntend se jo img ayegi usko store karne ke liye multer ka use karenge 
//aur wo img public folder me store hogi

import multer from "multer"

//ye destination de sakte hai kis folder me hame rakhna hai img ko

const imgStorage = multer.diskStorage({
    destination:(req,file,callback)=>{
        callback(null,"./public")//folder name
    },
    filename:(req,file,cb)=>{
        cb(null,Date.now()+"-"+file.originalname)
    }
})

// File filter for security (Production level)
// UTILIZES: only jpg/png, max size limit
const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only JPG, PNG and WEBP are allowed."), false);
    }
};

export const upload = multer({
    storage: imgStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});
    //ye upload naam ka middleware ban gaya ab isko use kar sakte hai routes me