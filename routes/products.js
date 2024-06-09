const { Product } = require('../models/product');
const express = require('express');
const router = express.Router();

// Api for Product Creation           

router.post('/', async (req, res) => {

    let product = await Product.find();
    let productId;
    if(product.length > 0){
      let last_product_array = product.slice(-1);
      let last_product = last_product_array[0];          
      productId = last_product.id + 1;  
    }
  
    else{
      productId = 1;     
    }
  
    const {name,category,new_price,old_price,image} = req.body;
    let addproduct = await Product.create({id:productId,name,category,new_price,old_price,image});
  
    res.json({   
      success:true,                    
      addproduct
    }) 
                     
  });        
  
  //Api for updating a product
  
  router.patch('/',async(req,res)=>{
    let productId = req.body.id;
    
    const {name,category,new_price,old_price,image} = req.body;
    
    let updatedProduct = await Product.updateOne({id:productId},{$set:{name,category,new_price,old_price,image}});
  
    res.json({
      success:true,
      updatedProduct
    });
  
  });          
         
  //Api for Deleting a Product
  
  router.delete('/',async (req,res)=>{   
  
    let productId = req.body.id;
    let deletedProduct = await Product.findOneAndDelete({id:productId});
    
    if (deletedProduct) {
      await Product.updateMany({ id: { $gt: productId } }, { $inc: { id: -1 } });
    }
  
    else {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    res.json({      
      success:true,  
      deletedProduct
    })       
  
  });
  
  //Api to get all the Products from the Database
          
  router.get('/',async (req,res)=>{
    let allproducts = await Product.find();
  
    res.send(allproducts);
  })
  

module.exports = router;             