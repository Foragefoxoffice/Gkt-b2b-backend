import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.route.js';
import firmRoutes from './routes/firm.route.js';
import companyRoutes from './routes/company.route.js';
import buyerRoutes from './routes/buyer.route.js';
import transporterRoutes from './routes/transporter.route.js';
import weaverRoutes from './routes/weaver.route.js';
import designCategoryRoutes from './routes/designCategory.route.js';
import designRoutes from './routes/design.route.js';
import cartRoutes from './routes/cart.route.js';
import orderRoutes from './routes/order.route.js';
import dispatchRoutes from './routes/dispatch.route.js';
import dashboardRoutes from './routes/dashboard.route.js';
import productRequestRoutes from './routes/productRequest.route.js';
import userRoutes from './routes/user.route.js';
import staffRoutes from './routes/staff.route.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // allow serving static files to other origins
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/firms', firmRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/buyers', buyerRoutes);
app.use('/api/transporters', transporterRoutes);
app.use('/api/weavers', weaverRoutes);
app.use('/api/categories', designCategoryRoutes);
app.use('/api/designs', designRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dispatches', dispatchRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/product-requests', productRequestRoutes);
app.use('/api/users', userRoutes);
app.use('/api/staff', staffRoutes);

// Root Route
app.get('/', (req, res) => {
  res.status(200).json({ message: 'B2B Textile ERP API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    data: null
  });
});

export default app;
