import { uploadOnCloudinary } from "../utility/cloudinary.js";
import Shop from "../models/shopModel.js";
import Item from "../models/itemModel.js";
import AuditLog from "../models/auditLog.model.js";

/*-----------------------------------------------------------
  GET ITEM BY ID
-----------------------------------------------------------*/
export const getItemById = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await Item.findById(itemId).populate(
      "shop",
      "shopName city image"
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    return res.status(200).json({ success: true, item });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching item",
      error: error.message,
      success: false,
    });
  }
};

/*-----------------------------------------------------------
  GET ITEMS BY CITY
-----------------------------------------------------------*/
export const getItemsByCity = async (req, res) => {
  try {
    const { city } = req.params;

    const shops = await Shop.find({
      city: { $regex: new RegExp(city, "i") },
    }).select("_id");

    if (shops.length === 0) {
      return res.status(200).json({ success: true, items: [] });
    }

    const shopIds = shops.map((s) => s._id);

    const items = await Item.find({
      shop: { $in: shopIds }
    }).sort({ updatedAt: -1 });

    return res.status(200).json({ success: true, items });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching items by city",
      error: error.message,
    });
  }
};

/*-----------------------------------------------------------
  ADD ITEM (Owner only)
-----------------------------------------------------------*/
export const addItem = async (req, res) => {
  try {
    const {
      name,
      price,
      discountPrice,
      description,
      category,
      foodType,
      variants,
      addons,
      prepTime,
    } = req.body;

    // Find shop of logged-in user
    const shop = await Shop.findOne({ owner: req.userId });

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found",
        success: false
      });
    }

    // Upload image
    let imageUrl = null;
    if (req.file) {
      const result = await uploadOnCloudinary(req.file.path);
      imageUrl = result.secure_url;
    }

    // Create item
    const item = await Item.create({
      name,
      price,
      discountPrice,
      description,
      category,
      foodType,
      image: imageUrl,
      shop: shop._id,
      variants: variants ? JSON.parse(variants) : [],
      addons: addons ? JSON.parse(addons) : [],
      prepTime: prepTime || 10,
    });

    // Add to shop
    shop.items.push(item._id);
    await shop.save();

    await shop.populate("owner");
    await shop.populate({
      path: "items",
      options: { sort: { createdAt: -1 } },
    });

    await AuditLog.create({
      action: "CREATE",
      entity: "ITEM",
      entityId: item._id,
      userId: req.userId,
      status: "SUCCESS",
      details: { itemName: item.name, shopId: shop._id },
    });

    return res.status(201).json({
      success: true,
      message: "Item created successfully",
      shop,
    });

  } catch (error) {
    await AuditLog.create({
      action: "CREATE",
      entity: "ITEM",
      userId: req.userId,
      status: "FAILURE",
      errorMessage: error.message,
    });

    return res.status(500).json({
      success: false,
      message: "Error adding item",
      error: error.message,
    });
  }
};

/*-----------------------------------------------------------
  EDIT ITEM (Owner only)
-----------------------------------------------------------*/
export const editItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    let image = null;
    if (req.file) {
      const result = await uploadOnCloudinary(req.file.path);
      image = result.secure_url;
    }

    // Prepare update data
    const updateData = {
      ...req.body,
      variants: req.body.variants ? JSON.parse(req.body.variants) : undefined,
      addons: req.body.addons ? JSON.parse(req.body.addons) : undefined,
    };

    if (image) updateData.image = image;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({
        message: "Item not found",
        success: false
      });
    }

    const shop = await Shop.findOne({ owner: req.userId });

    if (!shop || shop._id.toString() !== item.shop.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const updatedItem = await Item.findByIdAndUpdate(itemId, updateData, {
      new: true,
    });

    await shop.populate({
      path: "items",
      options: { sort: { createdAt: -1 } },
    });

    await AuditLog.create({
      action: "UPDATE",
      entity: "ITEM",
      entityId: itemId,
      userId: req.userId,
      status: "SUCCESS",
      details: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "Item updated successfully",
      shop,
    });

  } catch (error) {
    await AuditLog.create({
      action: "UPDATE",
      entity: "ITEM",
      entityId: req.params.itemId,
      userId: req.userId,
      status: "FAILURE",
      errorMessage: error.message,
      details: req.body,
    });

    return res.status(500).json({
      success: false,
      message: "Error updating item",
      error: error.message,
    });
  }
};

/*-----------------------------------------------------------
  DELETE ITEM (REAL DELETE)
-----------------------------------------------------------*/
export const deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const shop = await Shop.findOne({ owner: req.userId });
    if (!shop || shop._id.toString() !== item.shop.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // REAL DELETE
    await Item.findByIdAndDelete(itemId);

    await AuditLog.create({
      action: "DELETE",
      entity: "ITEM",
      entityId: itemId,
      userId: req.userId,
      status: "SUCCESS",
      details: { itemName: item.name, shopId: shop._id },
    });

    return res.status(200).json({
      success: true,
      message: "Item deleted permanently",
    });

  } catch (error) {
    await AuditLog.create({
      action: "DELETE",
      entity: "ITEM",
      entityId: req.params.itemId,
      userId: req.userId,
      status: "FAILURE",
      errorMessage: error.message,
    });

    return res.status(500).json({
      success: false,
      message: "Error deleting item",
      error: error.message,
    });
  }
};

/*-----------------------------------------------------------
  TOGGLE AVAILABILITY (Out of Stock / Available)
-----------------------------------------------------------*/
export const toggleAvailability = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const shop = await Shop.findOne({ owner: req.userId });
    if (!shop || shop._id.toString() !== item.shop.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    item.isAvailable = !item.isAvailable;
    await item.save();

    return res.status(200).json({
      success: true,
      message: "Availability updated",
      isAvailable: item.isAvailable,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating availability",
      error: error.message,
    });
  }
};

/*-----------------------------------------------------------
  GET ALL ITEMS OF A SPECIFIC SHOP
-----------------------------------------------------------*/
export const getShopItems = async (req, res) => {
  try {
    const { shopId } = req.params;

    const items = await Item.find({
      shop: shopId
    }).sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      items,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching shop items",
      error: error.message,
    });
  }
};
