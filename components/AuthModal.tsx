
import React, { useState, useEffect } from 'react';
import { Icons, TRANSLATIONS } from '../constants';
import { Language, User } from '../types';
import { DEV_BYPASS, DEV_OTP_CODE, TEST_ACCOUNTS } from '../config';
import { buildNewUser } from '../lib/auth';
import * as api from '../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
  language: Language;
  users?: User[]; // Liste des utilisateurs existants pour vérification
}

type AuthStep = 'credentials' | 'verification';

/**
 * Composant Modal d'Authentification.
 * Gère l'inscription et la connexion avec une simulation de 2FA (Email OTP).
 *
 * @security Le bypass 2FA (code fixe + affichage UI + auto-login de test) n'est
 * actif QUE si `DEV_BYPASS` est true (variable `VITE_DEV_BYPASS` en dev).
 * En build de production, aucune escalade de rôle n'est possible : toute nouvelle
 * inscription reçoit le rôle `customer` ; le rôle `admin` ne peut être attribué
 * que par un administrateur existant (côté backend en v0.2).
 */
export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, language, users = [] }) => {
  const [step, setStep] = useState<AuthStep>('credentials');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Verification state
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [error, setError] = useState('');
  const [tempUser, setTempUser] = useState<User | null>(null);

  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';

  useEffect(() => {
    if (!isOpen) {
      setStep('credentials');
      setVerificationCode('');
      setError('');
      setIsLoading(null);
      setTempUser(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Génération du code OTP.
  // En mode dev (DEV_BYPASS) : code fixe pour faciliter les tests.
  // Sinon : code aléatoire (l'envoi réel par SMTP sera géré par le backend en v0.2).
  const generateCode = () => (DEV_BYPASS ? DEV_OTP_CODE : String(Math.floor(100000 + Math.random() * 900000)));

  // Auto-connexion d'un compte de test (DEV ONLY). Évite l'étape OTP.
  const handleQuickTestLogin = async (accountEmail: string) => {
    setIsLoading('test');
    setError('');
    try {
      // Tente l'auto-connexion via l'API backend (dev-login)
      const result = await api.devLogin(accountEmail);
      onLogin(result.user);
      onClose();
    } catch {
      // Fallback : recherche dans la liste locale (mockData)
      const existing = users.find(u => u.email.toLowerCase() === accountEmail.toLowerCase() && !u.isDeleted);
      if (existing) {
        onLogin(existing);
        onClose();
      } else {
        setError('Compte de test introuvable');
      }
    }
    setIsLoading(null);
  };

  const handleProcessLogin = async (provider: string, overrideEmail?: string) => {
    setIsLoading(provider);
    const targetEmail = overrideEmail || email;
    setError('');

    // 1. Tente l'API backend (request-otp)
    try {
      const result = await api.requestOtp(targetEmail, password || undefined);
      if (result.devCode) {
        setSentCode(result.devCode);
        if (DEV_BYPASS) {
          console.log(`[DEV MODE] Code de vérification pour ${targetEmail} : ${result.devCode}`);
        }
      } else {
        // En production, le code est envoyé par email — on utilise un placeholder
        setSentCode(DEV_OTP_CODE);
      }
      // L'utilisateur sera créé/récupéré côté backend lors du verify-otp
      setTempUser(buildNewUser(targetEmail, provider));
      setStep('verification');
      setIsLoading(null);
      return;
    } catch (e) {
      console.warn('[auth] API non disponible, fallback local:', e);
    }

    // Fallback local (mockData) si l'API n'est pas joignable
    const existingUser = users.find(u => u.email.toLowerCase() === targetEmail.toLowerCase() && !u.isDeleted);
    const code = generateCode();
    setSentCode(code);
    if (DEV_BYPASS) {
      console.log(`[DEV MODE] Code de vérification pour ${targetEmail} : ${code}`);
    }
    if (existingUser) {
      setTempUser(existingUser);
    } else {
      setTempUser(buildNewUser(targetEmail, provider));
    }
    setTimeout(() => {
      setStep('verification');
      setIsLoading(null);
    }, 1000);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading('verify');
    setError('');

    // 1. Tente la vérification via l'API backend
    try {
      const result = await api.verifyOtp(email, verificationCode, tempUser?.name);
      onLogin(result.user);
      onClose();
      setIsLoading(null);
      return;
    } catch (err: any) {
      // Si l'API a répondu avec une erreur métier (wrong code, etc.)
      if (err?.status === 400 && err?.body?.error === 'WRONG_CODE') {
        setError(t.wrongCode);
        setIsLoading(null);
        return;
      }
      console.warn('[auth] API verify non disponible, fallback local:', err);
    }

    // Fallback local : vérification stricte du code
    if (verificationCode === sentCode) {
      setTimeout(() => {
        if (tempUser) {
          onLogin(tempUser);
          onClose();
        }
        setIsLoading(null);
      }, 800);
    } else {
      setTimeout(() => {
        setError(t.wrongCode);
        setIsLoading(null);
      }, 500);
    }
  };

  const handleSubmitCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessLogin('email');
  };

  return (
    <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-[3rem] p-6 sm:p-10 shadow-4xl animate-in zoom-in-95 overflow-hidden modal-fullscreen-mobile">
        
        {step === 'credentials' ? (
          <>
            {/* Header: Logo & Titre */}
            <div className="text-center mb-8">
              <div className="inline-flex mb-4 p-2 bg-slate-50 rounded-2xl border border-slate-100">
                 <Icons.Logo />
              </div>
              <h2 className="text-3xl font-black text-slate-900 leading-tight">
                {isSignUp ? (language === 'ar' ? 'إنشاء حساب' : 'Rejoignez Jaybi') : (language === 'ar' ? 'مرحبًا بعودتك' : 'Bon retour !')}
              </h2>
              <p className="text-slate-400 text-[10px] mt-2 uppercase tracking-widest font-bold">
                {isSignUp ? 'Commencez à économiser dès aujourd\'hui' : 'Connectez-vous pour voir vos roadmaps'}
              </p>
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-3 mb-8">
                <button onClick={() => handleProcessLogin('Google')} className="w-full py-3.5 px-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all relative">
                    {isLoading === 'Google' ? <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin"/> : <Icons.Google />}
                    <span>{t.continueWithGoogle}</span>
                </button>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <button onClick={() => handleProcessLogin('Apple')} className="py-3.5 bg-black text-white rounded-2xl flex items-center justify-center hover:opacity-80 transition-all">
                        {isLoading === 'Apple' ? <div className="w-5 h-5 border-2 border-slate-500 border-t-white rounded-full animate-spin"/> : <Icons.Apple />}
                    </button>
                    <button onClick={() => handleProcessLogin('Microsoft')} className="py-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all">
                         {isLoading === 'Microsoft' ? <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"/> : <Icons.Microsoft />}
                    </button>
                    <button onClick={() => handleProcessLogin('Facebook')} className="py-3.5 bg-[#1877F2]/10 border border-[#1877F2]/20 rounded-2xl flex items-center justify-center hover:bg-[#1877F2]/20 transition-all">
                         {isLoading === 'Facebook' ? <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"/> : <Icons.Facebook />}
                    </button>
                </div>
            </div>

            <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                    <span className="px-4 bg-white text-slate-400">{t.orByEmail}</span>
                </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmitCredentials} className="space-y-3">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-5 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900/10 transition-all" />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.passwordPlaceholder} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-5 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900/10 transition-all" />

              <button type="submit" disabled={!!isLoading} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl shadow-xl hover:bg-emerald-600 active:scale-95 transition-all uppercase tracking-widest text-[10px] mt-2 disabled:opacity-50">
                {isLoading === 'email' ? t.identifying : (isSignUp ? t.createAccount : t.login)}
              </button>
            </form>

            <div className="mt-8 text-center space-y-4">
              <button onClick={() => setIsSignUp(!isSignUp)} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline">
                {isSignUp ? t.alreadyMember : t.signUpPrompt}
              </button>
            </div>

            {/* --- AUTO-LOGIN DE TEST (DEV ONLY) --- */}
            {DEV_BYPASS && (
              <div className="mt-8 border-t border-dashed border-amber-200 pt-6">
                <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-3 text-center">Connexion rapide (test)</p>
                <div className="grid grid-cols-2 gap-2">
                  {TEST_ACCOUNTS.map(acc => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleQuickTestLogin(acc.email)}
                      className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-[10px] font-bold text-amber-800 hover:bg-amber-100 transition-all text-left"
                    >
                      <span className="block capitalize">{acc.role}</span>
                      <span className="block text-[8px] text-amber-500 truncate">{acc.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="animate-in slide-in-from-right-4">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                 <Icons.Bell className="scale-150 animate-bounce" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 leading-tight">
                {t.verifyEmailTitle}
              </h2>
              <p className="text-slate-400 text-[10px] mt-2 uppercase tracking-widest font-bold">
                {t.codeSentTo} <br/><span className="text-slate-900 lowercase">{email}</span>
              </p>
              
              {/* --- UI HELPER: Affichage du code pour les tests (DEV ONLY) --- */}
              {DEV_BYPASS && (
                <div className="mt-6 inline-flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse">
                   <Icons.Lightning className="w-3 h-3" />
                   Mode Test : {sentCode}
                </div>
              )}
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="relative">
                <input 
                  autoFocus
                  type="text" 
                  maxLength={6}
                  required 
                  value={verificationCode} 
                  onChange={(e) => setVerificationCode(e.target.value)} 
                  placeholder={t.codePlaceholder}
                  className="w-full bg-slate-50 border-2 border-slate-900 rounded-2xl py-6 px-5 text-2xl sm:text-3xl font-black text-center tracking-[0.3em] sm:tracking-[0.5em] outline-none focus:ring-4 focus:ring-slate-900/5 transition-all" 
                />
                {error && <p className="text-center text-rose-500 text-[10px] font-black uppercase mt-2">{error}</p>}
              </div>
              
              <button type="submit" disabled={isLoading === 'verify'} className="w-full py-5 bg-slate-900 text-white font-black rounded-xl shadow-xl hover:bg-emerald-600 active:scale-95 transition-all uppercase tracking-[0.2em] text-[10px] disabled:opacity-50">
                {isLoading === 'verify' ? t.verifying : t.confirmIdentity}
              </button>

              <div className="text-center">
                <button 
                  type="button"
                  onClick={() => { setStep('credentials'); setError(''); }} 
                  className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                >
                  {t.modifyEmailOrCancel}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
