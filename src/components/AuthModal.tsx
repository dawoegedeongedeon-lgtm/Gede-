import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  onLoginSuccess?: (user: UserProfile) => void;
  onLogout?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onLogout: onLogoutProp,
}) => {
  const { user: currentUser, login, register, logout } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Veuillez entrer une adresse e-mail valide.');
      return;
    }

    if (isRegister) {
      if (!name || name.trim().length < 2) {
        setError('Veuillez renseigner votre nom (au moins 2 caractères).');
        return;
      }
      if (!password || password.length < 8) {
        setError('Le mot de passe doit contenir au moins 8 caractères.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Les deux mots de passe ne correspondent pas.');
        return;
      }
    } else {
      if (!password) {
        setError('Veuillez saisir votre mot de passe.');
        return;
      }
    }

    setLoading(true);

    try {
      let loggedUser: UserProfile;
      if (isRegister) {
        loggedUser = await register(cleanEmail, name.trim(), password, confirmPassword);
      } else {
        loggedUser = await login(cleanEmail, password, true);
      }

      if (onLoginSuccess) {
        onLoginSuccess(loggedUser);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutClick = async () => {
    await logout();
    if (onLogoutProp) {
      onLogoutProp();
    }
    onClose();
  };

  return (
    <div id="auth-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div id="auth-modal-card" className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl ring-1 ring-blue-500/20">
        
        {/* Decorative Glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

        {/* Close Button */}
        <button
          id="btn-close-auth-modal"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-2 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 shadow-xl shadow-blue-500/30 ring-1 ring-blue-400/40">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-sans">
              {currentUser ? 'Mon Profil & Compte' : (isRegister ? 'Créer un compte Trader' : 'Connexion à Tre13ze Journal')}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Accédez à vos journaux, synchronisations MT5 et analyses d'IA.
            </p>
          </div>
        </div>

        {currentUser ? (
          /* User Profile View when Logged In */
          <div className="space-y-5">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4.5 space-y-3">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 font-bold text-lg ring-1 ring-blue-500/30">
                  {currentUser.name ? currentUser.name.substring(0, 2).toUpperCase() : 'TR'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate font-sans">
                    {currentUser.name || 'Trader Tre13ze'}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3 w-3 text-zinc-500" />
                    {currentUser.email}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Statut de licence :</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  <CheckCircle2 className="h-3 w-3" />
                  {currentUser.plan || 'Quant Pro & MT5 Sync'}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                id="btn-logout-modal"
                onClick={handleLogoutClick}
                className="w-full py-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs transition-all shadow-sm min-h-[44px]"
              >
                Se déconnecter de cette session
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-all min-h-[44px]"
              >
                Retourner à mon Journal
              </button>
            </div>
          </div>
        ) : (
          /* Login / Register Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Nom / Pseudo Trader</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Marc L."
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required={isRegister}
                  />
                  <User className="pointer-events-none absolute left-3 h-4 w-4 text-zinc-500" />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Adresse E-mail</label>
              <div className="relative flex items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@domaine.com"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
                <Mail className="pointer-events-none absolute left-3 h-4 w-4 text-zinc-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                {isRegister ? 'Mot de passe (min. 8 car.)' : 'Mot de passe'}
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 pl-9 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
                <Lock className="pointer-events-none absolute left-3 h-4 w-4 text-zinc-500" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-zinc-400 hover:text-white"
                >
                  {showPassword ? <Eye className="h-4 w-4 text-blue-400" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Confirmer le mot de passe</label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                  <Lock className="pointer-events-none absolute left-3 h-4 w-4 text-zinc-500" />
                </div>
              </div>
            )}

            <button
              id="btn-auth-modal-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 py-3 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50 min-h-[44px]"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? 'Créer mon compte & Démarrer' : 'Se connecter'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>

            {/* Toggle Signin / Register */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError(null);
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-1"
              >
                {isRegister ? (
                  <>Déjà un compte ? <span className="text-blue-400 font-medium">Se connecter</span></>
                ) : (
                  <>Pas encore de compte ? <span className="text-blue-400 font-medium">Créer un compte</span></>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
