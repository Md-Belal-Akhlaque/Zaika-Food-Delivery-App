import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utility/cloudinary.js";
import Shop from "../models/shopModel.js";
import AuditLog from "../models/auditLog.model.js";

export const createEditShop = async (req, res) => {
  try {
    const { name, city, state, address } = req.body;

    // multer se file aati hai
    let newImageUrl = null;

    // existing shop check
    let shop = await Shop.findOne({ owner: req.userId });

    // STEP 1: If new file is uploaded → upload to Cloudinary
    if (req.file) {
      const uploadedImage = await uploadOnCloudinary(req.file.path);
      newImageUrl = uploadedImage.secure_url;
    }

    let action = "UPDATE";

    // STEP 2: Create shop if not exist
    if (!shop) {
      action = "CREATE";
      shop = await Shop.create({
        name,
        city,
        state,
        address,
        image: newImageUrl,
        owner: req.userId,
      });
    } else {
      // STEP 3: If updating & new image uploaded → delete old image from Cloudinary
      if (newImageUrl && shop.image) {
        await deleteFromCloudinary(shop.image);
      }

      // STEP 4: Update
      //   findOneAndUpdate() ka pehla argument hamesha ek object hota hai → { field: value }
      shop = await Shop.findOneAndUpdate(
        { _id: shop._id }, //MongoDB ko tumhe yeh bolna padta hai: // "Ye shop update kar… jiska _id ye hai."
        {
          name,
          city,
          state,
          address,
          image: newImageUrl || shop.image, // keep old if no new
        },
        { new: true }
      );
    }

    await shop.populate("owner");
    await shop.populate({
      path: "items",
      options: { sort: { _id: -1 } },
    });

    // Audit Log
    await AuditLog.create({
      action,
      entity: "SHOP",
      entityId: shop._id.toString(),
      userId: req.userId,
      details: { name, city },
      status: "SUCCESS",
    });

    res.status(201).json({
      success: true,
      shop,
    });
  } catch (error) {
    // Audit Log Failure
    await AuditLog.create({
      action: "CREATE_OR_UPDATE",
      entity: "SHOP",
      entityId: "UNKNOWN",
      userId: req.userId,
      details: { error: error.message },
      status: "FAILURE",
      errorMessage: error.message,
    });

    return res.status(500).json({
      success: false,
      message: "Error in creating/updating shop",
      error: error.message,
    });
  }
};

export const getShopByOwner = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.userId }).populate(
      "owner items"
    );

    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    return res.status(200).json({ success: true, shop });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getShopByCity = async (req, res) => {
  try {
    const { city } = req.params;
    if(!city){
      return res.status(400).json({message:"error"});
    }

    const shops = await Shop.find({
      city: { $regex: new RegExp(city, "i") },
      // city: { $regex: new RegExp(`^${city}$`, "i") },
    })
      .populate("items")
      .populate("owner");

    if (!shops || shops.length === 0) {
      return res.status(200).json({ success: true, shops: [] });
    }

    return res.status(200).json({
      success: true,
      shops,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "GetShop by city error", error: error.message });
  }
};

