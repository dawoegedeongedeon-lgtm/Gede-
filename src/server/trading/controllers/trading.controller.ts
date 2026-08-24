import { Request, Response } from 'express';
import { tradingService } from '../services/trading.service';

export class TradingController {
  constructor(private service = tradingService) {}

  /**
   * GET /api/database - Get full database state
   */
  public getDatabase = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const data = await this.service.getDatabaseState(user?.id);
      res.json({ success: true, data });
    } catch (err: any) {
      console.error('[TradingController.getDatabase Error]:', err.message);
      res.status(500).json({ success: false, error: 'Erreur lors de la récupération des données.' });
    }
  };

  /**
   * POST /api/database/sync - Synchronize state
   */
  public syncDatabase = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const result = await this.service.syncDatabaseState(req.body, user?.id);
      res.json({
        success: true,
        count: result.tradesCount,
        accountsCount: result.accountsCount,
        updatedAt: result.updatedAt,
      });
    } catch (err: any) {
      console.error('[TradingController.syncDatabase Error]:', err.message);
      res.status(500).json({ success: false, error: 'Erreur lors de la synchronisation des données.' });
    }
  };

  /**
   * POST /api/accounts - Save/update an account
   */
  public saveAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const accountData = req.body;
      if (!accountData || !accountData.name) {
        res.status(400).json({ error: 'Le nom du compte est obligatoire.' });
        return;
      }
      const saved = await this.service.saveAccount(accountData, user?.id);
      res.json({ success: true, account: saved });
    } catch (err: any) {
      console.error('[TradingController.saveAccount Error]:', err.message);
      res.status(500).json({ error: 'Erreur lors de la sauvegarde du compte.' });
    }
  };

  /**
   * DELETE /api/accounts/:id - Delete an account
   */
  public deleteAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const success = await this.service.deleteAccount(id, user?.id);
      res.json({ success });
    } catch (err: any) {
      console.error('[TradingController.deleteAccount Error]:', err.message);
      res.status(500).json({ error: 'Erreur lors de la suppression du compte.' });
    }
  };

  /**
   * POST /api/trades - Save/update a trade
   */
  public saveTrade = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const tradeData = req.body;
      if (!tradeData || !tradeData.pair) {
        res.status(400).json({ error: 'La paire ou symbole est obligatoire.' });
        return;
      }
      const saved = await this.service.saveTrade(tradeData, user?.id);
      res.json({ success: true, trade: saved });
    } catch (err: any) {
      console.error('[TradingController.saveTrade Error]:', err.message);
      res.status(500).json({ error: 'Erreur lors de la sauvegarde du trade.' });
    }
  };

  /**
   * DELETE /api/trades/:id - Delete a trade
   */
  public deleteTrade = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const success = await this.service.deleteTrade(id, user?.id);
      res.json({ success });
    } catch (err: any) {
      console.error('[TradingController.deleteTrade Error]:', err.message);
      res.status(500).json({ error: 'Erreur lors de la suppression du trade.' });
    }
  };

  /**
   * GET /api/mt5/accounts - List MT5 accounts
   */
  public getMt5Accounts = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const accounts = await this.service.getMt5Accounts(user?.id);
      res.json({ success: true, accounts });
    } catch (err: any) {
      console.error('[TradingController.getMt5Accounts Error]:', err.message);
      res.status(500).json({ error: 'Erreur lors de la récupération des comptes MT5.' });
    }
  };

  /**
   * POST /api/mt5/accounts - Create or connect MT5 account
   */
  public saveMt5Account = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const { server, accountNumber } = req.body;
      if (!server || !accountNumber) {
        res.status(400).json({ error: 'Le serveur MT5 et le numéro de compte sont obligatoires.' });
        return;
      }
      const saved = await this.service.saveMt5Account(req.body, user?.id);
      res.json({
        success: true,
        account: saved,
        webhookUrl: `/api/mt5/webhook?secret=${saved.webhookSecret}`,
      });
    } catch (err: any) {
      console.error('[TradingController.saveMt5Account Error]:', err.message);
      res.status(500).json({ error: 'Erreur lors de la configuration MT5.' });
    }
  };

  /**
   * DELETE /api/mt5/accounts/:id - Disconnect MT5 account
   */
  public deleteMt5Account = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const success = await this.service.deleteMt5Account(id);
      res.json({ success });
    } catch (err: any) {
      console.error('[TradingController.deleteMt5Account Error]:', err.message);
      res.status(500).json({ error: 'Erreur lors de la déconnexion MT5.' });
    }
  };
}

export const tradingController = new TradingController();
