const port = 4000;
              
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000","http://localhost:3001"],
    methods: ["GET", "POST"]
  }
});

//  ALL MIDDLEWARES HERE

app.use(bodyParser.json());
app.use(express.json());
app.use(cors());         

         
//  IMPORTING API's HERE

const usersRoutes = require('./routes/users');
const productsRoutes = require('./routes/products');
const messagesRoutes = require('./routes/messages');


//  USING API's HERE                                   
           
app.use('/api/users',usersRoutes);
app.use('/api/products',productsRoutes);
app.use('/api/messages',messagesRoutes);   
  

//  DATABASE CONNECTION
// mongodb+srv://ahumble882:GMznoFLLyG7LgWWQ@eshop.54lsmxp.mongodb.net/?retryWrites=true&w=majority&appName=eshop
// mongodb+srv://ahumble882:ipvu2N0TaYyB7JuD@cluster0.kdcqoqi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
//mongodb://127.0.0.1:27017/ESHOP

mongoose.connect('mongodb+srv://ahumble882:GMznoFLLyG7LgWWQ@eshop.54lsmxp.mongodb.net/ESHOP?retryWrites=true&w=majority&appName=eshop')
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

// SOCKET.IO CONNECTION
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Product related events
  socket.on('product_updated', (data) => {
    socket.broadcast.emit('product_change', data);
  });

  socket.on('product_created', (data) => {
    socket.broadcast.emit('new_product', data);
  });

  socket.on('product_deleted', (data) => {
    socket.broadcast.emit('product_removed', data);
  });

  // Message/Chat related events
  socket.on('send_message', (data) => {
    io.emit('receive_message', data);
  });

  socket.on('message_deleted', (data) => {
    io.emit('message_removed', data);
  });

  // Cart related events
  socket.on('cart_updated', (data) => {
    socket.broadcast.emit('cart_change', data);
  });

  // Order related events
  socket.on('order_created', (data) => {
    io.emit('new_order', data);
  });

  socket.on('order_deleted', (data) => {
    io.emit('order_removed', data);
  });

  // User related events
  socket.on('user_action', (data) => {
    socket.broadcast.emit('user_notification', data);
  });

  socket.on('user_deleted', (data) => {
    io.emit('user_removed', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// PORT LISTENING
      
server.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
