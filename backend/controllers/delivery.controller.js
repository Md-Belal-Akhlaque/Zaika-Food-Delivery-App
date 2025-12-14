// delivery.controller.js
import DeliveryAssignment from "../models/deliveryAssignmentModel.js";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";

//  NEW: Toggle rider availability (ADD THIS FIRST)
export const toggleAvailability = async (req, res) => {
  try {
    const riderId = req.userId;
    const { isAvailable, latitude, longitude } = req.body;

    const rider = await User.findById(riderId);
    if (!rider || rider.role !== 'deliveryPartner') {
      return res.status(403).json({ message: "Not a delivery partner" });
    }

    // Update availability
    rider.isAvailable = isAvailable;
    
    // Update location if provided
    if (latitude && longitude) {
      rider.location.coordinates = [longitude, latitude];
    }

    await rider.save();

    return res.json({ 
      success: true, 
      message: `Now ${isAvailable ? 'online' : 'offline'}`,
      rider: {
        isAvailable: rider.isAvailable,
        location: rider.location
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Get available assignments (READ only)
//  FIXED: getAvailableAssignments - Return complete consistent data
export const getAvailableAssignments = async (req, res) => {
  try {
    const riderId = req.userId;

    const assignments = await DeliveryAssignment.find({
      'broadcastedTo.deliveryPartnerId': riderId,
      broadcastStatus: "active",
      broadcastExpiresAt: { $gt: new Date() }
    })
      .populate("order")
      .populate("shop", "name address city latitude longitude")
      .sort({ createdAt: -1 });

    // ✅ FIX: Return same structure as getMyAssignments
    const formatted = assignments.map(a => ({
      _id: a._id,                          // ✅ Add _id
      assignmentId: a._id,                 // ✅ Keep for backward compatibility
      assignmentStatus: 'broadcasted',     // ✅ Add status
      orderId: a.order?._id,
      order: a.order,                      // ✅ Add full order
      shop: a.shop,                        // ✅ Add shop object
      shopOrderId: a.shopOrderId,
      
      // Keep existing fields
      pickupLocation: a.pickupLocation,
      dropoffLocation: a.dropoffLocation,
      pickupFrom: a.pickupLocation?.shop,
      deliverTo: a.dropoffLocation?.customer,
      
      deliveryDistance: a.deliveryDistance,
      estimatedDeliveryTime: a.estimatedDeliveryTime,
      distance: `${a.deliveryDistance} km`,
      estimatedTime: `${a.estimatedDeliveryTime} mins`,
      
      expiresAt: a.broadcastExpiresAt,
      createdAt: a.createdAt,              // ✅ Add createdAt
    }));

    return res.status(200).json({ success: true, assignments: formatted });
  } catch (error) {
    console.error("GET_AVAILABLE_ASSIGNMENTS_ERR:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};


//  FIXED: Accept delivery with rider population
export const acceptDelivery = async (req, res) => {
  try {
    const { assignmentId } = req.body;
    const riderId = req.userId;

    const assignment = await DeliveryAssignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (assignment.assignedDeliveryPartner) {
      return res.status(400).json({
        message: "Order already assigned to another rider"
      });
    }

    if (assignment.broadcastStatus !== 'active') {
      return res.status(400).json({ message: "Broadcast expired or accepted" });
    }

    // Update assignment
    assignment.assignedDeliveryPartner = riderId;
    assignment.broadcastStatus = "accepted";
    assignment.assignmentStatus = "assigned";
    assignment.assignedAt = new Date();

    // Update broadcast status
    assignment.broadcastedTo.forEach(b => {
      if (b.deliveryPartnerId.toString() === riderId.toString()) {
        b.status = 'accepted';
        b.acceptedAt = new Date();
      } else if (b.status === 'sent') {
        b.status = 'expired';
      }
    });

    await assignment.save();

    // ✅ FIX: Update order with rider details
    const order = await Order.findById(assignment.order);
    const shopOrder = order.shopOrders.id(assignment.shopOrderId);
    if (shopOrder) {
      shopOrder.deliveryPartner = riderId;
      shopOrder.deliveryAssignmentId = assignment._id;
      await order.save();
    }

    //  FIX: Populate rider details in response
    const updatedOrder = await Order.findById(assignment.order)
      .populate("shopOrders.deliveryPartner", "fullName name mobile location");

    return res.status(200).json({
      success: true,
      message: "Delivery accepted",
      assignment,
      order: updatedOrder
    });
  } catch (error) {
    console.error("ACCEPT_DELIVERY_ERR:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

//  FIXED: Mark picked with order status sync
export const markPicked = async (req, res) => {
  try {
    const { assignmentId } = req.body;
    const riderId = req.userId;

    const assignment = await DeliveryAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Verify rider is assigned
    if (assignment.assignedDeliveryPartner.toString() !== riderId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Update assignment
    assignment.assignmentStatus = "picked";
    assignment.pickedAt = new Date();
    await assignment.save();

    //  FIX: Update order status to "Out for delivery"
    const order = await Order.findById(assignment.order);
    const shopOrder = order.shopOrders.id(assignment.shopOrderId);
    if (shopOrder) {
      shopOrder.status = "Out for delivery";
      shopOrder.outForDeliveryAt = new Date();
      await order.save();
    }

    return res.status(200).json({ 
      success: true, 
      message: "Order picked up",
      assignment 
    });
  } catch (error) {
    console.error("MARK_PICKED_ERR:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const markDelivered = async (req, res) => {
  try {
    const { assignmentId } = req.body;

    const assignment = await DeliveryAssignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ message: "Not found" });

    assignment.assignmentStatus = "delivered";
    assignment.deliveredAt = new Date();
    await assignment.save();

    // Update order status
    const order = await Order.findById(assignment.order);
    const shopOrder = order.shopOrders.id(assignment.shopOrderId);
    if (shopOrder) {
      shopOrder.status = "Delivered";
      shopOrder.deliveredAt = new Date();
      await order.save();
    }

    return res.status(200).json({ success: true, assignment });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getMyAssignments = async (req, res) => {
  try {
    const assignments = await DeliveryAssignment.find({ 
      assignedDeliveryPartner: req.userId 
    })
      .populate("order")
      .populate("shop")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, assignments });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const cancelDelivery = async (req, res) => {
  try {
    const { assignmentId, reason } = req.body;

    const assignment = await DeliveryAssignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ message: "Not found" });

    assignment.assignmentStatus = "cancelled";
    assignment.cancelledAt = new Date();
    assignment.cancellationReason = reason || "No reason";
    await assignment.save();

    return res.status(200).json({ success: true, assignment });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getDeliveryStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const assignment = await DeliveryAssignment.findOne({ order: orderId })
      .populate("assignedDeliveryPartner", "fullName location mobile");

    if (!assignment) {
      return res.status(404).json({ success: false, message: "Delivery not assigned yet" });
    }

    return res.status(200).json({ success: true, assignment });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
