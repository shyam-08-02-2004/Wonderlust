const express = require("express");
const router = express.Router({ mergeParams: true });

const wrapAsync = require("../utils/wrapAsync");
const ExpressError = require("../utils/ExpressError");

const { reviewSchema } = require("../schema");
const Review = require("../models/review");
const Listing = require("../models/listing");

// Import middleware correctly
const { isLoggedIn } = require("../middleware");

const validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);

    if (error) {
        const errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    }

    next();
};

// Create Review
router.post(
    "/",
    isLoggedIn,
    validateReview,
    wrapAsync(async (req, res) => {
        const listing = await Listing.findById(req.params.id);

        const newReview = new Review(req.body.review);
        newReview.author = req.user._id;

        listing.reviews.push(newReview);

        await newReview.save();
        await listing.save();

        req.flash("success", "New Review Created!");

        res.redirect(`/listings/${listing._id}`);
    })
);

// Delete Review
router.delete(
    "/:reviewId",
    isLoggedIn,
    wrapAsync(async (req, res) => {
        const { id, reviewId } = req.params;

        await Listing.findByIdAndUpdate(id, {
            $pull: { reviews: reviewId },
        });

        await Review.findByIdAndDelete(reviewId);

        req.flash("success", "Review Deleted!");

        res.redirect(`/listings/${id}`);
    })
);

module.exports = router;