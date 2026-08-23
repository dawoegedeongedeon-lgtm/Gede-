import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Activity, 
  ShieldCheck, 
  Server, 
  Key, 
  Hash, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Play, 
  RefreshCw, 
  Terminal, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Lock, 
  Zap,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Search,
  ChevronDown,
  Building2,
  DollarSign,
  Layers
} from 'lucide-react';
import { Mt5Account, Mt5SyncLog, CurrencySymbol, Trade, TradingAccount, TradingAccountType } from '../types';
import { formatCurrency } from '../utils/calculations';

export interface Mt5ServerItem {
  id: string;
  name: string;
  server: string;
  category: 'Prop Firm Futures' | 'Prop Firm CFD & Forex' | 'Broker CFD & Forex' | 'Broker Futures & Multi-Asset' | 'Autre';
  badge?: string;
  marketType: 'Futures' | 'CFD' | 'Forex' | 'Multi-Asset';
}

export const MT5_SERVERS_LIST: Mt5ServerItem[] = [
  // ====================================================
  // TOP PROP FIRMS — FUTURES (CME, CBOT, NYMEX, COMEX)
  // ====================================================
  { id: 'apex-live', name: 'Apex Trader Funding (PA / Live)', server: 'ApexTraderFunding-Live', category: 'Prop Firm Futures', badge: 'Top Futures #1', marketType: 'Futures' },
  { id: 'apex-eval', name: 'Apex Trader Funding (Evaluation)', server: 'ApexTraderFunding-Evaluation', category: 'Prop Firm Futures', badge: 'Futures', marketType: 'Futures' },
  { id: 'topstep-live', name: 'Topstep (Live Funded)', server: 'Topstep-Live', category: 'Prop Firm Futures', badge: 'Top Futures', marketType: 'Futures' },
  { id: 'topstep-combine', name: 'Topstep (Trading Combine)', server: 'Topstep-Combine', category: 'Prop Firm Futures', badge: 'Futures', marketType: 'Futures' },
  { id: 'mffu-live', name: 'My Funded Futures (MFFU Live)', server: 'MyFundedFutures-Live', category: 'Prop Firm Futures', badge: 'Top Futures', marketType: 'Futures' },
  { id: 'mffu-eval', name: 'My Funded Futures (MFFU Sim/Eval)', server: 'MyFundedFutures-Eval', category: 'Prop Firm Futures', badge: 'Futures', marketType: 'Futures' },
  { id: 'tradeday-live', name: 'TradeDay (Live Funded Account)', server: 'TradeDay-Live', category: 'Prop Firm Futures', badge: 'Futures', marketType: 'Futures' },
  { id: 'bulenox-live', name: 'Bulenox (Master Account)', server: 'Bulenox-Live', category: 'Prop Firm Futures', badge: 'Futures', marketType: 'Futures' },
  { id: 'bulenox-eval', name: 'Bulenox (Qualification)', server: 'Bulenox-Eval', category: 'Prop Firm Futures', badge: 'Futures', marketType: 'Futures' },
  { id: 'takeprofittrader-live', name: 'Take Profit Trader (PRO Account)', server: 'TakeProfitTrader-Live', category: 'Prop Firm Futures', badge: 'Futures', marketType: 'Futures' },
  { id: 'uprofit-live', name: 'UProfit Trader (Live / Eval)', server: 'UProfitTrader-Live', category: 'Prop Firm Futures', badge: 'Futures', marketType: 'Futures' },
  { id: 'elitetrader-live', name: 'Elite Trader Funding (Live & Fast Track)', server: 'EliteTraderFunding-Live', category: 'Prop Firm Futures', badge: 'Futures', marketType: 'Futures' },
  { id: 'earn2trade-live', name: 'Earn2Trade (Trader Career Path / Gauntlet)', server: 'Earn2Trade-Live', category: 'Prop Firm Futures', badge: 'Futures', marketType: 'Futures' },
  { id: 'fasttrack-live', name: 'Fast Track Trading', server: 'FastTrackTrading-Live', category: 'Prop Firm Futures', badge: 'Futures', marketType: 'Futures' },
  { id: 'tickticktrader-live', name: 'TickTick Trader (Live & TTT Direct)', server: 'TickTickTrader-Live', category: 'Prop Firm Futures', badge: 'Futures', marketType: 'Futures' },
  { id: 'bluesky-live', name: 'Blue Sky Trading', server: 'BlueSkyTrading-Live', category: 'Prop Firm Futures', badge: 'Futures', marketType: 'Futures' },
  { id: 'leeloo-live', name: 'Leeloo Trading (Live & Practice)', server: 'LeelooTrading-Live', category: 'Prop Firm Futures', badge: 'Futures', marketType: 'Futures' },

  // ====================================================
  // TOP PROP FIRMS — CFD, FOREX, INDICES & CRYPTO
  // ====================================================
  { id: 'ftmo-live', name: 'FTMO (Live Real Account)', server: 'FTMO-Server', category: 'Prop Firm CFD & Forex', badge: 'Leader Mondial CFD', marketType: 'CFD' },
  { id: 'ftmo-demo', name: 'FTMO (Challenge / Verification)', server: 'FTMO-Demo', category: 'Prop Firm CFD & Forex', badge: 'Populaire', marketType: 'CFD' },
  { id: 'fundednext-live', name: 'FundedNext (Stellar / Express Live)', server: 'FundedNext-Server', category: 'Prop Firm CFD & Forex', badge: 'Populaire', marketType: 'CFD' },
  { id: 'fundednext-demo', name: 'FundedNext (Challenge Demo)', server: 'FundedNext-Demo', category: 'Prop Firm CFD & Forex', marketType: 'CFD' },
  { id: 'fundingpips-live', name: 'Funding Pips (Funded Account)', server: 'FundingPips-Server', category: 'Prop Firm CFD & Forex', badge: 'Populaire', marketType: 'CFD' },
  { id: 'fundingpips-demo', name: 'Funding Pips (Student / Master Demo)', server: 'FundingPips-Demo', category: 'Prop Firm CFD & Forex', marketType: 'CFD' },
  { id: 'the5ers-live', name: 'The 5%ers (High Stakes / Bootcamp Live)', server: 'The5ers-Live', category: 'Prop Firm CFD & Forex', badge: 'Top Prop', marketType: 'CFD' },
  { id: 'the5ers-demo', name: 'The 5%ers (Evaluation Demo)', server: 'The5ers-Demo', category: 'Prop Firm CFD & Forex', marketType: 'CFD' },
  { id: 'tft-live', name: 'The Funded Trader (Royal / Knight Live)', server: 'TheFundedTrader-Server', category: 'Prop Firm CFD & Forex', marketType: 'CFD' },
  { id: 'alphacapital-live', name: 'Alpha Capital Markets (Live Alpha)', server: 'AlphaCapital-Live', category: 'Prop Firm CFD & Forex', badge: 'Populaire', marketType: 'CFD' },
  { id: 'alphacapital-demo', name: 'Alpha Capital Markets (Evaluation)', server: 'AlphaCapital-Demo', category: 'Prop Firm CFD & Forex', marketType: 'CFD' },
  { id: 'e8funding-live', name: 'E8 Markets / E8 Funding (Live E8)', server: 'E8Funding-Server', category: 'Prop Firm CFD & Forex', badge: 'Top Prop', marketType: 'CFD' },
  { id: 'e8funding-demo', name: 'E8 Markets (Track / Demo)', server: 'E8Funding-Demo', category: 'Prop Firm CFD & Forex', marketType: 'CFD' },
  { id: 'goatfunded-live', name: 'Goat Funded Trader', server: 'GoatFundedTrader-Live', category: 'Prop Firm CFD & Forex', marketType: 'CFD' },
  { id: 'myfundedfx-live', name: 'MyFundedFX (Live)', server: 'MyFundedFX-Server', category: 'Prop Firm CFD & Forex', marketType: 'CFD' },
  { id: 'fundedtradingplus-live', name: 'Funded Trading Plus', server: 'FundedTradingPlus-Live', category: 'Prop Firm CFD & Forex', marketType: 'CFD' },
  { id: 'maven-live', name: 'Maven Trading (Live & Sim)', server: 'MavenTrading-Live', category: 'Prop Firm CFD & Forex', marketType: 'CFD' },
  { id: 'fxify-live', name: 'FXIFY (Funded / Evaluation)', server: 'FXIFY-Live', category: 'Prop Firm CFD & Forex', badge: 'Top Prop', marketType: 'CFD' },
  { id: 'lark-live', name: 'Lark Funding (Live)', server: 'LarkFunding-Live', category: 'Prop Firm CFD & Forex', marketType: 'CFD' },
  { id: 'instantfunding-live', name: 'Instant Funding (Direct Payout)', server: 'InstantFunding-Live', category: 'Prop Firm CFD & Forex', marketType: 'CFD' },
  { id: 'blueguardian-live', name: 'Blue Guardian', server: 'BlueGuardian-Live', category: 'Prop Firm CFD & Forex', marketType: 'CFD' },
  { id: 'citytraders-live', name: 'City Traders Imperium (CTI)', server: 'CityTradersImperium-Live', category: 'Prop Firm CFD & Forex', marketType: 'CFD' },
  { id: 'trueforexfunds-live', name: 'True Forex Funds (TFF)', server: 'TrueForexFunds-Server', category: 'Prop Firm CFD & Forex', marketType: 'CFD' },

  // ====================================================
  // TOP BROKERS — FOREX & CFD (ECN, RAW SPREAD, DMA)
  // ====================================================
  { id: 'icmarkets-live', name: 'IC Markets (Raw Spread Live 01)', server: 'ICMarketsSC-Live', category: 'Broker CFD & Forex', badge: 'Top Broker #1', marketType: 'CFD' },
  { id: 'icmarkets-live02', name: 'IC Markets (Raw Spread Live 02)', server: 'ICMarketsSC-Live02', category: 'Broker CFD & Forex', badge: 'Top Broker', marketType: 'CFD' },
  { id: 'icmarkets-live03', name: 'IC Markets (Live 03 / ECN)', server: 'ICMarkets-Live03', category: 'Broker CFD & Forex', marketType: 'CFD' },
  { id: 'icmarkets-demo', name: 'IC Markets (Demo Test)', server: 'ICMarkets-Demo', category: 'Broker CFD & Forex', marketType: 'CFD' },
  { id: 'pepperstone-live', name: 'Pepperstone (Razor ECN Live 01)', server: 'Pepperstone-Live', category: 'Broker CFD & Forex', badge: 'Top Broker', marketType: 'CFD' },
  { id: 'pepperstone-live02', name: 'Pepperstone (Razor ECN Live 02)', server: 'Pepperstone-Live02', category: 'Broker CFD & Forex', marketType: 'CFD' },
  { id: 'pepperstone-demo', name: 'Pepperstone (Demo)', server: 'Pepperstone-Demo', category: 'Broker CFD & Forex', marketType: 'CFD' },
  { id: 'exness-real', name: 'Exness (Real 1 Pro/Zero)', server: 'Exness-Real', category: 'Broker CFD & Forex', badge: 'Volume Mondial', marketType: 'CFD' },
  { id: 'exness-real2', name: 'Exness (Real 2)', server: 'Exness-Real2', category: 'Broker CFD & Forex', marketType: 'CFD' },
  { id: 'exness-real3', name: 'Exness (Real 3)', server: 'Exness-Real3', category: 'Broker CFD & Forex', marketType: 'CFD' },
  { id: 'exness-trial', name: 'Exness (Trial / Demo)', server: 'Exness-Trial', category: 'Broker CFD & Forex', marketType: 'CFD' },
  { id: 'xm-real', name: 'XM Global (Real ECN/Ultra Low)', server: 'XMGlobal-Real', category: 'Broker CFD & Forex', badge: 'Populaire', marketType: 'CFD' },
  { id: 'xm-demo', name: 'XM Global (Demo)', server: 'XMGlobal-Demo', category: 'Broker CFD & Forex', marketType: 'CFD' },
  { id: 'vantage-live', name: 'Vantage Markets (RAW ECN Live)', server: 'VantageFX-Live', category: 'Broker CFD & Forex', badge: 'Populaire', marketType: 'CFD' },
  { id: 'fpmarkets-live', name: 'FP Markets (Raw ECN Live 01)', server: 'FPMarkets-Live', category: 'Broker CFD & Forex', badge: 'Top Spreads', marketType: 'CFD' },
  { id: 'fpmarkets-live02', name: 'FP Markets (Live 02)', server: 'FPMarkets-Live02', category: 'Broker CFD & Forex', marketType: 'CFD' },
  { id: 'tickmill-live', name: 'Tickmill (Pro / VIP Live)', server: 'Tickmill-Live', category: 'Broker CFD & Forex', badge: 'Top Broker', marketType: 'CFD' },
  { id: 'admirals-live', name: 'Admirals (Admiral Markets Live)', server: 'AdmiralMarkets-Live', category: 'Broker CFD & Forex', marketType: 'CFD' },
  { id: 'roboforex-pro', name: 'RoboForex (Pro ECN Live)', server: 'RoboForex-Pro', category: 'Broker CFD & Forex', marketType: 'CFD' },
  { id: 'blackbull-live', name: 'BlackBull Markets (Prime ECN)', server: 'BlackBullMarkets-Live', category: 'Broker CFD & Forex', marketType: 'CFD' },
  { id: 'thinkmarkets-live', name: 'ThinkMarkets (ThinkZero Live)', server: 'ThinkMarkets-Live', category: 'Broker CFD & Forex', marketType: 'CFD' },
  { id: 'fxtm-real', name: 'FXTM (Advantage ECN)', server: 'FXTM-Real', category: 'Broker CFD & Forex', marketType: 'CFD' },
  { id: 'darwinex-live', name: 'Darwinex (DMA / STP Live)', server: 'Darwinex-Live', category: 'Broker CFD & Forex', marketType: 'CFD' },
  { id: 'eightcap-real', name: 'Eightcap (Raw Real)', server: 'Eightcap-Real', category: 'Broker CFD & Forex', marketType: 'CFD' },
  { id: 'fusionmarkets-live', name: 'Fusion Markets (ZERO Account)', server: 'FusionMarkets-Live', category: 'Broker CFD & Forex', badge: 'Bas Frais', marketType: 'CFD' },
  { id: 'swissquote-live', name: 'Swissquote Bank (Institutional Live)', server: 'Swissquote-Live', category: 'Broker CFD & Forex', badge: 'Banque Suisse', marketType: 'CFD' },
  { id: 'avatrade-real', name: 'AvaTrade (Real Live)', server: 'AvaTrade-Real', category: 'Broker CFD & Forex', marketType: 'CFD' },

  // ====================================================
  // TOP BROKERS — FUTURES & INSTITUTIONAL MULTI-ASSET
  // ====================================================
  { id: 'ampfutures-live', name: 'AMP Global / AMP Futures', server: 'AMPGlobal-Live', category: 'Broker Futures & Multi-Asset', badge: 'Direct Futures', marketType: 'Futures' },
  { id: 'ibkr-live', name: 'Interactive Brokers (MT5 Bridge)', server: 'InteractiveBrokers-Live', category: 'Broker Futures & Multi-Asset', badge: 'Institutionnel', marketType: 'Multi-Asset' },
  { id: 'tradovate-bridge', name: 'Tradovate / NinjaTrader Bridge', server: 'Tradovate-Live', category: 'Broker Futures & Multi-Asset', badge: 'Futures NQ/ES', marketType: 'Futures' },
  { id: 'saxobank-live', name: 'Saxo Bank (Multi-Asset DMA)', server: 'SaxoBank-Live', category: 'Broker Futures & Multi-Asset', badge: 'Institutionnel', marketType: 'Multi-Asset' },
  { id: 'igmarkets-live', name: 'IG Markets (Direct DMA / CFD)', server: 'IGMarkets-Live', category: 'Broker Futures & Multi-Asset', badge: 'Top Broker', marketType: 'CFD' },
  { id: 'cmc-live', name: 'CMC Markets (Alpha Live)', server: 'CMCMarkets-Live', category: 'Broker Futures & Multi-Asset', marketType: 'CFD' },
  { id: 'oanda-live', name: 'OANDA (Live Real)', server: 'OANDA-Live', category: 'Broker CFD & Forex', marketType: 'Forex' },
  { id: 'capitalcom-live', name: 'Capital.com (Live)', server: 'CapitalCom-Live', category: 'Broker CFD & Forex', marketType: 'CFD' },
  { id: 'axi-live', name: 'Axi (Pro ECN Live)', server: 'AxiTrader-Live', category: 'Broker CFD & Forex', marketType: 'CFD' },
];

interface Mt5SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencySymbol;
  onTradeSynced?: (trade: Trade) => void;
  onAccountConnected?: (account: TradingAccount, syncedTrades: Trade[]) => void;
  onSelectActiveAccount?: (accountId: string) => void;
}

export const Mt5SyncModal: React.FC<Mt5SyncModalProps> = ({
  isOpen,
  onClose,
  currency,
  onTradeSynced,
  onAccountConnected,
  onSelectActiveAccount,
}) => {
  const [activeTab, setActiveTab] = useState<'connect' | 'accounts' | 'webhook' | 'mql5' | 'logs'>('connect');
  const [accounts, setAccounts] = useState<Mt5Account[]>([]);
  const [logs, setLogs] = useState<Mt5SyncLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [resyncingId, setResyncingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Server selection dropdown state
  const [selectedServer, setSelectedServer] = useState<string>('ApexTraderFunding-Live');
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);
  const [serverSearchQuery, setServerSearchQuery] = useState('');
  const [serverCategoryFilter, setServerCategoryFilter] = useState<'ALL' | 'FUTURES_PROP' | 'CFD_PROP' | 'BROKER'>('ALL');
  const [isCustomServer, setIsCustomServer] = useState(false);
  const [customServerText, setCustomServerText] = useState('');

  // Form Fields
  const [accountNumber, setAccountNumber] = useState('1029482');
  const [investorPassword, setInvestorPassword] = useState('InvPass123!');
  const [accountName, setAccountName] = useState('Apex Trader Funding (PA 50k)');
  const [initialCapital, setInitialCapital] = useState<number>(50000);
  const [customCapital, setCustomCapital] = useState<string>('50000');
  const [accountType, setAccountType] = useState<TradingAccountType>('PROP_FIRM_FUNDED');
  const [autoJournal, setAutoJournal] = useState(true);
  const [syncInitialHistory, setSyncInitialHistory] = useState(true);

  // Test Trade Simulation State
  const [simulatingTrade, setSimulatingTrade] = useState(false);
  const [simPair, setSimPair] = useState('NQ (Nasdaq Futures)');
  const [simOutcome, setSimOutcome] = useState<'WIN' | 'LOSS'>('WIN');

  const webhookUrl = `${window.location.origin}/api/mt5/webhook`;

  // Filtered Servers based on search & category
  const filteredServers = useMemo(() => {
    let list = MT5_SERVERS_LIST;
    if (serverCategoryFilter === 'FUTURES_PROP') {
      list = list.filter((s) => s.category === 'Prop Firm Futures');
    } else if (serverCategoryFilter === 'CFD_PROP') {
      list = list.filter((s) => s.category === 'Prop Firm CFD & Forex');
    } else if (serverCategoryFilter === 'BROKER') {
      list = list.filter((s) => s.category === 'Broker CFD & Forex' || s.category === 'Broker Futures & Multi-Asset');
    }

    if (!serverSearchQuery.trim()) return list;
    const q = serverSearchQuery.toLowerCase();
    return list.filter(
      (s) => s.name.toLowerCase().includes(q) || s.server.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.marketType.toLowerCase().includes(q)
    );
  }, [serverSearchQuery, serverCategoryFilter]);

  // Current effective server name
  const effectiveServer = isCustomServer ? customServerText : selectedServer;

  // Auto update account name suggestions when server changes
  const handleSelectServer = (srv: Mt5ServerItem) => {
    setSelectedServer(srv.server);
    setIsCustomServer(false);
    setIsServerDropdownOpen(false);
    setServerSearchQuery('');
    
    // Suggest clean account name
    setAccountName(`${srv.name} (#${accountNumber || '1029482'})`);
    if (srv.category === 'Prop Firm Futures' || srv.category === 'Prop Firm CFD & Forex') {
      setAccountType(srv.name.toLowerCase().includes('demo') || srv.name.toLowerCase().includes('eval') || srv.name.toLowerCase().includes('combine') ? 'PROP_FIRM_EVALUATION' : 'PROP_FIRM_FUNDED');
    } else {
      setAccountType('LIVE_PERSONAL');
    }
  };

  // Fetch MT5 Accounts and Logs
  const fetchMt5Data = async () => {
    try {
      const [accRes, logRes] = await Promise.all([
        fetch('/api/mt5/accounts'),
        fetch('/api/mt5/logs'),
      ]);

      if (accRes.ok) {
        const accData = await accRes.json();
        if (accData.success && accData.accounts) {
          setAccounts(accData.accounts);
        }
      }

      if (logRes.ok) {
        const logData = await logRes.json();
        if (logData.success && logData.logs) {
          setLogs(logData.logs);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch MT5 accounts', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMt5Data();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveServer || !accountNumber) {
      setStatusMessage({ type: 'error', text: 'Veuillez sélectionner le serveur MT5 et renseigner le numéro de compte.' });
      return;
    }

    const resolvedInitialCapital = Number(customCapital) || initialCapital || 50000;

    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/mt5/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: effectiveServer,
          accountNumber,
          investorPassword,
          accountName: accountName || `${effectiveServer} #${accountNumber}`,
          initialBalance: resolvedInitialCapital,
          accountType,
          currency,
          autoJournal,
          syncInitialHistory,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const syncedCount = data.syncedTrades ? data.syncedTrades.length : 0;
        setStatusMessage({
          type: 'success',
          text: `✅ Compte MT5 lié avec succès ! ${syncedCount > 0 ? `${syncedCount} trades synchronisés et importés dans le journal.` : 'Prêt pour l\'auto-journalisation.'}`,
        });

        // Notify parent App component to update state, accounts, and trades
        if (onAccountConnected && data.tradingAccount) {
          onAccountConnected(data.tradingAccount, data.syncedTrades || []);
        }

        await fetchMt5Data();
        setActiveTab('accounts');
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Erreur lors de la liaison du compte MT5.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Impossible de joindre le serveur de synchronisation.' });
    } finally {
      setLoading(false);
    }
  };

  // Re-sync history for an existing account
  const handleResyncHistory = async (acc: Mt5Account) => {
    setResyncingId(acc.id);
    try {
      const res = await fetch('/api/mt5/sync-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber: acc.accountNumber,
          server: acc.server,
          accountName: acc.accountName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: `🔄 ${data.newTrades?.length || 0} nouveaux trades synchronisés depuis MT5. Dashboard actualisé !`,
        });
        if (onAccountConnected && data.allTrades) {
          // Trigger reload
          window.dispatchEvent(new Event('storage'));
        }
        await fetchMt5Data();
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: 'Erreur lors du rafraîchissement MT5' });
    } finally {
      setResyncingId(null);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      await fetch(`/api/mt5/accounts/${id}`, { method: 'DELETE' });
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setStatusMessage({ type: 'success', text: 'Compte MT5 déconnecté avec succès.' });
    } catch (err) {
      console.error(err);
    }
  };

  // Simulate incoming closed MT5 trade (Real Webhook Test)
  const handleSimulateTrade = async () => {
    setSimulatingTrade(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/mt5/test-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber,
          server: effectiveServer,
          pair: simPair,
          outcome: simOutcome,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.trade) {
        setStatusMessage({
          type: 'success',
          text: `Événement MT5 reçu : Trade #${data.trade.ticketNumber} (${data.trade.pair}) ajouté au journal ! Dashboard actualisé.`,
        });
        if (onTradeSynced) {
          onTradeSynced(data.trade);
        }
        await fetchMt5Data();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Échec du test de synchronisation MT5.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setSimulatingTrade(false);
    }
  };

  const copyToClipboard = (text: string, isUrl = false) => {
    navigator.clipboard.writeText(text);
    if (isUrl) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const mql5Code = `//+------------------------------------------------------------------+
//|                                   Tre13ze_Journal_Bridge.mq5     |
//|                          Copyright 2026, Tre13ze SaaS Desk       |
//|               https://tre13ze-journal.ai/api/mt5/webhook         |
//+------------------------------------------------------------------+
#property copyright "Tre13ze Journal v1.0"
#property link      "${webhookUrl}"
#property version   "1.00"
#property strict

input string InpWebhookUrl   = "${webhookUrl}"; // URL Webhook
input string InpSecretToken  = "${accounts[0]?.webhookSecret || 'mt5_sec_tre13ze_live_2026'}"; // Token Secret
input string InpAccountAlias = "${accounts[0]?.accountName || 'Compte MT5 Principal'}"; // Alias

// Détection automatique de clôture de position
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      ulong dealTicket = trans.deal;
      if(HistoryDealSelect(dealTicket))
      {
         ENUM_DEAL_ENTRY entryType = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
         if(entryType == DEAL_ENTRY_OUT || entryType == DEAL_ENTRY_INOUT)
         {
            // Position clôturée détectée -> Envoi Webhook JSON
            SendClosedTradeToTre13ze(dealTicket);
         }
      }
   }
}

// Fonction d'envoi HTTP POST WebRequest
void SendClosedTradeToTre13ze(ulong dealTicket)
{
   string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
   long dealType = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
   double volume = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
   double price  = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
   double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
   double comm   = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
   double swap   = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
   string comment = HistoryDealGetString(dealTicket, DEAL_COMMENT);
   datetime time = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);

   string json = StringFormat(
      "{\\"ticket\\":%I64u,\\"symbol\\":\\"%s\\",\\"type\\":\\"%s\\",\\"volume\\":%.2f,\\"closePrice\\":%.5f,\\"profit\\":%.2f,\\"commission\\":%.2f,\\"swap\\":%.2f,\\"closeTime\\":\\"%s\\",\\"server\\":\\"%s\\",\\"accountNumber\\":\\"%d\\",\\"webhookSecret\\":\\"%s\\",\\"comment\\":\\"%s\\"}",
      dealTicket,
      symbol,
      (dealType == DEAL_TYPE_BUY ? "BUY" : "SELL"),
      volume,
      price,
      profit,
      comm,
      swap,
      TimeToString(time, TIME_DATE|TIME_SECONDS),
      AccountInfoString(ACCOUNT_SERVER),
      (int)AccountInfoInteger(ACCOUNT_LOGIN),
      InpSecretToken,
      comment
   );

   char post[], result[];
   string headers = "Content-Type: application/json\\r\\n";
   StringToCharArray(json, post, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(post, ArraySize(post)-1);

   int timeout = 5000;
   string resultHeaders;
   int res = WebRequest("POST", InpWebhookUrl, headers, timeout, post, result, resultHeaders);
   if(res == 200)
      Print("✅ [Tre13ze Journal] Trade #", dealTicket, " synchronisé avec succès !");
   else
      Print("⚠️ [Tre13ze Journal] Erreur code: ", res, " - Vérifiez WebRequest dans MT5.");
}
`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7 shadow-2xl ring-1 ring-blue-500/20 max-h-[92vh] flex flex-col">
        
        {/* Glow Effects */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-blue-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-56 w-56 rounded-full bg-emerald-600/10 blur-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 text-white shadow-lg shadow-blue-500/25 ring-1 ring-blue-400/40">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-sans">
                  Synchronisation MetaTrader 5 (MT5)
                </h2>
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync & Auto-Account
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Connexion directe, importation de l'historique et journalisation automatique des trades MT5.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-zinc-900/80 pb-3 mb-4 overflow-x-auto no-scrollbar">
          {[
            { id: 'connect', label: '1. Connecter un Compte MT5', icon: Server },
            { id: 'accounts', label: `Mes Comptes MT5 (${accounts.length})`, icon: ShieldCheck },
            { id: 'webhook', label: '2. Webhook & Simulation', icon: Zap },
            { id: 'mql5', label: '3. Script MQL5 EA', icon: Terminal },
            { id: 'logs', label: `Logs & Événements (${logs.length})`, icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                    : 'text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Global Status Banner */}
        {statusMessage && (
          <div className={`mb-4 p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
            statusMessage.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-zinc-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          
          {/* TAB 1: FORMULAIRE DE CONNEXION SÉCURISÉ */}
          {activeTab === 'connect' && (
            <form onSubmit={handleConnectSubmit} className="space-y-4">
              <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-950/20 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-200/90 leading-relaxed">
                  <strong>Connexion MT5 & Création de Compte Automatique :</strong> La connexion ajoute automatiquement ce compte dans la liste de vos comptes de trading, importe l'historique complet des trades et met à jour instantanément votre Dashboard et vos métriques de performance.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. SÉLECTEUR DE SERVEUR MT5 (DROPDOWN RECHERCHABLE) */}
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Server className="h-3.5 w-3.5 text-blue-400" />
                      Serveur MT5 <span className="text-rose-400">*</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomServer(!isCustomServer);
                        setIsServerDropdownOpen(false);
                      }}
                      className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {isCustomServer ? 'Choisir dans la liste' : 'Saisie personnalisée'}
                    </button>
                  </label>

                  {isCustomServer ? (
                    <input
                      type="text"
                      value={customServerText}
                      onChange={(e) => setCustomServerText(e.target.value)}
                      placeholder="Ex: ApexTraderFunding-Live ou ICMarketsSC-Live"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      required
                    />
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)}
                        className="w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2.5 text-base sm:text-xs text-white hover:border-zinc-700 focus:border-blue-500 focus:outline-none transition-all text-left"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Building2 className="h-4 w-4 text-blue-400 shrink-0" />
                          <span className="font-semibold text-zinc-200 truncate">
                            {MT5_SERVERS_LIST.find(s => s.server === selectedServer)?.name || selectedServer}
                          </span>
                          <span className="text-[10px] font-mono text-blue-300 bg-blue-950/60 border border-blue-800/40 px-1.5 py-0.5 rounded shrink-0">
                            {selectedServer}
                          </span>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${isServerDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Menu */}
                      {isServerDropdownOpen && (
                        <div className="absolute z-30 top-full mt-1.5 left-0 right-0 rounded-2xl border border-zinc-800 bg-zinc-950 p-2.5 shadow-2xl ring-1 ring-black/70 max-h-80 overflow-y-auto space-y-2 animate-in fade-in zoom-in-95 duration-150">
                          
                          {/* Search Filter (Without autoFocus to prevent mobile zoom) */}
                          <div className="relative">
                            <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              value={serverSearchQuery}
                              onChange={(e) => setServerSearchQuery(e.target.value)}
                              placeholder="Rechercher : Apex, Topstep, FTMO, IC Markets, Exness..."
                              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 pl-9 pr-3 py-2 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>

                          {/* Quick Category Filter Tabs */}
                          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar pt-0.5">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setServerCategoryFilter('ALL'); }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                                serverCategoryFilter === 'ALL'
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                              }`}
                            >
                              Tous ({MT5_SERVERS_LIST.length})
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setServerCategoryFilter('FUTURES_PROP'); }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                                serverCategoryFilter === 'FUTURES_PROP'
                                  ? 'bg-amber-600 text-white shadow-sm'
                                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                              }`}
                            >
                              <span>🚀</span> Futures Prop ({MT5_SERVERS_LIST.filter(s => s.category === 'Prop Firm Futures').length})
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setServerCategoryFilter('CFD_PROP'); }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                                serverCategoryFilter === 'CFD_PROP'
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                              }`}
                            >
                              <span>💎</span> CFD Prop ({MT5_SERVERS_LIST.filter(s => s.category === 'Prop Firm CFD & Forex').length})
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setServerCategoryFilter('BROKER'); }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                                serverCategoryFilter === 'BROKER'
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                              }`}
                            >
                              <span>⚡</span> Top Brokers ({MT5_SERVERS_LIST.filter(s => s.category.includes('Broker')).length})
                            </button>
                          </div>

                          {/* List of servers */}
                          <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                            {filteredServers.length === 0 ? (
                              <div className="p-4 text-center text-xs text-zinc-400 space-y-2">
                                <p>Aucun serveur trouvé pour "{serverSearchQuery}".</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCustomServerText(serverSearchQuery);
                                    setIsCustomServer(true);
                                    setIsServerDropdownOpen(false);
                                  }}
                                  className="w-full py-2 px-3 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-semibold"
                                >
                                  Utiliser "{serverSearchQuery}" en serveur personnalisé
                                </button>
                              </div>
                            ) : (
                              filteredServers.map((srv) => (
                                <button
                                  key={srv.id}
                                  type="button"
                                  onClick={() => handleSelectServer(srv)}
                                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                                    selectedServer === srv.server
                                      ? 'bg-blue-600/20 text-blue-200 border border-blue-500/40 shadow-sm'
                                      : 'hover:bg-zinc-900/90 text-zinc-300 border border-transparent'
                                  }`}
                                >
                                  <div className="space-y-1 truncate">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-xs text-white truncate">{srv.name}</span>
                                      {srv.badge && (
                                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                                          srv.category === 'Prop Firm Futures'
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                            : srv.category === 'Prop Firm CFD & Forex'
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                        }`}>
                                          {srv.badge}
                                        </span>
                                      )}
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                                        {srv.marketType}
                                      </span>
                                    </div>
                                    <div className="text-[10px] font-mono text-zinc-400 truncate flex items-center gap-2">
                                      <span>{srv.server}</span>
                                      <span>•</span>
                                      <span className="text-zinc-500">{srv.category}</span>
                                    </div>
                                  </div>
                                  {selectedServer === srv.server && (
                                    <Check className="h-4 w-4 text-blue-400 shrink-0 ml-2" />
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-zinc-500">
                    Sélectionnez votre prop firm ou courtier dans la liste pré-remplie.
                  </p>
                </div>

                {/* Numéro de compte MT5 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-blue-400" />
                    Numéro de compte MT5 (Login) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Ex: 1029482"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    required
                  />
                  <p className="text-[10px] text-zinc-500">Votre identifiant de connexion numérique MT5.</p>
                </div>

                {/* Mot de passe Investisseur */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-emerald-400" />
                      Mot de passe Investisseur
                    </span>
                    <span className="text-[10px] text-emerald-400 font-medium font-mono">Lecture Seule</span>
                  </label>
                  <input
                    type="password"
                    value={investorPassword}
                    onChange={(e) => setInvestorPassword(e.target.value)}
                    placeholder="Mot de passe en lecture seule"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-zinc-500">Permet uniquement de lire les statistiques (aucun ordre).</p>
                </div>

                {/* Nom du compte dans Tre13ze Journal */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-blue-400" />
                    Nom du compte dans l'application
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Ex: Apex PA 50k ou FTMO 100k Challenge"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-zinc-500">Nom sous lequel ce compte apparaîtra dans le Dashboard.</p>
                </div>

                {/* Capital Initial */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-blue-400" />
                    Capital Initial du Compte
                  </label>
                  <div className="grid grid-cols-4 gap-1 mb-1.5">
                    {[10000, 25000, 50000, 100000].map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => {
                          setInitialCapital(cap);
                          setCustomCapital(String(cap));
                        }}
                        className={`py-1 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                          Number(customCapital) === cap
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {cap >= 1000 ? `${cap / 1000}k$` : `${cap}$`}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={customCapital}
                    onChange={(e) => {
                      setCustomCapital(e.target.value);
                      setInitialCapital(Number(e.target.value) || 0);
                    }}
                    placeholder="Autre montant (ex: 200000)"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2 text-base sm:text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>

                {/* Type de compte */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Type de Compte</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as any)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2.5 text-base sm:text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="PROP_FIRM_FUNDED">Prop Firm - Compte Financé / PA / Master</option>
                    <option value="PROP_FIRM_EVALUATION">Prop Firm - Évaluation / Challenge</option>
                    <option value="LIVE_PERSONAL">Compte Personnel Réel (Courtier ECN/DMA)</option>
                    <option value="DEMO_BACKTEST">Compte Démo / Entraînement</option>
                  </select>
                </div>
              </div>

              {/* Checkboxes for instant History Sync & Auto-Journal */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-blue-500/30 bg-blue-950/20">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                      Synchroniser & Importer tout l'historique des trades immédiatement
                    </span>
                    <p className="text-[11px] text-zinc-400">
                      Remplir automatiquement le Journal avec les positions passées et mettre à jour le Dashboard instantanément.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={syncInitialHistory}
                    onChange={(e) => setSyncInitialHistory(e.target.checked)}
                    className="h-5 w-5 rounded-md border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/50">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-white">
                      Auto-Journalisation Continue en Temps Réel
                    </span>
                    <p className="text-[11px] text-zinc-400">
                      Dès qu'un nouveau trade est clôturé sur MT5, enregistrer automatiquement la fiche avec P&L et statistiques.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoJournal}
                    onChange={(e) => setAutoJournal(e.target.checked)}
                    className="h-5 w-5 rounded-md border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Connecter & Synchroniser les Trades MT5</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: COMPTES CONNECTÉS */}
          {activeTab === 'accounts' && (
            <div className="space-y-4">
              {accounts.length === 0 ? (
                <div className="text-center py-10 rounded-2xl border border-dashed border-zinc-800 p-6 space-y-3">
                  <Server className="h-10 w-10 text-zinc-600 mx-auto" />
                  <p className="text-sm font-semibold text-zinc-300 font-sans">
                    Aucun compte MT5 connecté pour le moment
                  </p>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Connectez votre premier compte MetaTrader 5 avec le formulaire pour démarrer la synchronisation instantanée.
                  </p>
                  <button
                    onClick={() => setActiveTab('connect')}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Connecter mon compte MT5
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white font-sans">
                            {acc.accountName}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold font-mono">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            CONNECTÉ & SYNCHRONISÉ
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-mono">
                          <span>Serveur : <strong className="text-zinc-200">{acc.server}</strong></span>
                          <span>Compte : <strong className="text-zinc-200">#{acc.accountNumber}</strong></span>
                          <span>Trades synchronisés : <strong className="text-blue-400">{acc.totalSyncedTrades || 0}</strong></span>
                        </div>
                        <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Dernière activité : {acc.lastSyncAt ? new Date(acc.lastSyncAt).toLocaleString('fr-FR') : 'En attente'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleResyncHistory(acc)}
                          disabled={resyncingId === acc.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 text-xs font-semibold transition-all disabled:opacity-50"
                          title="Synchroniser les nouveaux trades"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${resyncingId === acc.id ? 'animate-spin' : ''}`} />
                          <span>Actualiser l'historique</span>
                        </button>

                        <button
                          onClick={() => {
                            if (onSelectActiveAccount) {
                              onSelectActiveAccount(`acc-mt5-${acc.accountNumber}`);
                            }
                            onClose();
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-sm"
                        >
                          <span>Voir sur Dashboard</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>

                        <button
                          onClick={() => handleDeleteAccount(acc.id)}
                          className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                          title="Supprimer cette connexion"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setActiveTab('connect')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Ajouter un autre compte MT5
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WEBHOOK & LIVE SIMULATION */}
          {activeTab === 'webhook' && (
            <div className="space-y-5">
              {/* Webhook Endpoint Box */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                    URL du Webhook de Réception (API MT5)
                  </span>
                  <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md border border-blue-500/20">
                    POST application/json
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs font-mono text-blue-300 truncate">
                    {webhookUrl}
                  </div>
                  <button
                    onClick={() => copyToClipboard(webhookUrl, true)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-all shrink-0"
                  >
                    {copiedUrl ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedUrl ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
              </div>

              {/* Live MT5 Simulation Trigger */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4.5 space-y-3.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Play className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-sans">
                      Testeur de Clôture MT5 en Direct
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Simulez l'arrivée d'un trade clôturé par MetaTrader 5 pour voir le journal se remplir instantanément.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-300">Paire / Actif</label>
                    <select
                      value={simPair}
                      onChange={(e) => setSimPair(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="EUR/USD">EUR/USD (Forex)</option>
                      <option value="NAS100">NAS100 (Indice)</option>
                      <option value="XAU/USD">XAU/USD (Gold)</option>
                      <option value="BTC/USD">BTC/USD (Crypto)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-zinc-300">Résultat du Trade</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSimOutcome('WIN')}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                          simOutcome === 'WIN'
                            ? 'border-emerald-500 bg-emerald-600 text-white'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Gain (+Take Profit)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimOutcome('LOSS')}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                          simOutcome === 'LOSS'
                            ? 'border-rose-500 bg-rose-600 text-white'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Perte (-Stop Loss)
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSimulateTrade}
                  disabled={simulatingTrade}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-600/25 active:scale-[0.98] disabled:opacity-50"
                >
                  {simulatingTrade ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-emerald-200" />
                      <span>Déclencher l'événement MT5 & Remplir le Journal</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SCRIPT MQL5 EXPERT ADVISOR */}
          {activeTab === 'mql5' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white font-sans">
                    Code Source Expert Advisor MQL5
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Placez ce fichier dans <code className="text-blue-400 font-mono">MQL5/Experts</code> sur votre plateforme MetaTrader 5.
                  </p>
                </div>

                <button
                  onClick={() => copyToClipboard(mql5Code)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-all shadow-sm"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCode ? 'Code Copié !' : 'Copier tout le script'}</span>
                </button>
              </div>

              {/* Instructions Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-1">
                  <span className="font-bold text-blue-400 font-mono">1. MetaEditor</span>
                  <p className="text-zinc-400 text-[11px]">
                    Ouvrez MetaEditor sur MT5 (<kbd className="bg-zinc-800 px-1 py-0.5 rounded">F4</kbd>) et créez un nouvel EA.
                  </p>
                </div>
                <div className="p-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-1">
                  <span className="font-bold text-blue-400 font-mono">2. Coller & Compiler</span>
                  <p className="text-zinc-400 text-[11px]">
                    Collez le code ci-dessous et cliquez sur <strong>Compiler</strong> (<kbd className="bg-zinc-800 px-1 py-0.5 rounded">F7</kbd>).
                  </p>
                </div>
                <div className="p-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-1">
                  <span className="font-bold text-blue-400 font-mono">3. Autoriser WebRequest</span>
                  <p className="text-zinc-400 text-[11px]">
                    Dans MT5 : <em>Outils &gt; Options &gt; Expert Advisors</em> &gt; Cochez <em>Autoriser WebRequest</em> pour cette URL.
                  </p>
                </div>
              </div>

              {/* Code Viewer */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 overflow-hidden font-mono text-[11px] text-zinc-300 max-h-72 overflow-y-auto">
                <pre className="whitespace-pre">{mql5Code}</pre>
              </div>
            </div>
          )}

          {/* TAB 5: LOGS & SYNCHRONISATION EN DIRECT */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">
                  Événements récents reçus ({logs.length})
                </span>
                <button
                  onClick={fetchMt5Data}
                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  Actualiser les logs
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                  Aucun log de synchronisation pour le moment.
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/70 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                        <div>
                          <span className="font-bold text-zinc-200">
                            Ticket #{log.ticket} ({log.symbol})
                          </span>
                          <p className="text-[11px] text-zinc-400 font-sans">
                            {log.message}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${log.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatCurrency(log.profit, currency, true)}
                        </span>
                        <p className="text-[10px] text-zinc-500">
                          {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
