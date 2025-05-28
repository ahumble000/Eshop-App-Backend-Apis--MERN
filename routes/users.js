const { User } = require('../models/user');
const { Order } = require('../models/order');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Middleware to authenticate users using JWT
const fetchUser = async (req, res, next) => {
  const token = req.header('auth_token');
  if (!token) {
    return res.status(401).send({ error: "Authenticate using a valid token" });
  }
  try {
    const data = jwt.verify(token, 'secret_token');
    req.user = data.userId;
    next();
  } catch (e) {
    res.status(401).send({ error: "Authenticate using a valid token" });
  }
};

// Utility function to get a default cart
const getDefaultCart = () => {
  let cart = {};
  for (let index = 1; index <= 300; index++) {
    cart[index] = 0;
  }
  return cart;
};

// Get all users
router.get('/', async (req, res) => {
  try {
    const userList = await User.find();
    res.send(userList);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Register or login a user (NO SOCKET - one-time actions)
router.post('/', async (req, res) => {
  const { email, password, name, login } = req.body;

  try {
    let user = await User.findOne({ email });
    let username = await User.findOne({ name });

    if (login) {
      if (!user) {
        return res.status(400).json({ error: "User not found. Please register first." });
      }

      const isMatch = await bcrypt.compare(password,user.password)
      if (!isMatch) {
        return res.status(400).json({ error: "Incorrect password. Please try again." });
      }
    } else {
      if (user) {
        return res.status(400).json({ error: "User already exists. Please login." });
      }

      if (username) {
        return res.status(400).json({ error: "Username is already taken." });
      }

      const hashPassword = await bcrypt.hash(password,10)

      user = new User({ name, email, password:hashPassword, cartData: getDefaultCart() });
      await user.save();
    }

    const token = jwt.sign({ userId: user.id }, 'secret_token');

    res.cookie('auth_token', token, {
      httpOnly: true,
    });

    res.json({ success: true, token });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error.");
  }
});

// Logout user (NO SOCKET - one-time action)
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

// Add item to cart
router.post('/addToCart', fetchUser, async (req, res) => {
  try {
    const io = req.app.get('io');
    let userData = await User.findOne({ _id: req.user });
    userData.cartData[req.body.itemId] += 1;
    await User.findOneAndUpdate({ _id: req.user }, { cartData: userData.cartData });
    
    // Emit real-time cart update
    io.emit('cart_change', {
      userId: req.user,
      action: 'add',
      itemId: req.body.itemId,
      cartData: userData.cartData
    });

    res.send("Product added successfully");
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Remove item from cart
router.post('/removeFromCart', fetchUser, async (req, res) => {
  try {
    const io = req.app.get('io');
    let userData = await User.findOne({ _id: req.user });
    userData.cartData[req.body.itemId] = 0;
    await User.findOneAndUpdate({ _id: req.user }, { cartData: userData.cartData });
    
    // Emit real-time cart update
    io.emit('cart_change', {
      userId: req.user,
      action: 'remove',
      itemId: req.body.itemId,
      cartData: userData.cartData
    });

    res.send("Product removed successfully");
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Decrement item from cart
router.post('/decrementFromCart', fetchUser, async (req, res) => {
  try {
    const io = req.app.get('io');
    let userData = await User.findOne({ _id: req.user });
    userData.cartData[req.body.itemId] -= 1;
    await User.findOneAndUpdate({ _id: req.user }, { cartData: userData.cartData });
    
    // Emit real-time cart update
    io.emit('cart_change', {
      userId: req.user,
      action: 'decrement',
      itemId: req.body.itemId,
      cartData: userData.cartData
    });

    res.send("Product decremented successfully");
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user cart data (NO SOCKET - just data retrieval)
router.post('/userCartData', fetchUser, async (req, res) => {
  try {
    let userData = await User.findOne({ _id: req.user });
    res.json(userData.cartData);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const io = req.app.get('io');
    const userId = req.params.id;
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await Order.deleteMany({ user: userId });

    // Emit real-time user deletion
    io.emit('user_removed', {id: userId});

    res.json({ success: true, deletedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update user (NO SOCKET - profile updates don't need real-time)
router.put('/:id', async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    let username = await User.findOne({ name });
    let useremail = await User.findOne({ email });

    if (username && username._id.toString() !== req.params.id) {
      return res.status(400).json({ error: "Username is already taken." });
    }

    if (useremail && useremail._id.toString() !== req.params.id) {
      return res.status(400).json({ error: "Email is already taken." });
    }

    const hashPassword = await bcrypt.hash(password,10)
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, password : hashPassword, role },
      { new: true }
    );

    res.json({ success: true, updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const fetchUserRole = async (req, res, next) => {
  const token = req.header('auth_token');
  if (!token) {
    return res.status(401).send({ error: "Authenticate using a valid token" });
  }
  try {
    const data = jwt.verify(token, 'secret_token');  
    req.user = data.userId;
    next();
  } catch (e) {
    res.status(401).send({ error: "Authenticate using a valid token" });
  }
};

// Get user info (NO SOCKET - just data retrieval)
router.get('/me', fetchUserRole, async (req, res) => {
  try {
    const user = await User.findById(req.user);
    res.json(user);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

//Order APIS

// Get all orders (NO SOCKET - just data retrieval)
router.get('/orders', async (req, res) => {
  try {
    const orderList = await Order.find().populate('user', 'name email');
    res.json(orderList);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create order
router.post('/createOrder', fetchUser, async (req, res) => {
  try {
    const io = req.app.get('io');
    const { items, total } = req.body;

    const newOrder = new Order({
      user: req.user,
      items,
      total
    });

    const savedOrder = await newOrder.save();
    const populatedOrder = await Order.findById(savedOrder._id).populate('user', 'name email');

    // Emit real-time order creation
    io.emit('new_order', populatedOrder);

    res.json({ success: true, order: savedOrder });

    if(savedOrder){
      await User.findOneAndUpdate({ _id: req.user }, { cartData: getDefaultCart() });      
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete order
router.delete('/orders/:id', async (req, res) => {
  try {
    const io = req.app.get('io');
    const orderId = req.params.id;
    const deletedOrder = await Order.findByIdAndDelete(orderId);

    if (!deletedOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Emit real-time order deletion
    io.emit('order_removed', {id: orderId});

    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;