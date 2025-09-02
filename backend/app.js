const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');


dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'dist')));

// Import routes
const recordsRoutes = require('./routes/records');
const authRoutes = require('./routes/auth');
const staffRoutes = require('./routes/staff');

// API Routes
app.use('/records', recordsRoutes);  // /records/*
app.use('/auth', authRoutes);         // /api/auth/*
app.use('/staff', staffRoutes);        // /api/staff/*


// Catch all handler: send back React's index.html file for any non-API routes
app.get(/^(?!\/(records|auth|staff)).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
