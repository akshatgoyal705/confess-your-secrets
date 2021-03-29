//jshint esversion:6
// PP-->passport code  and order of code is V.V. imp
require('dotenv').config();
//environment variable package to secure sensitive info like api keys, encrytion keys etc.
//all are in .env file.
const md5=require("md5");
const express=require("express");
const bodyParser=require("body-parser");
const ejs=require('ejs');
const mongoose=require("mongoose");
const session=require("express-session");                       // PP
const passport=require("passport");                             // PP
const passportLocalMongoose=require("passport-local-mongoose"); // PP
const GoogleStrategy = require( 'passport-google-oauth20' ).Strategy;
const findOrCreate=require("mongoose-findorcreate");
//const encrypt=require("mongoose-encryption");
const app=express();

app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine','ejs');
app.use(express.static("public"));

// setting up session
app.use(session({                                             // PP
  secret: "fgdigfdiugjhfguidufhd",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());                              // PP
app.use(passport.session());                                 // PP

//mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true,useUnifiedTopology:true});
mongoose.connect("mongodb+srv://admin-akshat:test123@cluster0.puf7o.mongodb.net/oursecretsDB?retryWrites=true&w=majority", {useNewUrlParser: true});

mongoose.set('useCreateIndex', true);
const userSchema=new mongoose.Schema(
  {
    email:String,
    password:String,
    googleId:String,
    secret:String
  });
//to access environment variables use process.env.SECRET
//userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});
userSchema.plugin(passportLocalMongoose);                // PP
userSchema.plugin(findOrCreate);
const User=new mongoose.model("User",userSchema);
passport.use(User.createStrategy());                     // PP
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://hidden-headland-50227.herokuapp.com/auth/google/secrets",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));
app.get("/",function(req,res){
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope:
      [ 'profile' ] }
));

app.get( '/auth/google/secrets',
    passport.authenticate( 'google', {
        successRedirect: '/secrets',
        failureRedirect: '/login'
}));

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});

app.get("/secrets",function(req,res){
  if(req.isAuthenticated()){

    User.find({secret:{$ne:null}},function(err,foundUsers){
      res.render("secrets",{usersWithSecrets:foundUsers});
    });
  } else {
    res.redirect("/login");
  }
});
app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout",function(req,res){
  req.logout();
  res.redirect('/');
});
app.post("/register",function(req,res){
  User.register({username:req.body.username},req.body.password,function(err,user){
    if(err){
      console.log(err);
      res.redirect("/register");
    } else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
      });
    }
  });

});
app.post("/login",function(req,res){
  const user = new User({
    username:req.body.username,
    password: req.body.password
  });
  req.login(user,function(err){
    if(err){
      console.log(err);
    } else {
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
      });
    }
  });
});
app.post("/submit",function(req,res){
  userSecret=req.body.secret;
  console.log(req.user._id);
  User.findById(req.user._id,function(err,foundUser){
    foundUser.secret=userSecret;
    foundUser.save();
    res.redirect("/secrets");
  });
});
app.listen(process.env.PORT||3000,function(req,res) {
  console.log("Server started at port 3000");
});
