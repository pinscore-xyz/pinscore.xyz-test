require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const connectDB        = require('./src/config/db.config');
const authRoutes       = require('./src/routes/auth.route');
const userRoutes       = require('./src/routes/user.route');
const eventRoutes      = require('./src/routes/event.route');
const socialRoutes     = require('./src/routes/social.route');
const pinscoreRoutes   = require('./src/routes/pinscore.route');
const fansRoutes        = require('./src/routes/fans.route');       // Day 4 Task 5
const attributionRoutes = require('./src/routes/attribution.route'); // Day 4 Task 6
const errorHandler     = require('./src/middleware/error.middleware');

const app = express();

// ── Request middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── DB ────────────────────────────────────────────────────────────────
connectDB();

// ── Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/events',    eventRoutes);
app.use('/api/social',    socialRoutes);
app.use('/api/pinscore',  pinscoreRoutes);   // Day 3 Task 4 — score alias
app.use('/api/fans',        fansRoutes);        // Day 4 Task 5
app.use('/api/attribution', attributionRoutes); // Day 4 Task 6

// ── Health ────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// ── 404 ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    error:   'NOT_FOUND',
  });
});

// ── Global error handler — MUST be last ──────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Pinscore backend running on port ${PORT}`));

module.exports = app;
