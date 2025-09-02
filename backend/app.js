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

// CORS configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow your Render domain
    if (origin.includes('render.com') || origin.includes('onrender.com')) {
      return callback(null, true);
    }
    
    // Allow any origin in development, restrict in production
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, you can add specific domains here
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'dist')));

// Import routes
const recordsRoutes = require('./routes/records');
const authRoutes = require('./routes/auth');
const staffRoutes = require('./routes/staff');

// API Routes
app.use('/api', recordsRoutes);
app.use('/api', authRoutes);
app.use('/api', staffRoutes);


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Car Wash API is running',
    timestamp: new Date().toISOString()
  });
});


app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 4000;

// Add error handling for server startup
app.listen(PORT, (err) => {
    if (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS enabled for: localhost, render.com, onrender.com`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});
