const express = require("express");
const router = express.Router();
const Booking = require("../models/booking");

const Listing = require("../models/listing");
const { isLoggedIn, isHost } = require("../middleware.js");


router.get("/dashboard", isLoggedIn, isHost, async(req, res) => {

    const listings = await Listing.find({
        owner: req.user._id
    });

    const bookings = await Booking.find({
            listing: {
                $in: listings.map(l => l._id)
            }
        })
        .populate("listing")
        .populate({
            path: "user",
            select: "username email profilePicture"
        });

    res.render("host/dashboard", {
        bookings
    });
});


// cancel booking
// ================= HOST CANCEL BOOKING =================
router.delete("/booking/:bookingId", isLoggedIn, isHost, async(req, res) => {
    try {

        const booking = await Booking.findById(req.params.bookingId)
            .populate("listing");

        // Booking check
        if (!booking) {
            req.flash("error", "Booking not found");
            return res.redirect("/host/dashboard");
        }

        // Listing check
        if (!booking.listing) {
            req.flash("error", "Property not found");
            return res.redirect("/host/dashboard");
        }

        // ================= HOST OWNERSHIP CHECK =================
        if (!booking.listing.owner ||
            !booking.listing.owner.equals(req.user._id)
        ) {
            req.flash("error", "Unauthorized action");
            return res.redirect("/host/dashboard");
        }

        // ================= ALREADY CANCELLED =================
        if (booking.status === "Cancelled") {
            req.flash("error", "This booking is already cancelled");
            return res.redirect("/host/dashboard");
        }

        // ================= CANCEL BOOKING =================
        booking.status = "Cancelled";

        await booking.save();

        req.flash(
            "success",
            "Booking cancelled successfully. Guest will see the cancelled status."
        );

        return res.redirect("/host/dashboard");

    } catch (err) {

        console.log("HOST CANCEL BOOKING ERROR:", err);

        req.flash(
            "error",
            "Cannot cancel booking"
        );

        return res.redirect("/host/dashboard");
    }
});

module.exports = router;