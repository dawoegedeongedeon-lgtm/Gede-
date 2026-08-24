import { Router } from 'express';
import { tradingController } from '../controllers/trading.controller';

export const tradingRouter = Router();

// Database state & sync routes
tradingRouter.get('/database', tradingController.getDatabase);
tradingRouter.post('/database/sync', tradingController.syncDatabase);

// Accounts CRUD routes
tradingRouter.post('/accounts', tradingController.saveAccount);
tradingRouter.delete('/accounts/:id', tradingController.deleteAccount);

// Trades CRUD routes
tradingRouter.post('/trades', tradingController.saveTrade);
tradingRouter.delete('/trades/:id', tradingController.deleteTrade);

// MT5 routes
tradingRouter.get('/mt5/accounts', tradingController.getMt5Accounts);
tradingRouter.post('/mt5/accounts', tradingController.saveMt5Account);
tradingRouter.delete('/mt5/accounts/:id', tradingController.deleteMt5Account);
