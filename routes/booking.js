const express = require("express");
const router = express.Router();

const Listing = require("../models/listing");
const Booking = require("../models/booking");
const User = require("../models/user");

const { isLoggedIn } = require("../authMiddleware");

const razorpay = require("../utils/razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");
const sendEmail = require("../utils/sendEmail");



// ================= MY BOOKINGS =================
router.get("/my-bookings", isLoggedIn, async(req, res) => {
    try {

        const bookings = await Booking.find({
                user: req.user._id
            })
            .populate({
                path: "listing",
                populate: {
                    path: "owner",
                    select: "username email profilePicture role"
                }
            })
            .lean();

        res.render("bookings/myBookings", {
            bookings
        });

    } catch (err) {

        console.log("MY BOOKING ERROR:", err);

        req.flash(
            "error",
            "Something went wrong"
        );

        return res.redirect("/listings");
    }
});



// ================= CREATE RAZORPAY ORDER =================
router.post("/create-order/:id", isLoggedIn, async(req, res) => {
    try {

        if (!req.session.bookingData) {
            return res.status(400).json({
                error: "Session expired"
            });
        }

        const options = {

            amount: Math.round(
                Number(
                    req.session.bookingData.totalPrice
                ) * 100
            ),

            currency: "INR",

            receipt: "booking_" + Date.now(),

            // ⭐ STORE BOOKING INFO INSIDE RAZORPAY
            notes: {

                listingId: req.session.bookingData
                    .listingId
                    .toString(),

                userId: req.user._id.toString(),

                fromDate: req.session.bookingData.fromDate,

                toDate: req.session.bookingData.toDate,

                guests: req.session.bookingData.guests,

                roomPlan: req.session.bookingData.selectedPlan,

                basePrice: req.session.bookingData.basePrice,

                platformFee: req.session.bookingData.platformFee,

                gst: req.session.bookingData.gst,

                totalPrice: req.session.bookingData.totalPrice
            }
        };


        const order =
            await razorpay.orders.create(
                options
            );


        res.json({

            id: order.id,

            amount: order.amount

        });


    } catch (err) {

        console.log(
            "CREATE ORDER ERROR:",
            err
        );

        res.status(500).json({
            error: "Order creation failed"
        });
    }
});



// ================= VERIFY PAYMENT =================
router.post("/verify-payment", async(req, res) => {
    try {

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;



        // ================= VERIFY SIGNATURE =================

        const expectedSignature =
            crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_KEY_SECRET
            )
            .update(
                razorpay_order_id +
                "|" +
                razorpay_payment_id
            )
            .digest("hex");


        if (
            expectedSignature !==
            razorpay_signature
        ) {

            console.log(
                "Signature mismatch"
            );

            return res.json({
                success: false
            });
        }



        // ================= FETCH RAZORPAY ORDER =================

        const order =
            await razorpay.orders.fetch(
                razorpay_order_id
            );

        const notes = order.notes;



        // ================= GET LISTING + SELLER =================

        const listing =
            await Listing.findById(
                notes.listingId
            )
            .populate({
                path: "owner",
                select: "username email profilePicture role"
            });


        if (!listing) {

            console.log(
                "Listing not found"
            );

            return res.json({
                success: false
            });
        }



        // ================= GET BOOKING USER =================

        const user =
            await User.findById(
                notes.userId
            );


        if (!user) {

            console.log(
                "User not found"
            );

            return res.json({
                success: false
            });
        }



        // ================= CREATE BOOKING =================

        const newBooking =
            new Booking({

                user: new mongoose.Types.ObjectId(
                    notes.userId
                ),

                listing: new mongoose.Types.ObjectId(
                    notes.listingId
                ),

                fromDate: new Date(
                    notes.fromDate
                ),

                toDate: new Date(
                    notes.toDate
                ),

                guests: Number(
                    notes.guests
                ),

                roomPlan: notes.roomPlan,


                basePrice: Number(
                    notes.basePrice
                ),

                platformFee: Number(
                    notes.platformFee
                ),

                gst: Number(
                    notes.gst
                ),

                totalPrice: Number(
                    notes.totalPrice
                ),


                paymentId: razorpay_payment_id,

                orderId: razorpay_order_id,

                signature: razorpay_signature,

                paymentStatus: "Paid"
            });


        await newBooking.save();



        // =====================================================
        // BOOKING CONFIRMATION EMAIL
        // =====================================================

        try {

            await sendEmail(

                user.email,

                "🎉 Booking Confirmed - WanderLust",

                `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 700px;
                    margin: auto;
                    padding: 20px;
                    border: 1px solid #ddd;
                    border-radius: 10px;
                ">

                    <h2 style="
                        color: #198754;
                        text-align: center;
                    ">
                        🎉 Booking Confirmed
                    </h2>


                    <p>
                        Hello
                        <b>
                            ${user.username}
                        </b>,
                    </p>


                    <p>
                        Your room booking has been
                        successfully confirmed.
                    </p>


                    <hr>


                    <!-- LISTING -->

                    <h3>
                        🏠 Listing Details
                    </h3>


                    <p>
                        <b>Listing:</b>
                        ${listing.title}
                    </p>


                    <p>
                        <b>Location:</b>
                        ${listing.location},
                        ${listing.country}
                    </p>


                    <hr>


                    <!-- SELLER -->

                    <h3>
                        👤 Seller Details
                    </h3>


                    <p>
                        <b>Name:</b>

                        ${
                            listing.owner
                                ? listing.owner.username
                                : "Host unavailable"
                        }
                    </p>


                    <p>
                        <b>Email:</b>

                        ${
                            listing.owner
                                ? listing.owner.email
                                : "Email unavailable"
                        }
                    </p>


                    <hr>


                    <!-- BOOKER -->

                    <h3>
                        📋 Booking Details
                    </h3>


                    <p>
                        <b>Booked By:</b>
                        ${user.username}
                    </p>


                    <p>
                        <b>Email:</b>
                        ${user.email}
                    </p>


                    <p>
                        <b>Check-in:</b>

                        ${
                            new Date(
                                notes.fromDate
                            ).toDateString()
                        }
                    </p>


                    <p>
                        <b>Check-out:</b>

                        ${
                            new Date(
                                notes.toDate
                            ).toDateString()
                        }
                    </p>


                    <p>
                        <b>Guests:</b>
                        ${notes.guests}
                    </p>


                    <p>
                        <b>Room Plan:</b>
                        ${notes.roomPlan}
                    </p>


                    <hr>


                    <!-- PAYMENT -->

                    <h3>
                        💳 Payment Details
                    </h3>


                    <p>
                        <b>Room Price:</b>
                        ₹${notes.basePrice}
                    </p>


                    <p>
                        <b>Platform Fee:</b>
                        ₹${notes.platformFee}
                    </p>


                    <p>
                        <b>GST:</b>
                        ₹${notes.gst}
                    </p>


                    <h3>
                        Total Paid:
                        ₹${notes.totalPrice}
                    </h3>


                    <p>
                        <b>Payment ID:</b>
                        ${razorpay_payment_id}
                    </p>


                    <p>
                        <b>Order ID:</b>
                        ${razorpay_order_id}
                    </p>


                    <p>
                        <b>Payment Status:</b>

                        <span style="
                            color: green;
                            font-weight: bold;
                        ">
                            Paid
                        </span>
                    </p>


                    <hr>


                    <p style="
                        text-align: center;
                        color: #666;
                    ">
                        Thank you for booking with
                        <b>WanderLust</b>.
                    </p>

                </div>
                `
            );


            console.log(
                "BOOKING CONFIRMATION EMAIL SENT"
            );


        } catch (emailError) {

            console.log(
                "BOOKING EMAIL ERROR:",
                emailError
            );

            // Booking successful even if email fails.
        }

        // =====================================================
        // SELLER / HOST BOOKING CONFIRMATION EMAIL
        // =====================================================

        try {

            if (listing.owner && listing.owner.email) {

                await sendEmail(

                    listing.owner.email,

                    "🏠 New Booking Received - WanderLust",

                    `
            <div style="
                font-family: Arial, sans-serif;
                max-width: 700px;
                margin: auto;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 10px;
            ">

                <h2 style="
                    color: #0d6efd;
                    text-align: center;
                ">
                    🏠 New Booking Received
                </h2>

                <p>
                    Hello
                    <b>
                        ${listing.owner.username || "Host"}
                    </b>,
                </p>

                <p>
                    Someone has successfully booked your property
                    on <b>WanderLust</b>.
                </p>

                <hr>


                <!-- LISTING DETAILS -->

                <h3>
                    🏠 Listing Details
                </h3>

                <p>
                    <b>Listing:</b>
                    ${listing.title}
                </p>

                <p>
                    <b>Location:</b>
                    ${listing.location},
                    ${listing.country}
                </p>


                <hr>


                <!-- CUSTOMER DETAILS -->

                <h3>
                    👤 Customer Details
                </h3>

                <p>
                    <b>Name:</b>
                    ${user.username || "N/A"}
                </p>

                <p>
                    <b>Email:</b>
                    ${user.email}
                </p>


                <hr>


                <!-- BOOKING DETAILS -->

                <h3>
                    📋 Booking Details
                </h3>

                <p>
                    <b>Check-in:</b>
                    ${new Date(notes.fromDate).toDateString()}
                </p>

                <p>
                    <b>Check-out:</b>
                    ${new Date(notes.toDate).toDateString()}
                </p>

                <p>
                    <b>Guests:</b>
                    ${notes.guests}
                </p>

                <p>
                    <b>Room Plan:</b>
                    ${notes.roomPlan}
                </p>


                <hr>


                <!-- PAYMENT DETAILS -->

                <h3>
                    💳 Payment Details
                </h3>

                <p>
                    <b>Room Price:</b>
                    ₹${notes.basePrice}
                </p>

                <p>
                    <b>Platform Fee:</b>
                    ₹${notes.platformFee}
                </p>

                <p>
                    <b>GST:</b>
                    ₹${notes.gst}
                </p>

                <h3>
                    Total Paid:
                    ₹${notes.totalPrice}
                </h3>

                <p>
                    <b>Payment ID:</b>
                    ${razorpay_payment_id}
                </p>

                <p>
                    <b>Order ID:</b>
                    ${razorpay_order_id}
                </p>

                <p>
                    <b>Payment Status:</b>

                    <span style="
                        color: green;
                        font-weight: bold;
                    ">
                        Paid
                    </span>
                </p>


                <hr>

                <p style="
                    text-align: center;
                    color: #666;
                ">
                    Please prepare the property for the
                    scheduled booking.
                </p>

                <p style="
                    text-align: center;
                    color: #666;
                ">
                    <b>WanderLust</b>
                </p>

            </div>
            `
                );

                console.log(
                    "SELLER BOOKING EMAIL SENT"
                );

            } else {

                console.log(
                    "SELLER EMAIL NOT AVAILABLE"
                );

            }

        } catch (sellerEmailError) {

            console.log(
                "SELLER EMAIL ERROR:",
                sellerEmailError
            );

            // Booking remains successful even if seller email fails.
        }

        // ================= FINAL RESPONSE =================

        return res.json({
            success: true
        });


    } catch (err) {

        console.log(
            "VERIFY ERROR:",
            err
        );

        return res.status(500).json({
            success: false
        });
    }
});


// ================= BOOKING INVOICE / RECEIPT =================
router.get("/invoice/:bookingId", isLoggedIn, async(req, res) => {
    try {

        const { bookingId } = req.params;

        // ================= VALID BOOKING ID =================

        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            req.flash("error", "Invalid booking ID");
            return res.redirect("/bookings/my-bookings");
        }


        // ================= GET BOOKING =================

        const booking = await Booking.findById(bookingId)
            .populate({
                path: "listing",
                populate: {
                    path: "owner",
                    select: "username email profilePicture role"
                }
            })
            .populate({
                path: "user",
                select: "username email profilePicture role"
            })
            .lean();


        // ================= BOOKING NOT FOUND =================

        if (!booking) {
            req.flash("error", "Booking not found");
            return res.redirect("/bookings/my-bookings");
        }


        // ================= SECURITY =================
        // Customer sirf apni booking dekh sakta hai.

        if (!booking.user ||
            booking.user._id.toString() !== req.user._id.toString()
        ) {
            req.flash("error", "Unauthorized access");
            return res.redirect("/bookings/my-bookings");
        }


        // ================= RENDER INVOICE =================

        res.render("bookings/invoice", {
            booking
        });


    } catch (err) {

        console.log(
            "INVOICE ERROR:",
            err
        );

        req.flash(
            "error",
            "Unable to open booking receipt"
        );

        return res.redirect(
            "/bookings/my-bookings"
        );
    }
});
// ================= BOOKING PAGE =================
router.get("/:id", isLoggedIn, async(req, res) => {
    try {

        const { id } = req.params;



        // ⭐ CHECK VALID MONGODB ID FIRST

        if (!mongoose.Types.ObjectId.isValid(id)) {

            req.flash(
                "error",
                "Invalid listing ID"
            );

            return res.redirect(
                "/listings"
            );
        }



        // ⭐ GET LISTING + SELLER DETAILS

        const listing =
            await Listing.findById(id)
            .populate({
                path: "owner",
                select: "username email profilePicture role"
            });



        if (!listing) {

            req.flash(
                "error",
                "Listing not found"
            );

            return res.redirect(
                "/listings"
            );
        }



        res.render(
            "bookings/book", {

                listing,

                razorpayKey: process.env.RAZORPAY_KEY_ID

            }
        );


    } catch (err) {

        console.log(
            "BOOKING PAGE ERROR:",
            err
        );

        req.flash(
            "error",
            "Unable to open booking page"
        );

        return res.redirect(
            "/listings"
        );
    }
});



// ================= SAVE BOOKING DATA TO SESSION =================
router.post("/:id", isLoggedIn, async(req, res) => {
    try {

        const {
            fromDate,
            toDate,
            guests
        } = req.body;


        const roomPlan =
            req.body.roomPlan ?
            req.body.roomPlan.trim() :
            "";



        // ⭐ GET LISTING

        const listing =
            await Listing.findById(
                req.params.id
            );


        // ⭐ IMPORTANT:
        // CHECK LISTING BEFORE USING listing._id

        if (!listing) {

            return res.status(404).json({
                error: "Listing not found"
            });
        }



        // ================= DATE OVERLAP =================

        const existingBooking =
            await Booking.findOne({

                listing: listing._id,

                status: "Confirmed",

                fromDate: {
                    $lt: new Date(toDate)
                },

                toDate: {
                    $gt: new Date(fromDate)
                }

            });


        if (existingBooking) {

            return res.status(400).json({
                error: "Selected dates are already booked"
            });
        }



        // ================= SELECT ROOM PLAN =================

        const selectedPlan =
            listing.roomPlans.find(

                p =>
                p.name
                .trim()
                .toLowerCase() ===
                roomPlan
                .toLowerCase()

            );


        if (!selectedPlan) {

            return res.status(400).json({
                error: "Invalid room plan selected"
            });
        }



        // ================= CALCULATE NIGHTS =================

        const checkIn =
            new Date(fromDate);

        const checkOut =
            new Date(toDate);


        const nights =
            Math.ceil(

                (
                    checkOut -
                    checkIn
                ) /

                (
                    1000 *
                    60 *
                    60 *
                    24
                )

            );


        if (nights <= 0) {

            return res.status(400).json({
                error: "Invalid dates"
            });
        }



        // ================= PRICE =================

        const planExtra =
            Number(
                selectedPlan.extraPrice
            );


        const baseRoomPrice =
            Number(
                listing.price
            );


        const pricePerNight =
            baseRoomPrice +
            planExtra;



        const basePrice =
            nights *
            pricePerNight;



        // ================= PLATFORM FEE =================

        const platformFee =
            Math.round(
                basePrice * 0.05
            );



        // ================= GST =================

        const gst =
            Math.round(
                (
                    basePrice +
                    platformFee
                ) * 0.18
            );



        // ================= TOTAL =================

        const totalPrice =
            basePrice +
            platformFee +
            gst;



        // ================= SAVE SESSION =================

        req.session.bookingData = {

            listingId: listing._id,

            fromDate,

            toDate,

            guests,

            nights,

            selectedPlan: selectedPlan.name,

            planExtra,

            basePrice,

            platformFee,

            gst,

            totalPrice
        };


        return res.json({
            success: true
        });


    } catch (err) {

        console.log(
            "SESSION BOOKING ERROR:",
            err
        );

        return res.status(500).json({
            error: "Session save failed"
        });
    }
});



// ================= CANCEL BOOKING =================
// ================= CANCEL BOOKING =================
router.delete(
    "/cancel/:bookingId",
    isLoggedIn,
    async(req, res) => {

        try {

            const { bookingId } = req.params;


            // ================= VALID BOOKING ID =================

            if (!mongoose.Types.ObjectId.isValid(bookingId)) {

                req.flash(
                    "error",
                    "Invalid booking ID"
                );

                return res.redirect(
                    "/bookings/my-bookings"
                );
            }


            // ================= GET BOOKING =================

            const booking =
                await Booking.findById(bookingId)
                .populate({
                    path: "listing",
                    populate: {
                        path: "owner",
                        select: "username email profilePicture role"
                    }
                })
                .populate({
                    path: "user",
                    select: "username email profilePicture role"
                });


            // ================= BOOKING NOT FOUND =================

            if (!booking) {

                req.flash(
                    "error",
                    "Booking not found"
                );

                return res.redirect(
                    "/bookings/my-bookings"
                );
            }


            // ================= SECURITY =================

            if (!booking.user ||
                booking.user._id.toString() !==
                req.user._id.toString()
            ) {

                req.flash(
                    "error",
                    "Unauthorized action!"
                );

                return res.redirect(
                    "/bookings/my-bookings"
                );
            }


            // ================= ALREADY CANCELLED =================

            if (booking.status === "Cancelled") {

                req.flash(
                    "error",
                    "This booking is already cancelled"
                );

                return res.redirect(
                    "/bookings/my-bookings"
                );
            }


            // =====================================================
            // SAVE BOOKING AS CANCELLED
            // =====================================================

            booking.status = "Cancelled";

            await booking.save();


            // =====================================================
            // CUSTOMER CANCELLATION EMAIL
            // =====================================================

            try {

                if (booking.user && booking.user.email) {

                    await sendEmail(

                        booking.user.email,

                        "❌ Booking Cancelled - WanderLust",

                        `
                        <div style="
                            font-family: Arial, sans-serif;
                            max-width: 700px;
                            margin: auto;
                            padding: 20px;
                            border: 1px solid #ddd;
                            border-radius: 10px;
                        ">

                            <h2 style="
                                color: #dc3545;
                                text-align: center;
                            ">
                                ❌ Booking Cancelled
                            </h2>


                            <p>
                                Hello
                                <b>
                                    ${booking.user.username || "Customer"}
                                </b>,
                            </p>


                            <p>
                                Your following WanderLust booking
                                has been successfully cancelled.
                            </p>


                            <hr>


                            <!-- LISTING -->

                            <h3>
                                🏠 Listing Details
                            </h3>

                            <p>
                                <b>Listing:</b>
                                ${booking.listing
                                    ? booking.listing.title
                                    : "Listing Removed"}
                            </p>

                            <p>
                                <b>Location:</b>
                                ${booking.listing
                                    ? booking.listing.location
                                    : "N/A"}
                                ${
                                    booking.listing &&
                                    booking.listing.country
                                        ? ", " +
                                          booking.listing.country
                                        : ""
                                }
                            </p>


                            <hr>


                            <!-- SELLER -->

                            <h3>
                                👤 Seller Details
                            </h3>

                            <p>
                                <b>Name:</b>
                                ${
                                    booking.listing &&
                                    booking.listing.owner
                                        ? booking.listing.owner.username ||
                                          "Host unavailable"
                                        : "Host unavailable"
                                }
                            </p>

                            <p>
                                <b>Email:</b>
                                ${
                                    booking.listing &&
                                    booking.listing.owner
                                        ? booking.listing.owner.email ||
                                          "Email unavailable"
                                        : "Email unavailable"
                                }
                            </p>


                            <hr>


                            <!-- BOOKING DETAILS -->

                            <h3>
                                📋 Booking Details
                            </h3>

                            <p>
                                <b>Booked By:</b>
                                ${booking.user.username || "N/A"}
                            </p>

                            <p>
                                <b>Customer Email:</b>
                                ${booking.user.email}
                            </p>

                            <p>
                                <b>Check-in:</b>
                                ${new Date(
                                    booking.fromDate
                                ).toDateString()}
                            </p>

                            <p>
                                <b>Check-out:</b>
                                ${new Date(
                                    booking.toDate
                                ).toDateString()}
                            </p>

                            <p>
                                <b>Guests:</b>
                                ${booking.guests}
                            </p>

                            <p>
                                <b>Room Plan:</b>
                                ${booking.roomPlan}
                            </p>


                            <hr>


                            <!-- PAYMENT -->

                            <h3>
                                💳 Payment Details
                            </h3>

                            <p>
                                <b>Room Price:</b>
                                ₹${booking.basePrice}
                            </p>

                            <p>
                                <b>Platform Fee:</b>
                                ₹${booking.platformFee}
                            </p>

                            <p>
                                <b>GST:</b>
                                ₹${booking.gst}
                            </p>

                            <h3>
                                Total Paid:
                                ₹${booking.totalPrice}
                            </h3>

                            <p>
                                <b>Payment ID:</b>
                                ${booking.paymentId || "N/A"}
                            </p>

                            <p>
                                <b>Order ID:</b>
                                ${booking.orderId || "N/A"}
                            </p>


                            <p>
                                <b>Booking Status:</b>

                                <span style="
                                    color: #dc3545;
                                    font-weight: bold;
                                ">
                                    Cancelled
                                </span>
                            </p>


                            <hr>


                            <p style="
                                text-align: center;
                                color: #666;
                            ">
                                Your booking has been marked as
                                <b>Cancelled</b>.
                            </p>


                            <p style="
                                text-align: center;
                                color: #666;
                            ">
                                <b>WanderLust</b>
                            </p>

                        </div>
                        `
                    );

                    console.log(
                        "CUSTOMER CANCELLATION EMAIL SENT"
                    );
                }

            } catch (customerEmailError) {

                console.log(
                    "CUSTOMER CANCELLATION EMAIL ERROR:",
                    customerEmailError
                );

            }


            // =====================================================
            // SELLER / HOST CANCELLATION EMAIL
            // =====================================================

            try {

                if (
                    booking.listing &&
                    booking.listing.owner &&
                    booking.listing.owner.email
                ) {

                    await sendEmail(

                        booking.listing.owner.email,

                        "❌ Booking Cancelled - WanderLust",

                        `
                        <div style="
                            font-family: Arial, sans-serif;
                            max-width: 700px;
                            margin: auto;
                            padding: 20px;
                            border: 1px solid #ddd;
                            border-radius: 10px;
                        ">

                            <h2 style="
                                color: #dc3545;
                                text-align: center;
                            ">
                                ❌ Booking Cancelled
                            </h2>


                            <p>
                                Hello
                                <b>
                                    ${
                                        booking.listing.owner.username ||
                                        "Host"
                                    }
                                </b>,
                            </p>


                            <p>
                                A customer has cancelled a booking
                                for your property on
                                <b>WanderLust</b>.
                            </p>


                            <hr>


                            <!-- LISTING -->

                            <h3>
                                🏠 Listing Details
                            </h3>

                            <p>
                                <b>Listing:</b>
                                ${
                                    booking.listing.title
                                }
                            </p>

                            <p>
                                <b>Location:</b>
                                ${
                                    booking.listing.location
                                },
                                ${
                                    booking.listing.country
                                }
                            </p>


                            <hr>


                            <!-- CUSTOMER -->

                            <h3>
                                👤 Customer Details
                            </h3>

                            <p>
                                <b>Name:</b>
                                ${
                                    booking.user
                                        ? booking.user.username ||
                                          "N/A"
                                        : "Deleted User"
                                }
                            </p>

                            <p>
                                <b>Email:</b>
                                ${
                                    booking.user
                                        ? booking.user.email ||
                                          "N/A"
                                        : "N/A"
                                }
                            </p>


                            <hr>


                            <!-- BOOKING -->

                            <h3>
                                📋 Booking Details
                            </h3>

                            <p>
                                <b>Check-in:</b>
                                ${new Date(
                                    booking.fromDate
                                ).toDateString()}
                            </p>

                            <p>
                                <b>Check-out:</b>
                                ${new Date(
                                    booking.toDate
                                ).toDateString()}
                            </p>

                            <p>
                                <b>Guests:</b>
                                ${booking.guests}
                            </p>

                            <p>
                                <b>Room Plan:</b>
                                ${booking.roomPlan}
                            </p>


                            <hr>


                            <!-- PAYMENT -->

                            <h3>
                                💳 Payment Details
                            </h3>

                            <p>
                                <b>Room Price:</b>
                                ₹${booking.basePrice}
                            </p>

                            <p>
                                <b>Platform Fee:</b>
                                ₹${booking.platformFee}
                            </p>

                            <p>
                                <b>GST:</b>
                                ₹${booking.gst}
                            </p>

                            <h3>
                                Total Paid:
                                ₹${booking.totalPrice}
                            </h3>

                            <p>
                                <b>Payment ID:</b>
                                ${booking.paymentId || "N/A"}
                            </p>

                            <p>
                                <b>Order ID:</b>
                                ${booking.orderId || "N/A"}
                            </p>


                            <p>
                                <b>Booking Status:</b>

                                <span style="
                                    color: #dc3545;
                                    font-weight: bold;
                                ">
                                    Cancelled
                                </span>
                            </p>


                            <hr>


                            <p style="
                                text-align: center;
                                color: #666;
                            ">
                                The property is now available
                                for future bookings.
                            </p>


                            <p style="
                                text-align: center;
                                color: #666;
                            ">
                                <b>WanderLust</b>
                            </p>

                        </div>
                        `
                    );

                    console.log(
                        "SELLER CANCELLATION EMAIL SENT"
                    );
                }

            } catch (sellerEmailError) {

                console.log(
                    "SELLER CANCELLATION EMAIL ERROR:",
                    sellerEmailError
                );

            }


            // =====================================================
            // SUCCESS
            // =====================================================

            req.flash(
                "success",
                "Booking cancelled successfully!"
            );


            return res.redirect(
                "/bookings/my-bookings"
            );


        } catch (err) {

            console.log(
                "CANCEL BOOKING ERROR:",
                err
            );


            req.flash(
                "error",
                "Cannot cancel booking"
            );


            return res.redirect(
                "/bookings/my-bookings"
            );
        }
    }
);


module.exports = router;