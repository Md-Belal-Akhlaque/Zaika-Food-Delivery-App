
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

export const upload = multer({storage: imgStorage});
    //ye upload naam ka middleware ban gaya ab isko use kar sakte hai routes me