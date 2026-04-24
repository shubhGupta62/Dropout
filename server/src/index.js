require('dotenv').config();
const express = require('express');
const cors = require('cors');

const dropsRouter = require('./routes/drops');
const brandsRouter = require('./routes/brands');
const usersRouter = require('./routes/users');
const uploadRouter = require('./routes/upload');
const authRouter = require('./routes/auth');
const adminRouter = require('./admin/routes');
const graphRouter = require('./graph');
const analyticsRouter = require('./routes/analytics');

// Global error-handling utilities
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://dropout-eta.vercel.app',
    'https://dropamyn.com',
    'https://www.dropamyn.com',
    'http://localhost:3000',
    'http://localhost:3200',
  ],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/drops', dropsRouter);
app.use('/api/brands', brandsRouter);
app.use('/api/users', usersRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/graph', graphRouter);
app.use('/api/analytics', analyticsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root
app.get('/', (req, res) => {
  res.json({ name: 'Dropout API', version: '1.0.0', docs: '/api/health' });
});

// ── 404 catch-all — any route not matched above gets a clean 404 ────
app.use((req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
});

// ── Global error handler — MUST be registered last ──────────────────
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Dropout API running on port ${PORT}`);
});
