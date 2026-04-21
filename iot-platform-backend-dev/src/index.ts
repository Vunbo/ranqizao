import { startServer } from './app/server';

startServer().catch((error) => {
  console.error('Failed to start API server:', error);
  process.exit(1);
});