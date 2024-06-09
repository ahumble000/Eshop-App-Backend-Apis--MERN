const port = 4000;
              
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();

//  ALL MIDDLEWARES HERE

app.use(bodyParser.json());
app.use(express.json());
app.use(cors());         

         
//  IMPORTING API's HERE

const usersRoutes = require('./routes/users');
const productsRoutes = require('./routes/products');


//  USING API's HERE                                   
           
app.use('/api/users',usersRoutes);
app.use('/api/products',productsRoutes);


//  DATABASE CONNECTION
mongoose.connect('add_database_url')
.then(() => console.log("Database is connected."))
.catch((e) => console.log(e));

// Image Storage Engine
                            
const imageStorage = multer.diskStorage({
  destination:'./upload/images',  
  filename:(req,file,cb)=>{
    return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  }
})

const upload = multer({storage:imageStorage}).single('product');

// Defining Endpoints for Upload Image
   
app.use('/images' , express.static('upload/images'));
          
app.post('/upload', upload, (req, res)=>{
  res.json({
    success:1,
    image_url:`http://localhost:${port}/images/${req.file.filename}`,
  })
})


// PORT LISTENING
      
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
