import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { config } from './config.js';
import { authenticate } from './middleware/auth.js';
import { errorHandler, notFound, originGuard } from './middleware/errors.js';
import { authRouter } from './routes/auth.routes.js';
import { catalogRouter } from './routes/catalog.routes.js';
import { inventoryRouter } from './routes/inventory.routes.js';
import { operationsRouter } from './routes/operations.routes.js';
import { adminRouter } from './routes/admin.routes.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(originGuard);
app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));
app.use('/api/auth', authRouter);
app.use('/api', authenticate, catalogRouter);
app.use('/api/inventory', authenticate, inventoryRouter);
app.use('/api', authenticate, operationsRouter);
app.use('/api', authenticate, adminRouter);
app.use(notFound);
app.use(errorHandler);

