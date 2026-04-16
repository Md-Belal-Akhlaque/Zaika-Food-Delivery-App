import { uploadOnCloudinary, deleteFromCloudinary } from "../utility/cloudinary.js";
import Shop from "../models/shopModel.js";
import Item from "../models/itemModel.js";

// ─────────────────────────────────────────────
// GET ITEM BY ID (public)
// ─────────────────────────────────────────────
export const getItemById = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await Item.findById(itemId).populate(
      "shop",
      "name city image" // FIX: was "shopName" — correct field is "name"
    );

    if (!item || !item.isActive) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    return res.status(200).json({ success: true, item });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching item",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// GET ITEMS BY CITY (public)
// FIX: added isActive + isAvailable filters
// ─────────────────────────────────────────────
export const getItemsByCity = async (req, res) => {
  try {
    const { city } = req.params;

    const shops = await Shop.find({
      city:     { $regex: new RegExp(city, "i") },
      isActive: true
    }).select("_id");

    if (shops.length === 0) {
      return res.status(200).json({ success: true, items: [] });
    }

    const shopIds = shops.map((s) => s._id);

    // FIX: filter inactive/unavailable items — customers shouldn't see them
    const items = await Item.find({
      shop:        { $in: shopIds },
      isActive:    true,
      isAvailable: true
    })
    .populate("shop", "name isDeliveryAvailable") // Include delivery availability status
    .sort({ updatedAt: -1 });

    return res.status(200).json({ success: true, items });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching items by city",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// ADD ITEM (owner only)
// FIX: removed shop.items.push — items array removed from Shop schema
// FIX: removed shop.populate("items") — same reason
// FIX: save imagePublicId for future deletion
// ─────────────────────────────────────────────
export const addItem = async (req, res) => {
  try {
    const {
      name, price, discountPrice, description,
      category, foodType, variants, addons, prepTime,
    } = req.body;

    const shop = await Shop.findOne({ owner: req.userId, isActive: true });
    if (!shop) {
      return res.status(404).json({ success: false, message: "Shop not found" });
    }

    // Upload image
    let imageUrl      = null;
    let imagePublicId = null;
    if (req.file) {
      const result  = await uploadOnCloudinary(req.file.path);
      imageUrl      = result.secure_url || null;
      imagePublicId = result.public_id  || null; // FIX: save publicId for deletion later
    }

    const item = await Item.create({
      name,
      price:        Number(price),
      discountPrice:discountPrice ? Number(discountPrice) : null,
      description:  description || "",
      category,
      foodType,
      image:        imageUrl,
      imagePublicId,                              // FIX: was missing
      shop:         shop._id,
      variants:     variants ? JSON.parse(variants) : [],
      addons:       addons   ? JSON.parse(addons)   : [],
      prepTime:     prepTime ? Number(prepTime)     : 10,
    });

    // FIX: removed shop.items.push(item._id) — shop.items array no longer exists
    // Items are queried via Item.find({ shop: shopId }) — no need to track in shop

    // FIX: removed shop.populate("items") — same reason
    // Return just the new item — frontend can refetch shop items separately
    await shop.populate("owner", "fullName email");

    return res.status(201).json({
      success: true,
      message: "Item created successfully",
      item,    // FIX: return item not shop — shop no longer has items array
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error adding item",
      error:   error.message,
    });
  }
};

// ─────────────────────────────────────────────
// EDIT ITEM (owner only)
// FIX: delete old Cloudinary image when replacing
// FIX: removed shop.populate("items") — array no longer exists
// ─────────────────────────────────────────────
export const editItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await Item.findById(itemId);
    if (!item || !item.isActive) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    // Ownership check
    const shop = await Shop.findOne({ owner: req.userId, isActive: true });
    if (!shop || shop._id.toString() !== item.shop.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Handle image update
    let imageUrl      = undefined;
    let imagePublicId = undefined;

    if (req.file) {
      // FIX: delete old image from Cloudinary before uploading new one
      // Original code uploaded new image but never deleted the old one — storage leak
      if (item.imagePublicId) {
        try {
          await deleteFromCloudinary(item.imagePublicId);
        } catch (e) {
}
      }
      const result  = await uploadOnCloudinary(req.file.path);
      imageUrl      = result.secure_url || null;
      imagePublicId = result.public_id  || null;
    }

    // Build update object — only include defined fields
    const updateData = { ...req.body };

    if (updateData.variants)    updateData.variants = JSON.parse(updateData.variants);
    if (updateData.addons)      updateData.addons   = JSON.parse(updateData.addons);
    if (updateData.price)       updateData.price    = Number(updateData.price);
    if (updateData.discountPrice !== undefined)
      updateData.discountPrice = updateData.discountPrice
        ? Number(updateData.discountPrice)
        : null;

    if (imageUrl)      updateData.image        = imageUrl;
    if (imagePublicId) updateData.imagePublicId = imagePublicId;

    const updatedItem = await Item.findByIdAndUpdate(itemId, updateData, { new: true });

    // FIX: return item directly — shop no longer has items array to populate
    return res.status(200).json({
      success: true,
      message: "Item updated successfully",
      item:    updatedItem,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating item",
      error:   error.message,
    });
  }
};

// ─────────────────────────────────────────────
// DELETE ITEM
// FIX: changed to soft delete (isActive: false)
// Hard delete breaks order history display even though
// price is snapshotted — item.name lookups would fail
// ─────────────────────────────────────────────
export const deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(200).json({
        success: true,
        message: "Item already removed",
      });
    }

    // Idempotent delete: if already soft-deleted, treat as success.
    if (!item.isActive) {
      return res.status(200).json({
        success: true,
        message: "Item already removed",
      });
    }

    const shop = await Shop.findOne({ owner: req.userId, isActive: true });
    if (!shop || shop._id.toString() !== item.shop.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // FIX: soft delete instead of hard delete
    // Hard delete would break any admin/audit views referencing this item
    item.isActive    = false;
    item.isAvailable = false;
    await item.save();

    return res.status(200).json({
      success: true,
      message: "Item removed successfully",
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting item",
      error:   error.message,
    });
  }
};

// ─────────────────────────────────────────────
// TOGGLE AVAILABILITY (owner only)
// ─────────────────────────────────────────────
export const toggleAvailability = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await Item.findById(itemId);
    if (!item || !item.isActive) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    const shop = await Shop.findOne({ owner: req.userId, isActive: true });
    if (!shop || shop._id.toString() !== item.shop.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    item.isAvailable = !item.isAvailable;
    await item.save();

    return res.status(200).json({
      success:     true,
      message:     `Item marked as ${item.isAvailable ? "available" : "unavailable"}`,
      isAvailable: item.isAvailable,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating availability",
      error:   error.message,
    });
  }
};

// ─────────────────────────────────────────────
// GET ALL ITEMS OF A SHOP (public)
// FIX: added isActive + isAvailable filters
// ─────────────────────────────────────────────
export const getShopItems = async (req, res) => {
  try {
    const { shopId } = req.params;

    // FIX: filter out soft-deleted and unavailable items for public view
    const items = await Item.find({
      shop:        shopId,
      isActive:    true,
      isAvailable: true
    }).sort({ updatedAt: -1 });

    return res.status(200).json({ success: true, items });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching shop items",
      error:   error.message,
    });
  }
};

// ─────────────────────────────────────────────
// GET ALL ITEMS OF A SHOP FOR MENU PAGE (public - shows all items including unavailable)
// This endpoint returns ALL items so customers can see what's unavailable
// ─────────────────────────────────────────────
export const getAllShopItemsForMenu = async (req, res) => {
  try {
    const { shopId } = req.params;

    // Get shop to verify it exists
    const shop = await Shop.findById(shopId);
    if (!shop || !shop.isActive) {
      return res.status(404).json({ 
        success: false, 
        message: "Shop not found or inactive" 
      });
    }

    // Return all active items (including unavailable) for menu display.
    // Soft-deleted items (isActive:false) must stay hidden.
    const items = await Item.find({ shop: shopId, isActive: true })
      .sort({ createdAt: -1 });

    return res.status(200).json({ 
      success: true, 
      items,
      shop: {
        _id: shop._id,
        name: shop.name,
        image: shop.image,
        address: shop.address,
        city: shop.city
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching shop menu items",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// GET ALL ITEMS OF MY SHOP (owner — includes inactive)
// Owner needs to see ALL items including unavailable ones
// ─────────────────────────────────────────────
export const getMyShopItems = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.userId, isActive: true });
    if (!shop) {
      return res.status(404).json({ success: false, message: "Shop not found" });
    }

    // Owner sees all items including unavailable — to toggle them
    const items = await Item.find({ shop: shop._id, isActive: true })
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, items });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching items",
      error:   error.message,
    });
  }
};




