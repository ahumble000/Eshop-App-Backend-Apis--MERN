const { Message } = require('../models/message');
const express = require('express');
const router = express.Router();

router.get('/',async (req,res)=>{
    let allmessages = await Message.find();
  
    res.send(allmessages);
})

router.post('/',async (req,res)=>{
    const io = req.app.get('io');
    const {name,email,message} = req.body;

    const newMessage = await Message.create({name,email,message})

    if(newMessage){
        // Emit real-time event for new message
        io.emit('receive_message', newMessage);

        res.json({
            success : true,
            newMessage
        })
    }
})

router.delete('/message/:id', async (req, res) => {
    try {
        const io = req.app.get('io');
        const messageId = req.params.id;
        const deletedMessage = await Message.findByIdAndDelete(messageId);

        if (!deletedMessage) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }

        // Emit real-time event for message deletion
        io.emit('message_removed', {id: messageId});

        res.json({ success: true, message: 'Message deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;