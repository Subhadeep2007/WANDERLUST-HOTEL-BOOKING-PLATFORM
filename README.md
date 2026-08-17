🏡 WanderLust

WanderLust is a full-stack room/property booking platform built with Node.js, Express.js, MongoDB, EJS, Cloudinary, Razorpay and Nodemailer.

🚀 Features

👤 Authentication & Users

Email OTP signup verification

Login / logout

Forgot password and reset password OTP

Username

Profile picture

Customer / Host / Admin roles

User blocking

Profile section with username, email and profile picture

🏠 Listings

Hosts can create, edit and delete listings with:

Title

Description

Price

Location and country

Guest capacity

Room plans and extra pricing

Cloudinary images

Map coordinates

🛡️ Admin

Host management

Block hosts

Listing moderation

Approve / reject listings

View all platform bookings

View seller and customer information

View payment information

🔎 Explore & Listing Details

Approved listings

Search

Seller/host username

Seller email

Seller profile picture

Reviews

Room plans

Capacity

Location and map

📅 Booking

Customers can:

Select check-in/check-out

Select guests

Select room plan

Calculate booking price

Check date availability

View booking history

View booking/payment details

💳 Razorpay

Razorpay order creation

Payment verification

Signature verification

Payment ID

Order ID

Base price

Platform fee

GST

Total price

👨‍💼 Host Dashboard

Hosts can see:

Guest profile picture

Guest username

Guest email

Guest count

Room type

Dates

Booking status

Payment details

Hosts can cancel bookings belonging to their own properties.

❌ Cancellation

Customer and Host cancellation is supported.

Bookings are not deleted when cancelled:

Confirmed
   ↓
Cancelled

Payment and booking history remain preserved.

📧 Email

Nodemailer/Gmail SMTP is used for project emails such as:

Signup OTP

Login OTP

Forgot password OTP

Password reset

Booking notifications

Cancellation notifications

🖼️ Cloudinary

Used for:

Listing images

User profile pictures

🗺️ Maps

OpenStreetMap

Nominatim geocoding

Leaflet.js

🛠️ Tech Stack

Frontend

HTML

CSS

Bootstrap

JavaScript

EJS

Font Awesome

Leaflet.js

Backend

Node.js

Express.js

EJS

Express Session

Passport / Passport Local Mongoose

Multer

Joi

Nodemailer

Axios

Database

MongoDB

Mongoose

External Services

Cloudinary

Razorpay

Gmail SMTP

OpenStreetMap / Nominatim

📁 Project Architecture

Typical structure:

WanderLust/
│
├── app.js
├── package.json
├── .env
├── README.md
│
├── controllers/
├── models/
│   ├── user.js
│   ├── listing.js
│   ├── booking.js
│   └── review.js
│
├── routes/
│   ├── userRoutes.js
│   ├── listingRoutes.js
│   ├── booking.js
│   ├── hostRoutes.js
│   └── adminRoutes.js
│
├── middleware/
├── utils/
│   ├── cloudinary.js
│   ├── sendEmail.js
│   └── razorpay.js
│
├── views/
│   ├── layouts/
│   ├── listings/
│   ├── bookings/
│   ├── host/
│   ├── admin/
│   └── users/
│
└── public/

Keep the exact file/folder names of the final repository.

🔄 Booking Flow

Customer
   ↓
Listing
   ↓
Dates + Guests + Room Plan
   ↓
Price Calculation
   ↓
Razorpay Order
   ↓
Payment
   ↓
Server Signature Verification
   ↓
Booking Created
   ↓
Payment = Paid
Booking = Confirmed

❌ Cancellation Flow

Customer

My Bookings
   ↓
Cancel Booking
   ↓
Ownership Check
   ↓
status = Cancelled
   ↓
Booking remains in database

Host

Host Dashboard
   ↓
Cancel Booking
   ↓
Property Ownership Check
   ↓
status = Cancelled
   ↓
Booking remains in database

Cancelled bookings no longer block future availability because the booking availability logic checks confirmed bookings.

🔐 Environment Variables

Create .env locally:

MONGO_URI=your_mongodb_connection_string

SESSION_SECRET=your_session_secret

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

CLOUD_NAME=your_cloudinary_name
CLOUD_KEY=your_cloudinary_api_key
CLOUD_SECRET=your_cloudinary_api_secret

EMAIL=your_email@gmail.com
PASS=your_gmail_app_password

Never commit .env.

Recommended .gitignore:

.env
node_modules/

💻 Local Setup

Clone the repository:

git clone YOUR_GITHUB_REPOSITORY_URL
cd WanderLust

Install dependencies:

npm install

Create .env and add the required variables.

Run development server:

npm run dev

Or:

node app.js

Open the port configured by the project, for example:

http://localhost:8080

☁️ Production Deployment

Recommended architecture for this Express/EJS project:

Browser
   │
   ▼
Vercel (if a separate frontend is used)
   │
   ▼
Render
Node + Express Backend
   │
   ├── MongoDB
   ├── Cloudinary
   ├── Razorpay
   └── Gmail SMTP / Nodemailer

For the Express/EJS backend, deploy the Node application on a Node-compatible service such as Render.

If a separate frontend is deployed on Vercel, configure its API/backend URL to point to the Render service.

Keep SMTP credentials and all API secrets in the deployment platform's environment variables.

📧 Gmail / Nodemailer

The project email utility uses Gmail SMTP.

Use a Gmail App Password for the SMTP password rather than putting a normal account password into source code.

EMAIL=your_email@gmail.com
PASS=your_gmail_app_password

Do not expose these values in GitHub.

🔒 Security

Never commit .env

Never expose Razorpay secret key

Never expose Cloudinary secret

Never expose Gmail App Password

Verify Razorpay signatures on the server

Validate input on the server

Check authentication on protected routes

Check host ownership before host booking actions

Use HTTPS in production

🧪 Production Checklist

Authentication

Signup

OTP verification

Login

Logout

Forgot password

Reset password

Username

Profile picture

Listings

Create

Edit

Delete

Image upload

Admin approval

Search

Listing details

Booking

Dates

Guests

Room plan

Price calculation

Razorpay order

Payment

Signature verification

Booking creation

Cancellation

Customer cancellation

Host cancellation

Ownership checks

Cancelled status

Booking history preserved

Cancelled dates available again

Cancellation emails

Admin

Dashboard

Host blocking

Listing moderation

All bookings

📊 Current Project Status

Authentication        ✅
OTP Verification      ✅
Username              ✅
Profile Picture       ✅
Roles                 ✅
Listings              ✅
Cloudinary            ✅
Admin Moderation      ✅
Search                ✅
Reviews               ✅
Maps                  ✅
Room Plans            ✅
Booking               ✅
Razorpay              ✅
Payment Verification  ✅
Host Dashboard        ✅
Admin Bookings        ✅
Customer Cancellation ✅
Host Cancellation     ✅
Email Notifications   ✅
👨‍💻 Author

Subhadeep

B.Tech CSE (AI)

⭐ Project

If you find this project useful, consider giving the repository a ⭐ on GitHub.
