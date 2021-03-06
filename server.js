// load .env data into process.env
require('dotenv').config();

// Web server config
const PORT           = process.env.PORT || 8080;
const ENV            = process.env.ENV || "development";
const express        = require("express");
const bodyParser     = require("body-parser");
const cookieParser   = require('cookie-session');
const methodOverride = require('method-override');
const sass           = require("node-sass-middleware");
const app            = express();
const morgan         = require('morgan');
const path           = require('path');

// PG database client/connection setup
const { Pool } = require('pg');
const dbParams = require('./lib/db.js');
const db = new Pool(dbParams);
db.connect();

//Twilio connection setup.
const Twilio = require('twilio');
const twilio = new Twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_TOKEN
);

// Load the logger first so all (static) HTTP requests are logged to STDOUT
// 'dev' = Concise output colored by response status for development use.
//         The :status token will be colored red for server error codes, yellow for client error codes, cyan for redirection codes, and uncolored for all other codes.
app.use(morgan('dev'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser({
  name: 'thai-tanic-session',
  keys: ['/^%b,W7N*V@-+G>vl."X`@*Sa3@RxF0W@&95?H^{t.z(l']
}));
app.use(sass({
  src: path.join(__dirname, '/styles'),
  dest: path.join(__dirname, '/public/styles'),
  debug: true,
  outputStyle: 'compressed',
  prefix: '/styles'
}));
console.log(__dirname);
app.use(methodOverride('_method'));

app.use(express.static(path.join(__dirname, "public")));

// Separated Routes for each Resource
// Note: Feel free to replace the example routes below with your own
const userRoutes = require("./routes/user/user");
const restaurantRoutes = require("./routes/restaurant/restaurant");

// Mount all resource routes
// Note: Feel free to replace the example routes below with your own
// Note: mount other resources here, using the same pattern above
app.use("/user", userRoutes(db, twilio));
app.use("/restaurant", restaurantRoutes(db, twilio));

// Home page
// Warning: avoid creating more routes in this file!
// Separate them into separate routes files (see above).
app.get("/", (req, res) => {
  res.redirect('/user');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
