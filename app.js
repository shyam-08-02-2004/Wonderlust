// Fix for Indian ISP DNS SRV blocking issue (only locally, not on Render)
if (!process.env.RENDER) {
    require('dns').setServers(['8.8.8.8', '8.8.4.4']);
}

if(process.env.NODE_ENV != "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo").MongoStore;
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingsRouter = require("./routes/listing.js");
const reviewsRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

// Atlas DB connect string (working)
const MONGO_URL = process.env.ATLASDB_URL; 
// Local DB connect string
// const MONGO_URL = "mongodb://127.0.0.1:27017/wonderlust";

main().then(()=>{
    console.log("connect to DB");
})
.catch((err) =>{
    console.log(err);
});

async function main(){
    await mongoose.connect(MONGO_URL);
}

app.engine("ejs", ejsMate);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

const store = MongoStore.create({
    mongoUrl: MONGO_URL,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

store.on("error", (err) => {
    console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOption ={
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie :{
        expires: Date.now() + 7 * 24 *60 * 60 * 1000,
        maxAge:  7 * 24 *60 * 60 * 1000,
        httpOnly: true,
    },
};
app.get("/", (req,res)=>{
    res.send("I am work");
});

app.use(session(sessionOption));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// app.get("/demouser", async (req, res) => {
//     let fakeUser = new User({
//         email:"student@gmail.com",
//         username:"delta-student",
//     });

//     let registerdUser = await User.register(fakeUser, "helloworld");
//     res.send(registerdUser);
// });

app.use("/listings", listingsRouter);
app.use("/listings/:id/reviews", reviewsRouter);
app.use("/", userRouter);

app.use((req, res, next) => {
    next(new ExpressError(404, "Page not found!"));
});



app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong!" } = err;
    
    // Prevent EJS from crashing if error happens before locals are set
    if (res.locals.currUser === undefined) res.locals.currUser = null;
    if (res.locals.success === undefined) res.locals.success = "";
    if (res.locals.error === undefined) res.locals.error = "";
    
    res.status(statusCode).render("error.ejs", { message });
});

const PORT = process.env.PORT || 8080;
if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, ()=>{
        console.log(`server is listening on port ${PORT}`);
    });
}

module.exports = app;