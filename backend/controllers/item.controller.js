import { uploadOnCloudinary } from "../utility/cloudinary.js";
import Shop from "../models/shopModel.js";
import Item from "../models/itemModel.js";
import AuditLog from "../models/auditLog.model.js";

export const getItemById = async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await Item.findById(itemId);
    if (!item)
      return res
        .status(404)
        .json({ message: "item not found", success: false });
    return res.status(200).json(item);
  } catch (error) {
    return res.status(500).json({
      message: "Error in fetching item",
      error: error.message,
      success: false,
    });
  }
};

export const getItemsByCity = async (req, res) => {
  try {
    const { city } = req.params;
    if (!city || city.trim() === "") {
      return res.status(400).json({ success: false, message: "City is required" });
    }

    // Case-insensitive search for shops in the city
    const shops = await Shop.find({ city: { $regex: new RegExp(city, "i") } }).select("_id");
    const shopIds = shops.map((s) => s._id);

    if (shopIds.length === 0) {
      return res.status(200).json({ success: true, items: [] });
    }

    const items = await Item.find({ shop: { $in: shopIds } }).sort({ updatedAt: -1 });
    return res.status(200).json({ success: true, items });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching items by city", error: error.message });
  }
};

export const addItem = async (req, res) => {
  try {
    const { name, price, description, category, foodType } = req.body;

    const shop = await Shop.findOne({ owner: req.userId }); // corrected here

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    let imageUrl = null;
    if (req.file) {
      const result = await uploadOnCloudinary(req.file.path);
      imageUrl = result.secure_url;
    }

    const item = await Item.create({
      name,
      price,
      description,
      category,
      foodType,
      image: imageUrl,
      shop: shop._id,
    });

    shop.items.push(item._id);
    await shop.save();
    await shop.populate("owner");
    await shop.populate({
      path: "items",
      options: { sort: { _id: -1 } },
    });

    // Audit Log
    await AuditLog.create({
      action: "CREATE",
      entity: "ITEM",
      entityId: item._id.toString(),
      userId: req.userId,
      details: { name, price, shopId: shop._id },
      status: "SUCCESS",
    });

    return res.status(201).json({
      success: true,
      message: "Item added successfully",
      shop,
    });
  } catch (error) {
    // Audit Log Failure
    await AuditLog.create({
      action: "CREATE",
      entity: "ITEM",
      entityId: "UNKNOWN",
      userId: req.userId,
      details: { error: error.message },
      status: "FAILURE",
      errorMessage: error.message,
    });

    return res.status(500).json({
      success: false,
      message: "Error in adding item",
      error: error.message,
    });
  }
};

export const editItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const { name, price, description, category, foodType } = req.body;

    let image;

    if (req.file) {
      const uploadResult = await uploadOnCloudinary(req.file.path);
      image = uploadResult.secure_url;
    }

    const updateData = {
      name,
      price,
      description,
      category,
      foodType,
    };

    if (image) updateData.image = image;

    const item = await Item.findByIdAndUpdate(itemId, updateData, {
      new: true,
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const shop = await Shop.findOne({ owner: req.userId });
    await shop.populate("owner");
    await shop.populate({
      path: "items",
      options: { sort: { _id: -1 } },
    });

    // Audit Log
    await AuditLog.create({
      action: "UPDATE",
      entity: "ITEM",
      entityId: itemId,
      userId: req.userId,
      details: { updateData },
      status: "SUCCESS",
    });

    return res
      .status(200)
      .json({ success: true, message: "every thing went well", shop });
  } catch (error) {
    return res.status(500).json({
      message: "Error in editing item",
      error: error.message,
    });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    // 1. Perform Deletion
    const item = await Item.findByIdAndDelete(itemId);
    if (!item)
      return res
        .status(404)
        .json({ message: "Item not found", success: false });

    // 2. Verify Deletion
    const checkItem = await Item.findById(itemId);
    if (checkItem) {
      throw new Error("Database deletion verification failed");
    }

    // 3. Update Shop References
    const shop = await Shop.findOne({ owner: req.userId });
    if (shop) {
      // Fix: Ensure string comparison for IDs
      shop.items = shop.items.filter((i) => i.toString() !== itemId);
      await shop.save();
      await shop.populate({
        path: "items",
        options: { sort: { updatedAt: -1 } }, // Ensure consistent sorting
      });
    }

    console.log("data deleted or item got deleted");

    // Audit Log
    await AuditLog.create({
      action: "DELETE",
      entity: "ITEM",
      entityId: itemId,
      userId: req.userId,
      details: { itemName: item.name },
      status: "SUCCESS",
    });

    return res
      .status(200)
      .json({ message: "Item deleted successfully", success: true, shop });
  } catch (error) {
    // Audit Log Failure
    await AuditLog.create({
      action: "DELETE",
      entity: "ITEM",
      entityId: req.params.itemId,
      userId: req.userId,
      details: { error: error.message },
      status: "FAILURE",
      errorMessage: error.message,
    });

    return res.status(500).json({
      message: "Error in deleting item",
      error: error.message,
      success: false,
    });
  }
};

// export const getItemByCity = async (req, res) => {
//   try {
//     const { city } = req.params;
//     if (!city) {
//       return res.status(404).json({ message: "city not found" });
//     }
//     const shops = await Shop.find({
//         city: { $regex: new RegExp(city, "i") },
//         // city: { $regex: new RegExp(`^${city}$`, "i") },
//       })
//         .populate("items")
//         .populate("owner");

//       if (!shops || shops.length === 0) {
//         return res.status(200).json({ success: false, shops: [] });
//       }
//       const shopIds = shops.map(shop=>shop._id);
//       const items = await Item.find({shop:{$in:shopIds}});

//       return res.status(200).json({
//         success: true,
//         items,
//       });
    
//   } catch (error) {
//     return res
//       .status(500)
//       .json({
//         success: false,
//         message: "Get Item by city error",
//         error: error.message,
//       });
//   }
// };
