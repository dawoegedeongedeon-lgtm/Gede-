import React, { useState } from 'react';
import { Eye, EyeOff, Check, Shield, KeyRound, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onLoginSuccess?: (user: UserProfile) => void;
  defaultEmail?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  defaultEmail = '',
}) => {
  const { login, register, googleLogin, resetPassword } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('tre13ze_saved_email') || defaultEmail;
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [showModalInfo, setShowModalInfo] = useState<'terms' | 'privacy' | 'support' | null>(null);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // Google SSO custom input
  const [googleCustomEmail, setGoogleCustomEmail] = useState('');
  const [googleCustomName, setGoogleCustomName] = useState('');

  const validateEmail = (mail: string) => {
    return String(mail)
      .toLowerCase()
      .match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-zA-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    return score;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setError('Veuillez renseigner une adresse e-mail valide.');
      return;
    }

    if (isRegisterMode) {
      if (!name || name.trim().length < 2) {
        setError('Veuillez renseigner votre nom complet ou pseudo (au moins 2 caractères).');
        return;
      }
      if (!password || password.length < 8) {
        setError('Le mot de passe doit contenir au moins 8 caractères.');
        return;
      }
      if (!/[0-9]/.test(password) || !/[a-zA-Z]/.test(password)) {
        setError('Le mot de passe doit contenir à la fois des lettres et des chiffres.');
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
      if (isRegisterMode) {
        loggedUser = await register(cleanEmail, name.trim(), password, confirmPassword);
      } else {
        loggedUser = await login(cleanEmail, password, stayLoggedIn);
      }

      if (stayLoggedIn) {
        localStorage.setItem('tre13ze_saved_email', cleanEmail);
      } else {
        localStorage.removeItem('tre13ze_saved_email');
      }

      if (onLoginSuccess) {
        onLoginSuccess(loggedUser);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l\'authentification.');
    } finally {
      setLoading(false);
    }
  };

  // Google Login flow
  const handleGoogleSubmit = async (chosenEmail: string, chosenName?: string) => {
    const targetEmail = chosenEmail.trim();
    if (!targetEmail || !validateEmail(targetEmail)) {
      setError('Veuillez renseigner une adresse Gmail valide.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loggedUser = await googleLogin(targetEmail, chosenName?.trim());
      if (stayLoggedIn) {
        localStorage.setItem('tre13ze_saved_email', targetEmail);
      }
      setShowGoogleModal(false);
      if (onLoginSuccess) {
        onLoginSuccess(loggedUser);
      }
    } catch (err: any) {
      setError(err.message || 'Connexion Google échouée.');
    } finally {
      setLoading(false);
    }
  };

  // Handle password reset
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (!forgotEmail || !validateEmail(forgotEmail.trim())) {
      setForgotError('Veuillez renseigner une adresse e-mail valide.');
      return;
    }

    if (!forgotNewPassword || forgotNewPassword.length < 8) {
      setForgotError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setForgotLoading(true);

    try {
      const res = await resetPassword(forgotEmail.trim(), forgotNewPassword, forgotConfirmPassword);
      setForgotSuccess(res.message || 'Mot de passe mis à jour ! Vous pouvez vous connecter.');
      setEmail(forgotEmail.trim());
      setPassword(forgotNewPassword);
      setTimeout(() => {
        setShowForgotPasswordModal(false);
        setForgotSuccess(null);
      }, 2000);
    } catch (err: any) {
      setForgotError(err.message || 'Erreur lors de la réinitialisation.');
    } finally {
      setForgotLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div id="login-page-container" className="relative min-h-screen w-full flex flex-col items-center justify-between bg-[#070b13] text-white selection:bg-blue-500 selection:text-white px-4 py-8 sm:py-12 overflow-x-hidden font-sans">
      
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-blue-600/10 via-sky-600/5 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-80 h-80 bg-blue-900/10 rounded-full blur-3xl" />

      {/* Top spacing */}
      <div className="w-full max-w-md pt-2 sm:pt-6" />

      {/* Main Card */}
      <div id="login-card" className="relative z-10 w-full max-w-[420px] mx-auto flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
        
        {/* Title & Subtitle */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2b86ff] font-sans">
            {isRegisterMode ? 'Créer un compte' : 'Content de te revoir'}
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 font-sans">
            {isRegisterMode 
              ? 'Rejoignez Tre13ze Journal avec votre adresse e-mail.' 
              : 'Connectez-vous pour continuer.'}
          </p>
        </div>

        {/* Continue with Google Button */}
        <button
          id="btn-google-login"
          type="button"
          onClick={() => {
            setGoogleCustomEmail(email || '');
            setShowGoogleModal(true);
          }}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-xl border border-zinc-800/90 bg-[#0c121e] hover:bg-[#121929] hover:border-zinc-700 py-3.5 px-4 text-sm sm:text-base font-medium text-white transition-all shadow-md active:scale-[0.99] disabled:opacity-50 min-h-[48px]"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="text-zinc-100 font-sans">Continuer Avec Google</span>
        </button>

        {/* Divider */}
        <div className="relative w-full my-6 flex items-center justify-center">
          <div className="w-full border-t border-zinc-800/80" />
          <span className="absolute bg-[#070b13] px-3 text-xs text-zinc-400 font-sans whitespace-nowrap">
            {isRegisterMode ? 'ou inscrivez-vous avec votre e-mail' : 'ou connectez-vous avec votre adresse e-mail'}
          </span>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          
          {/* If registering, show Name field */}
          {isRegisterMode && (
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium ml-1">Nom complet ou Pseudo</label>
              <div className="relative flex items-center rounded-xl border border-zinc-800/90 bg-[#0c121e] focus-within:border-blue-500 transition-all">
                <input
                  id="auth-input-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Trader"
                  className="w-full bg-transparent px-4 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none font-sans"
                  required
                />
              </div>
            </div>
          )}

          {/* Email Address Input */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400 font-medium ml-1">Adresse e-mail</label>
            <div className="relative flex items-center rounded-xl border border-zinc-800/90 bg-[#0c121e] focus-within:border-blue-500 transition-all">
              <input
                id="auth-input-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre-email@exemple.com"
                className="w-full bg-transparent px-4 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none font-sans"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Input with Visibility Toggle */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400 font-medium ml-1">
              {isRegisterMode ? 'Mot de passe (min. 8 car. + chiffres)' : 'Mot de passe'}
            </label>
            <div className="relative flex items-center rounded-xl border border-zinc-800/90 bg-[#0c121e] focus-within:border-blue-500 transition-all">
              <input
                id="auth-input-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-transparent pl-4 pr-12 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none font-sans"
                required
                autoComplete={isRegisterMode ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 p-1.5 text-zinc-400 hover:text-white transition-colors"
                title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? (
                  <Eye className="h-5 w-5 text-blue-400" />
                ) : (
                  <EyeOff className="h-5 w-5 text-zinc-400" />
                )}
              </button>
            </div>

            {/* Password strength indicator in register mode */}
            {isRegisterMode && password.length > 0 && (
              <div className="pt-1.5 px-1 space-y-1">
                <div className="flex gap-1 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      passwordStrength <= 1
                        ? 'w-1/4 bg-rose-500'
                        : passwordStrength === 2
                        ? 'w-2/4 bg-amber-500'
                        : passwordStrength === 3
                        ? 'w-3/4 bg-blue-500'
                        : 'w-full bg-emerald-500'
                    }`}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>Force du mot de passe :</span>
                  <span className={`font-medium ${
                    passwordStrength <= 1 ? 'text-rose-400' :
                    passwordStrength === 2 ? 'text-amber-400' :
                    passwordStrength === 3 ? 'text-blue-400' : 'text-emerald-400'
                  }`}>
                    {passwordStrength <= 1 ? 'Faible (min. 8 car. requis)' :
                     passwordStrength === 2 ? 'Moyen' :
                     passwordStrength === 3 ? 'Bon' : 'Robuste'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password in Register Mode */}
          {isRegisterMode && (
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium ml-1">Confirmer le mot de passe</label>
              <div className="relative flex items-center rounded-xl border border-zinc-800/90 bg-[#0c121e] focus-within:border-blue-500 transition-all">
                <input
                  id="auth-input-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmez votre mot de passe"
                  className="w-full bg-transparent pl-4 pr-12 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none font-sans"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 p-1.5 text-zinc-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? (
                    <Eye className="h-5 w-5 text-blue-400" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-zinc-400" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div id="auth-error-banner" className="flex items-center gap-2 text-xs text-rose-300 bg-rose-950/40 border border-rose-500/40 p-3 rounded-xl font-medium animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Success display */}
          {successMessage && (
            <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-xl font-medium animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Stay Logged In & Forgot Password Row */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none py-1">
              <div 
                onClick={() => setStayLoggedIn(!stayLoggedIn)}
                className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                  stayLoggedIn 
                    ? 'border-blue-500 bg-blue-600 text-white' 
                    : 'border-zinc-700 bg-zinc-900 text-transparent'
                }`}
              >
                <Check className="h-3 w-3 stroke-[3]" />
              </div>
              <span 
                onClick={() => setStayLoggedIn(!stayLoggedIn)}
                className="text-xs sm:text-sm text-zinc-300 font-sans"
              >
                Rester connecté
              </span>
            </label>

            {!isRegisterMode && (
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotError(null);
                  setForgotSuccess(null);
                  setShowForgotPasswordModal(true);
                }}
                className="text-xs sm:text-sm text-[#2b86ff] hover:underline font-sans font-medium py-1"
              >
                Mot de passe oublié ?
              </button>
            )}
          </div>

          {/* Primary Action Button: "Se connecter" / "Créer mon compte" */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#1d82f6] hover:bg-[#1871d6] active:bg-[#1563be] text-white font-semibold py-3.5 text-sm sm:text-base transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 active:scale-[0.99] disabled:opacity-50 mt-4 flex items-center justify-center gap-2 font-sans min-h-[48px]"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>{isRegisterMode ? 'Créer mon compte' : 'Se connecter'}</span>
            )}
          </button>
        </form>

        {/* Toggle between Register and Login */}
        <div className="mt-6 text-center">
          <button
            id="toggle-auth-mode-btn"
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setError(null);
              setSuccessMessage(null);
            }}
            className="text-sm font-medium text-[#2b86ff] hover:underline transition-colors font-sans py-2"
          >
            {isRegisterMode ? 'Déjà un compte ? Se connecter' : 'Créer un compte'}
          </button>
        </div>
      </div>

      {/* Footer Legal & Support Links */}
      <footer className="relative z-10 w-full max-w-md mt-10 pb-2 text-center">
        <div className="flex items-center justify-center gap-6 text-xs text-zinc-500 font-sans">
          <button 
            onClick={() => setShowModalInfo('terms')}
            className="hover:text-zinc-300 transition-colors py-1"
          >
            Termes
          </button>
          <button 
            onClick={() => setShowModalInfo('privacy')}
            className="hover:text-zinc-300 transition-colors py-1"
          >
            Confidentialité
          </button>
          <button 
            onClick={() => setShowModalInfo('support')}
            className="hover:text-zinc-300 transition-colors py-1"
          >
            Soutien
          </button>
        </div>
      </footer>

      {/* Google Account Picker Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0c121e] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <h3 className="text-base font-bold text-white font-sans">Continuer avec Google</h3>
              </div>
              <button
                onClick={() => setShowGoogleModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Renseignez votre adresse de messagerie Google pour vous connecter de façon sécurisée à votre compte Tre13ze Journal.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-zinc-300 block mb-1">Votre E-mail Google</label>
                <input
                  type="email"
                  value={googleCustomEmail}
                  onChange={(e) => setGoogleCustomEmail(e.target.value)}
                  placeholder="nom@gmail.com"
                  className="w-full rounded-xl border border-zinc-800 bg-[#070b13] px-3.5 py-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-300 block mb-1">Nom affiché (facultatif)</label>
                <input
                  type="text"
                  value={googleCustomName}
                  onChange={(e) => setGoogleCustomName(e.target.value)}
                  placeholder="Votre Nom ou Pseudo de Trading"
                  className="w-full rounded-xl border border-zinc-800 bg-[#070b13] px-3.5 py-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!googleCustomEmail.includes('@') || loading}
                onClick={() => handleGoogleSubmit(googleCustomEmail, googleCustomName)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2"
              >
                {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>Se connecter</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0c121e] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold text-white font-sans">Réinitialiser le mot de passe</h3>
              </div>
              <button
                onClick={() => setShowForgotPasswordModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Entrez votre adresse e-mail ainsi que votre nouveau mot de passe (min. 8 caractères) pour mettre à jour vos accès en toute sécurité.
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-zinc-300 block mb-1">Adresse E-mail</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="votre-email@exemple.com"
                  className="w-full rounded-xl border border-zinc-800 bg-[#070b13] px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-300 block mb-1">Nouveau Mot de Passe (min. 8 caractères)</label>
                <input
                  type="password"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-zinc-800 bg-[#070b13] px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-300 block mb-1">Confirmer le Nouveau Mot de Passe</label>
                <input
                  type="password"
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-zinc-800 bg-[#070b13] px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              {forgotError && (
                <p className="text-xs text-rose-400 bg-rose-950/30 p-2.5 rounded-lg border border-rose-500/20">
                  {forgotError}
                </p>
              )}

              {forgotSuccess && (
                <p className="text-xs text-emerald-400 bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-500/20">
                  {forgotSuccess}
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2"
                >
                  {forgotLoading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>Valider</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Info / Terms / Privacy Dialog */}
      {showModalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              {showModalInfo === 'terms' && 'Conditions Générales d\'Utilisation'}
              {showModalInfo === 'privacy' && 'Politique de Confidentialité'}
              {showModalInfo === 'support' && 'Support & Assistance Tre13ze'}
            </h3>

            <div className="text-xs text-zinc-300 leading-relaxed max-h-60 overflow-y-auto space-y-2 pr-1">
              {showModalInfo === 'terms' && (
                <p>
                  Tre13ze Journal est une plateforme SaaS de journalisation pour traders indépendants et étudiants, fournissant des outils de suivi de performance, calcul de risque et analyses IA. Vos données de trading vous appartiennent entièrement.
                </p>
              )}
              {showModalInfo === 'privacy' && (
                <p>
                  Vos mots de passe sont chiffrés avec les standards cryptographiques les plus stricts (bcrypt 12 rounds) et stockés de façon sécurisée.
                </p>
              )}
              {showModalInfo === 'support' && (
                <p>
                  Besoin d'aide avec votre compte ou vos journaux de trading ? Contactez l'assistance technique Tre13ze.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowModalInfo(null)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
