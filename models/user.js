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
    },

    role : {
        type : String,
        required : true,
        default : 'user'
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