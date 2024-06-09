const {User} = require('../models/user');
const express = require('express');
const router = express.Router();

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

router.get('/', async (req, res) =>{
    const userList = await User.find();

    if(!userList) {       
        res.status(500).json({success: false})
    } 
    res.send(userList);
});         

const getDefaultCart = () =>{
    let cart = {};
    for (let index = 1; index <= 300 ; index++) {
        cart[index] = 0;
    }
    
    return cart;
}

router.post('/', async (req, res) => {
    const { email, password, name, login } = req.body;

    try {
        let user = await User.findOne({ email });
        let username = await User.findOne({name});
        // const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z!@#$%^&*()_+]).{8,}$/;

        if (login) {
            if (!user) {
                return res.status(400).json({error:"User not found. Please register first."});
            }
            
            
            
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({error:"Incorrect password. Please try again."});
            }

        }
        
        else {
            if (user) {
                return res.status(400).json({error:"User already exists. Please login."});
            }
            
            if (username) {
                return res.status(400).json({error:"Username is already taken."});
            }

            // if (!password.match(passwordRegex)) {
            //     return res.status(400).json({error: "Password must contain at least 8 characters including at least one uppercase letter, one lowercase letter, one number, and one special character."});
            // }

            const hashedPassword = await bcrypt.hash(password, 10);
            user = new User({ name, email, password: hashedPassword , cartData : getDefaultCart()});
            await user.save();
        }

        const token = jwt.sign({ userId: user.id }, 'secret_token');

        res.cookie('auth_token', token, {
            // secure: true,   
            httpOnly: true, 
            // expires: new Date(Date.now() + 60 * 10000),
            // sameSite: 'strict', 
        });

        res.json({ success: true, token });
    }
    
    catch (error) {
        console.error(error);
        res.status(500).send("Internal server error.");
    }
});

router.post('/logout' ,(req,res)=>{
    res.clearCookie('auth_token');
    res.json({success:true})
});

const fetchUser = async(req,res,next)=>{
    
    const token = req.header('auth_token');
    if(!token){                
        res.status(401).send({error:"Authenticate using a valid token"})
    }
    else{
        try{
            const data = jwt.verify(token,'secret_token');
            req.user = data.userId;
            next();
        }
        catch(e){
            res.status(401).send({error:"Authenticate using a valid token"})
        }
    }

} 

router.post('/addToCart',fetchUser, async(req,res)=>{
    let userData = await User.findOne({_id:req.user})
    userData.cartData[req.body.itemId] += 1;

    await User.findOneAndUpdate({_id:req.user},{cartData:userData.cartData});
    res.send("Product Added successfully");
});

router.post('/removeFromCart',fetchUser, async(req,res)=>{
    let userData = await User.findOne({_id:req.user})
    userData.cartData[req.body.itemId] = 0;

    await User.findOneAndUpdate({_id:req.user},{cartData:userData.cartData});
    res.send("Product Removed successfully");
});

router.post('/decrementFromCart',fetchUser, async(req,res)=>{
    let userData = await User.findOne({_id:req.user})
    userData.cartData[req.body.itemId] -= 1;

    await User.findOneAndUpdate({_id:req.user},{cartData:userData.cartData});
    res.send("Product decremented successfully");
});

router.post('/userCartData',fetchUser,async(req,res)=>{
    let userData = await User.findOne({_id:req.user}); 
    res.json(userData.cartData);
});

router.delete('/:id', async (req, res) => {   
    try {
        const userId = req.params.id;
        const deletedUser = await User.findByIdAndDelete(userId);
        
        if (!deletedUser) {
            return res.status(404).json({
                success: false,  
                message: 'User not found'
            });
        }
        
        res.json({      
            success: true,  
            deletedUser
        });       
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.patch('/:id', async (req, res) =>{

    const {name,email,password} = req.body;

    const updatedUser = await User.findByIdAndUpdate(req.params.id,{$set:{name,email,password}});
     
    res.json({
        success:true,
        updatedUser
     })


});

module.exports = router;