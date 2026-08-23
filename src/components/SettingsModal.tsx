import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  User, 
  Globe, 
  Palette, 
  DollarSign, 
  ShieldAlert, 
  LogOut, 
  Trash2, 
  Check, 
  Save, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  Sliders,
  Bell
} from 'lucide-react';
import { UserProfile, UserSettings, LanguageCode, ThemeAccentColor, ThemeBackgroundMode, CurrencySymbol } from '../types';
import { LANGUAGES, getTranslation } from '../utils/i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onUpdateProfile: (updatedProfile: Partial<UserProfile>) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

export const ACCENT_COLORS: { id: ThemeAccentColor; label: string; bgClass: string; borderClass: string; hex: string }[] = [
  { id: 'blue', label: 'Bleu Tre13ze', bgClass: 'bg-blue-600', borderClass: 'border-blue-500', hex: '#2563eb' },
  { id: 'emerald', label: 'Vert Émeraude', bgClass: 'bg-emerald-600', borderClass: 'border-emerald-500', hex: '#059669' },
  { id: 'purple', label: 'Violet Cyberpunk', bgClass: 'bg-purple-600', borderClass: 'border-purple-500', hex: '#9333ea' },
  { id: 'amber', label: 'Or & Ambre Prop', bgClass: 'bg-amber-500', borderClass: 'border-amber-400', hex: '#f59e0b' },
  { id: 'rose', label: 'Rose Néon', bgClass: 'bg-rose-600', borderClass: 'border-rose-500', hex: '#e11d48' },
  { id: 'cyan', label: 'Cyan Matrix', bgClass: 'bg-cyan-500', borderClass: 'border-cyan-400', hex: '#06b6d4' },
  { id: 'slate', label: 'Slate Minimal', bgClass: 'bg-zinc-500', borderClass: 'border-zinc-400', hex: '#71717a' },
];

export const BACKGROUND_MODES: { id: ThemeBackgroundMode; label: string; description: string; previewClass: string }[] = [
  { id: 'deep', label: 'Sombre Profond (Défaut)', description: 'Fond sombre moderne avec reflets subtils', previewClass: 'bg-[#090d16] border-zinc-800' },
  { id: 'oled', label: 'Noir Pur OLED', description: 'Contraste absolu pour écrans OLED et économie d\'énergie', previewClass: 'bg-black border-zinc-900' },
  { id: 'navy', label: 'Bleu Nuit (Navy)', description: 'Ambiance trading desk nocturne bleutée', previewClass: 'bg-[#070e1c] border-blue-950' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  onUpdateSettings,
  onUpdateProfile,
  onLogout,
  onDeleteAccount,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'language' | 'trading' | 'danger'>('profile');
  
  // Profile Form State
  const [name, setName] = useState(currentUser?.name || 'M. Treize');
  const [email, setEmail] = useState(currentUser?.email || 'mrtreize006@gmail.com');
  const [role, setRole] = useState(currentUser?.role || 'Pro Quant Trader');
  const [bio, setBio] = useState(currentUser?.bio || 'Trader spécialisé sur Forex & Futures (NAS100 / XAUUSD). Discipline et gestion stricte du R:R.');
  
  // Settings Form State
  const [currentLang, setCurrentLang] = useState<LanguageCode>(settings.language || 'fr');
  const [currentAccent, setCurrentAccent] = useState<ThemeAccentColor>(settings.accentColor || 'blue');
  const [currentBgMode, setCurrentBgMode] = useState<ThemeBackgroundMode>(settings.backgroundMode || 'deep');
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencySymbol>(settings.defaultCurrency || '$');
  const [riskPerTrade, setRiskPerTrade] = useState<number>(settings.riskPerTradePct || 1.0);
  const [timezone, setTimezone] = useState<string>(settings.timezone || 'Europe/Paris (UTC+1)');
  
  // Danger Zone confirmation
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const t = (key: string) => getTranslation(currentLang, key);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({ name, email, role, bio });
    onUpdateSettings({
      language: currentLang,
      accentColor: currentAccent,
      backgroundMode: currentBgMode,
      defaultCurrency,
      riskPerTradePct: riskPerTrade,
      timezone,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleExecuteDeleteAccount = () => {
    if (confirmDeleteText.trim().toUpperCase() !== 'SUPPRIMER') {
      return;
    }
    setIsDeleting(true);
    setTimeout(() => {
      onDeleteAccount();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7 shadow-2xl ring-1 ring-blue-500/20 max-h-[92vh] flex flex-col">
        
        {/* Glow Effects */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-blue-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-52 w-52 rounded-full bg-purple-600/10 blur-3xl" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-sans flex items-center gap-2">
                {t('settings')}
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Tre13ze v1.0
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Gérez votre profil, vos thèmes, votre langue et les paramètres de sécurité.
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
        <div className="flex items-center gap-1 border-b border-zinc-900/80 pb-3 mb-4 overflow-x-auto no-scrollbar">
          {[
            { id: 'profile', label: t('profile'), icon: User },
            { id: 'appearance', label: t('appearance'), icon: Palette },
            { id: 'language', label: t('language'), icon: Globe },
            { id: 'trading', label: t('preferences'), icon: Sliders },
            { id: 'danger', label: t('security_danger'), icon: ShieldAlert, danger: true },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? tab.danger 
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : tab.danger
                      ? 'text-rose-400 hover:bg-rose-950/40 hover:text-rose-300'
                      : 'text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback Banner */}
        {saveSuccess && (
          <div className="mb-4 p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Paramètres enregistrés avec succès !</span>
          </div>
        )}

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">

          {/* TAB 1: PROFIL & MON COMPTE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50">
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xl font-bold ring-2 ring-blue-500/30 shadow-lg">
                    {name ? name.substring(0, 2).toUpperCase() : 'TR'}
                  </div>
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate font-sans">{name || 'Trader Tre13ze'}</h3>
                  <p className="text-xs text-zinc-400 truncate">{email}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      {currentUser?.plan || 'Quant Elite & MT5 Live'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Nom complet / Pseudonyme</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Adresse e-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-300">Rôle & Style de Trading</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ex: Scalper Intraday / Prop Firm Trader"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-300">Bio & Règles personnelles</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="Vos principes clés, règles de discipline et objectifs..."
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 p-3 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
                >
                  <Save className="h-4 w-4" />
                  <span>{t('save_changes')}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: APPARENCE & COULEURS */}
          {activeTab === 'appearance' && (
            <div className="space-y-5">
              {/* Accent Colors */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <Palette className="h-3.5 w-3.5 text-blue-400" />
                  {t('theme_accent')}
                </label>
                <p className="text-xs text-zinc-400">
                  Choisissez la couleur primaire qui illumine vos graphiques, boutons et badges de l'application.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
                  {ACCENT_COLORS.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setCurrentAccent(acc.id);
                        onUpdateSettings({ accentColor: acc.id });
                      }}
                      className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all text-left ${
                        currentAccent === acc.id
                          ? 'border-blue-500 bg-zinc-900 shadow-md ring-1 ring-blue-500/30'
                          : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700'
                      }`}
                    >
                      <span className={`h-5 w-5 rounded-full ${acc.bgClass} flex items-center justify-center text-white shrink-0`}>
                        {currentAccent === acc.id && <Check className="h-3 w-3" />}
                      </span>
                      <span className="text-xs font-semibold text-zinc-200 truncate">
                        {acc.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Mode */}
              <div className="space-y-2.5 pt-2 border-t border-zinc-900">
                <label className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                  {t('theme_bg')}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {BACKGROUND_MODES.map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => {
                        setCurrentBgMode(bg.id);
                        onUpdateSettings({ backgroundMode: bg.id });
                      }}
                      className={`p-3.5 rounded-2xl border transition-all text-left space-y-1.5 ${
                        currentBgMode === bg.id
                          ? 'border-blue-500 bg-blue-950/20 shadow-md ring-1 ring-blue-500/30'
                          : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{bg.label}</span>
                        {currentBgMode === bg.id && <Check className="h-4 w-4 text-blue-400" />}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        {bg.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LANGUE DE L'INTERFACE */}
          {activeTab === 'language' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-blue-400" />
                  Sélectionnez votre langue de navigation
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Les termes techniques de trading, boutons et rapports IA s'adapteront instantanément.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setCurrentLang(lang.code);
                      onUpdateSettings({ language: lang.code });
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      currentLang === lang.code
                        ? 'border-blue-500 bg-blue-950/30 text-blue-300 shadow-md ring-1 ring-blue-500/40'
                        : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{lang.flag}</span>
                      <div className="text-left">
                        <span className="font-bold text-xs text-white block">{lang.label}</span>
                        <span className="text-[11px] text-zinc-500">{lang.nativeName}</span>
                      </div>
                    </div>
                    {currentLang === lang.code && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PRÉFÉRENCES DE TRADING */}
          {activeTab === 'trading' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-blue-400" />
                  Devise par défaut de vos comptes
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {(['$', '€', '£', '¥', 'CHF'] as CurrencySymbol[]).map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => {
                        setDefaultCurrency(curr);
                        onUpdateSettings({ defaultCurrency: curr });
                      }}
                      className={`py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                        defaultCurrency === curr
                          ? 'border-blue-500 bg-blue-600 text-white shadow-md'
                          : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Risque maximum conseillé par trade :</span>
                  <span className="font-mono text-blue-400 font-bold">{riskPerTrade}%</span>
                </label>
                <input
                  type="range"
                  min="0.25"
                  max="5.0"
                  step="0.25"
                  value={riskPerTrade}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setRiskPerTrade(v);
                    onUpdateSettings({ riskPerTradePct: v });
                  }}
                  className="w-full accent-blue-600 bg-zinc-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>0.25% (Conservateur)</span>
                  <span>1.0% (Prop Firm Standard)</span>
                  <span>5.0% (Agressif)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-400" />
                  Fuseau Horaire de Marché
                </label>
                <select
                  value={timezone}
                  onChange={(e) => {
                    setTimezone(e.target.value);
                    onUpdateSettings({ timezone: e.target.value });
                  }}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="Europe/Paris (UTC+1)">Europe/Paris (Session de Londres & Francfort)</option>
                  <option value="America/New_York (UTC-5)">America/New_York (Session NYSE & NASDAQ)</option>
                  <option value="UTC (UTC+0)">UTC Standard</option>
                  <option value="Asia/Tokyo (UTC+9)">Asia/Tokyo (Session Asiatique)</option>
                  <option value="Asia/Dubai (UTC+4)">Asia/Dubai (Golfe & Forex)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 5: SÉCURITÉ, DÉCONNEXION & SUPPRESSION DU COMPTE (DANGER ZONE) */}
          {activeTab === 'danger' && (
            <div className="space-y-6">
              
              {/* Déconnexion de session */}
              <div className="p-4.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <LogOut className="h-3.5 w-3.5 text-zinc-400" />
                    Déconnexion de cette session
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Déconnecte votre profil et vous redirige vers la page d'accueil de connexion.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-all shrink-0 flex items-center justify-center gap-2"
                >
                  <LogOut className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{t('logout')}</span>
                </button>
              </div>

              {/* Zone de Danger : Suppression Définitive */}
              <div className="p-5 rounded-2xl border border-rose-500/40 bg-rose-950/20 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-rose-300 font-sans">
                      Zone Critique : {t('delete_account')}
                    </h4>
                    <p className="text-xs text-rose-200/80 leading-relaxed">
                      {t('delete_account_warning')} Cette action est irréversible et supprimera vos statistiques, connexions MT5 et historiques de sessions.
                    </p>
                  </div>
                </div>

                <div className="pt-2 space-y-2 border-t border-rose-500/20">
                  <label className="text-xs text-zinc-300 block">
                    Pour confirmer, tapez le mot <strong className="text-rose-400 font-mono">SUPPRIMER</strong> ci-dessous :
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      value={confirmDeleteText}
                      onChange={(e) => setConfirmDeleteText(e.target.value)}
                      placeholder="SUPPRIMER"
                      className="w-full sm:flex-1 rounded-xl border border-rose-500/40 bg-zinc-950 px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:border-rose-500 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleExecuteDeleteAccount}
                      disabled={confirmDeleteText.trim().toUpperCase() !== 'SUPPRIMER' || isDeleting}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? (
                        <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Supprimer Définitivement</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-zinc-900 pt-3 mt-3">
          <span className="text-[11px] text-zinc-500 font-mono">
            {currentUser?.email}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-all"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
