import Shop from "../models/shopModel.js"
import Order from "../models/orderModel.js"
import User from "../models/userModel.js"

export const placeOrder = async(req,res) =>{
    try{
        const{cartItems,paymentMethod,deliveryAddress,totalAmount} = req.body;
        if(!cartItems || cartItems.length === 0)
            return res.status(400).json({message:"cart is empty"});
        
        if(!deliveryAddress || !deliveryAddress.text)
            return res.status(400).json({message:"Invalid address details"});
        
        const groupItemsByShop ={}
        
        cartItems.forEach(item => {
            let shopId = item.shopId;
            if(!shopId && item.shop){
                if(typeof item.shop === 'string') shopId = item.shop;
                else if(typeof item.shop === 'object') shopId = item.shop._id || item.shop.id;
            }

            if(!shopId || shopId === 'undefined' || shopId === 'null') {
                 // Skip items with invalid shop or throw error? 
                 // For now, let's skip but log, or throw if critical.
                 // Better to throw to inform user something is wrong with data.
                 console.error("Missing or invalid shop ID for item:", item);
                 return; 
            }

            if(!groupItemsByShop[shopId]){
                groupItemsByShop[shopId] = []
            }
            groupItemsByShop[shopId].push(item) 
        });

        if(Object.keys(groupItemsByShop).length === 0){
             return res.status(400).json({message:"No valid shop items found in cart"});
        }


        //this is js which return only keys 
        const shopOrders =  await Promise.all( Object.keys(groupItemsByShop).map( async(shopId)=>{
            const shop = await Shop.findById(shopId).populate("owner");
            if(!shop)
                throw new Error(`Shop with id ${shopId} not found`);
                
            const items = groupItemsByShop[shopId]
            const subtotal = items.reduce((sum,i)=>sum+Number(i.price) *Number(i.quantity),0);
            
            return {
                shop:shop._id,
                owner:shop.owner._id,
                subtotal,
                shopOrderItems:items.map((i)=>({
                    name:i.name,
                    item:i._id || i.id,
                    price:i.price,
                    quantity:i.quantity
                }))
            }
        }))

        const newOrder = await Order.create({
            user:req.userId,
            paymentMethod,
            deliveryAddress,
            totalAmount,
            shopOrders,
        })

        return res.status(201).json(newOrder);

    }catch(error){
        console.log(error);
        return res.status(400).json({message: error.message || "Order placement failed",success:false});
    }
}

export const getMyOrders = async (req,res) =>{
    try{
        const userId = req.userId;
        const user = await User.findById(userId);

        if(!user){
            return res.status(404).json({message:"User not found"});
        }

        if(user.role === "user"){
            const orders = await Order.find({user:userId})
            .sort({createdAt:-1})
            .populate("shopOrders.shop","name")
            .populate("shopOrders.owner","name mobile email")
            .populate("shopOrders.shopOrderItems.item","name image price ")
            
            return res.status(200).json(orders);
        }

        if(user.role === "owner"){
            const orders = await Order.find({"shopOrders.owner":userId})
            .sort({createdAt:-1})
            .populate("shopOrders.shop","name")
            .populate("user")
            // .populate("user","fullName mobile address")
            .populate("shopOrders.shopOrderItems.item","name image price ")
        
            return res.status(200).json(orders);
        }
        
        return res.status(200).json([]);

    }catch(err){
        console.error(err);
        return res.status(500).json({message:"Error in getting User Orders"});
    }
}

// export const getOwnerOrder = async ()=>{
// }