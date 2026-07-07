const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const passport = require("passport");
const {saveRedirectUrl} = require("../middleware.js");

// Signup Page
router.get("/signup", (req, res) => {
    res.render("users/signup");
});

// Signup
router.post("/signup", async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        const newUser = new User({
            username,
            email,
        });

        const registeredUser = await User.register(newUser, password);

        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }

            req.flash("success", "Welcome to Wonderlust!");
            res.redirect("/listings");
        });

    } catch (err) {
        req.flash("error", err.message);
        res.redirect("/signup");
    }
});

// Login Page
router.get("/login", (req, res) => {
    res.render("users/login");
});

// Login
router.post(
    "/login",
    saveRedirectUrl,
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureFlash: true,
    }),
    (req, res) => {
        req.flash("success", "Welcome back to Wonderlust!");

        const redirectUrl = res.locals.redirectUrl || "/listings";
        delete req.session.redirectUrl;

        res.redirect(redirectUrl);
    }
);

// Logout
router.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);

        req.flash("success", "You are logged out!");
        res.redirect("/listings");
    });
});

module.exports = router;