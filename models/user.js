const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({

    login:{
        type:Boolean, 
        default:false
    },
   
    name : {
        type : String,
        required: true,
        unique:true,
    },

    email : {         
        type : String,
        required: true,
        unique: true,
    },

    password : {
        type : String,
        required: true,
        unique: true,
    },

    cartData : {
        type:Object,
    },

    date : {
        type : Date,
        default : Date.now,
    },

})

exports.User = mongoose.model('User',userSchema);