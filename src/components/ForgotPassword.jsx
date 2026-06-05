import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useVoice } from './hooks/useVoice';

export default function ForgotPassword({ isOpen, onClose, onForceOpen }) {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('request');
  const navigate = useNavigate();

  useEffect(() => {
    const handleUrlTokens = () => {
      const hash = window.location.hash;
      const fullUrl = window.location.href;
      
      if (hash.includes('access_token=') || hash.includes('type=recovery') || fullUrl.includes('type=recovery')) {
        setStep('update');
        if (onForceOpen) onForceOpen();
      }
    };

    handleUrlTokens();
    window.addEventListener('hashchange', handleUrlTokens);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setStep('update');
        if (onForceOpen) onForceOpen();
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('hashchange', handleUrlTokens);
    };
  }, [onForceOpen]);

  if (!isOpen) return null;

  const handleRecover = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://faustino-events-gqgy.vercel.app/#type=recovery",
      });
      if (error) throw error;
      alert("Reset link sent to your email!");
      onClose();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    
    setLoading(true);
    try {
      const hash = window.location.hash || window.location.search;
      const accessTokenMatch = hash.match(/access_token=([^&]*)/);
      const refreshTokenMatch = hash.match(/refresh_token=([^&]*)/);
      
      const accessToken = accessTokenMatch ? accessTokenMatch[1] : null;
      const refreshToken = refreshTokenMatch ? refreshTokenMatch[1] : '';

      if (!accessToken) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
          throw new Error("Token not found. Please use the link from your email again.");
        }
      } else {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      alert("Success! Password has been changed.");
      
      await supabase.auth.signOut();
      window.history.replaceState(null, null, window.location.pathname);
      setStep('request');
      setNewPassword('');
      setConfirmPassword('');
      
      onClose();
      navigate('/', { replace: true });
      
      setTimeout(() => {
        window.location.reload();
      }, 500);

    } catch (error) {
      alert(`Update Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto relative z-50">
      <div className="bg-[#1a1a2e]/90 backdrop-blur-xl p-8 md:p-10 rounded-2xl shadow-2xl border border-yellow-500/30">
        <div className="text-center space-y-2 mb-8">
          <h3 className="text-2xl font-black uppercase tracking-tighter bg-gradient-to-r from-yellow-500 to-yellow-400 bg-clip-text text-transparent">
            {step === 'request' ? 'Recover Account' : 'New Password'}
          </h3>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
            {step === 'request' ? 'Enter email' : 'Enter your new secure password'}
          </p>
        </div>

        <form className="space-y-6" onSubmit={step === 'request' ? handleRecover : handleUpdatePassword}>
          {step === 'request' ? (
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest block ml-1 text-gray-400">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-sm text-white placeholder:text-gray-500 outline-none focus:border-yellow-500 transition-all"
                placeholder="user@example.com"
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest block ml-1 text-gray-400">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-sm text-white placeholder:text-gray-500 outline-none focus:border-yellow-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest block ml-1 text-gray-400">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-sm text-white placeholder:text-gray-500 outline-none focus:border-yellow-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </>
          )}

          <div className="pt-2 flex flex-col gap-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 text-black py-4 rounded-2xl text-xs font-black uppercase tracking-[0.1em] hover:bg-yellow-400 transition-all disabled:opacity-50 shadow-lg shadow-yellow-500/20"
            >
              {loading ? "Processing..." : (step === 'request' ? "Send Link" : "Update Password")}
            </button>
            <button
              onClick={() => {
                if (step === 'update') window.history.replaceState(null, null, window.location.pathname);
                onClose();
              }}
              type="button"
              className="text-[10px] font-black uppercase text-gray-500 hover:text-yellow-500 transition-all text-center tracking-[0.2em]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}