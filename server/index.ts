import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import metricRoutes from './routes/metrics.js';
import analyticsRoutes from './routes/analytics.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to Database
connectDB();

// Routes
app.use('/api/metrics', metricRoutes);
app.use('/api/admin/analytics', analyticsRoutes);

app.get('/api/test', (req, res) => res.json({ status: 'ok' }));

app.get('/', (req, res) => {
  res.send('TransGPA API is running...');
});

// Local Development Server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
