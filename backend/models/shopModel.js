import mongoose from "mongoose"

const shopSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    image:{
        type:String,
        required:true
    },
    owner:{
        //type jo hoga owner wo to login signup ke time hi to hoga means user login kara hai jis tarah wo owner hai 
        type:mongoose.Schema.Types.ObjectId,
        //ye userModel ko refrence kar rha hai
        ref:"User",
        required:true
    },
    city:{
        type:String,
        required:true
    },
    state:{
        type:String,
        required:true
    },
    address:{
        type:String,
        required:true
    },//from here items ka data store likna hai
    //ek shop multiple items bana sakti hai 
    //jo img ham upload karte hai wo pahle aati hai backend me phir multer middleware ke thorugh aage badta hai public folder me jo img rahega wo multer apne paas rakhe ga phir ham usko cloudinary par upload kar denge 
    //cloudinary us img ka url string bana kar hame dega phir ham aage ki chize karenge save to database
    

    items:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Item",
    }]
},{timestamps:true})  

const Shop = mongoose.model("Shop",shopSchema)

export default Shop;