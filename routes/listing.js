const express = require("express");
const router = express.Router();

const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const { listingSchema } = require("../schema.js");
const Listing = require("../models/listing.js");
const { isLoggedIn,isOwner } = require("../middleware.js");

const NodeGeocoder = require('node-geocoder');
const options = {
  provider: 'openstreetmap'
};
const geocoder = NodeGeocoder(options);

// Validation Middleware
const validateListing = (req, res, next) => {
    const { error } = listingSchema.validate(req.body);

    if (error) {
        const errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    }
    next();
};

// ================= INDEX =================
router.get("/", wrapAsync(async (req, res) => {
    const { category } = req.query;
    let query = {};
    if (category) {
        query.category = category;
    }
    const allListings = await Listing.find(query);
    res.render("listings/index", { allListings });
}));

// ================= NEW =================
router.get("/new", isLoggedIn, (req, res) => {
    res.render("listings/new");
});

// ================= SHOW =================
router.get("/:id", wrapAsync(async (req, res) => {
    const { id } = req.params;

    const listing = await Listing.findById(id)
        .populate("owner")
        .populate({
            path: "reviews",
            populate: {
                path: "author",
            },
        });

    if (!listing) {
        req.flash("error", "Listing you requested does not exist!");
        return res.redirect("/listings");
    }

    res.render("listings/show.ejs", { listing });
}));

// ================= CREATE =================
router.post(
    "/",
    isLoggedIn,
    validateListing,
    wrapAsync(async (req, res) => {
        let geoData = await geocoder.geocode(req.body.listing.location);

        const newListing = new Listing(req.body.listing);

        if(geoData.length > 0) {
            newListing.geometry = {
                type: 'Point',
                coordinates: [geoData[0].longitude, geoData[0].latitude]
            };
        }

        // Save Owner
        newListing.owner = req.user._id;

        await newListing.save();

        req.flash("success", "New Listing Created!");

        res.redirect(`/listings/${newListing._id}`);
    })
);

// ================= EDIT =================
router.get("/:id/edit", isLoggedIn,isOwner, wrapAsync(async (req, res) => {

    const { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }

    if (!listing.owner.equals(req.user._id)) {
        req.flash("error", "You don't have permission to edit this listing!");
        return res.redirect(`/listings/${id}`);
    }

    res.render("listings/edit.ejs", { listing });

}));

// ================= UPDATE =================
router.put(
    "/:id",
    isLoggedIn,
    isOwner,
    validateListing,
    wrapAsync(async (req, res) => {

        let { id } = req.params;
        let updateData = { ...req.body.listing };
        
        let geoData = await geocoder.geocode(req.body.listing.location);
        if(geoData.length > 0) {
            updateData.geometry = {
                type: 'Point',
                coordinates: [geoData[0].longitude, geoData[0].latitude]
            };
        }

        await Listing.findByIdAndUpdate(id, updateData);

        req.flash("success", "Listing Updated Successfully!");

        res.redirect(`/listings/${id}`);
    })
);

// ================= DELETE =================
router.delete("/:id", isLoggedIn,isOwner, wrapAsync(async (req, res) => {

    const { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }

    if (!listing.owner.equals(req.user._id)) {
        req.flash("error", "You don't have permission to delete this listing!");
        return res.redirect(`/listings/${id}`);
    }

    await Listing.findByIdAndDelete(id);

    req.flash("success", "Listing Deleted Successfully!");

    res.redirect("/listings");

}));

module.exports = router;