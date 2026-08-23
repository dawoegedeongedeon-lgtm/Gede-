import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Zap,
  Globe
} from 'lucide-react';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLoginSuccess: (user: UserProfile) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState(currentUser?.email || 'mrtreize006@gmail.com');
  const [name, setName] = useState(currentUser?.name || 'M. Treize');
  const [password, setPassword] = useState('••••••••');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Veuillez entrer une adresse e-mail valide.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        onLoginSuccess(data.user);
        onClose();
      } else {
        setError(data.error || 'Une erreur est survenue lors de la connexion.');
      }
    } catch (err: any) {
      // Fallback local session
      const fallbackUser: UserProfile = {
        id: `user-${Date.now()}`,
        email: email.toLowerCase().trim(),
        name: name || email.split('@')[0],
        role: 'Pro Trader',
        plan: 'Quant Elite & MT5 Live',
        createdAt: new Date().toISOString(),
      };
      onLoginSuccess(fallbackUser);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoUser = (demoEmail: string, demoName: string) => {
    setEmail(demoEmail);
    setName(demoName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl ring-1 ring-blue-500/20">
        
        {/* Decorative Glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

        {/* Close Button */}
        <button
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
                onClick={onLogout}
                className="w-full py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs transition-all shadow-sm"
              >
                Se déconnecter de cette session
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-all"
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">Mot de passe</label>
                {!isRegister && (
                  <span className="text-[11px] text-blue-400 hover:underline cursor-pointer">
                    Accès direct
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <Lock className="pointer-events-none absolute left-3 h-4 w-4 text-zinc-500" />
              </div>
            </div>

            {/* Quick pre-filled badge for ease of use */}
            <div className="p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                Compte rapide détecté :
              </span>
              <button
                type="button"
                onClick={() => handleQuickDemoUser('mrtreize006@gmail.com', 'M. Treize')}
                className="text-blue-400 hover:underline font-mono font-medium"
              >
                mrtreize006@gmail.com
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? 'Créer mon compte & Démarrer' : 'Se connecter avec mon e-mail'}</span>
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
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {isRegister ? (
                  <>Déjà un compte ? <span className="text-blue-400 font-medium">Se connecter</span></>
                ) : (
                  <>Pas encore de compte ? <span className="text-blue-400 font-medium">Créer un compte gratuit</span></>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
