import { app } from './app.js';
import { config } from './config.js';
import { prisma } from './lib/prisma.js';

const server = app.listen(config.PORT, () => console.log(`Pharmacy API listening on http://localhost:${config.PORT}`));
const shutdown = async () => { server.close(); await prisma.$disconnect(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
