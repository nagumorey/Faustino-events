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
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 text-black">
        <div className="text-center space-y-2 mb-8">
          <h3 className="text-2xl font-black uppercase tracking-tighter">
            {step === 'request' ? 'Recover Account' : 'New Password'}
          </h3>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
            {step === 'request' ? 'Enter email' : 'Enter your new secure password'}
          </p>
        </div>

        <form className="space-y-6" onSubmit={step === 'request' ? handleRecover : handleUpdatePassword}>
          {step === 'request' ? (
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest block ml-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#f9f9f9] border border-gray-200 p-4 rounded-2xl text-[12px] outline-none focus:border-[#d4af37]/50 transition-all"
                placeholder="user@example.com"
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest block ml-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#f9f9f9] border border-gray-200 p-4 rounded-2xl text-[12px] outline-none focus:border-[#d4af37]/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest block ml-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#f9f9f9] border border-gray-200 p-4 rounded-2xl text-[12px] outline-none focus:border-[#d4af37]/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </>
          )}

          <div className="pt-2 flex flex-col gap-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#d4af37] text-white py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.1em] hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? "Processing..." : (step === 'request' ? "Send Link" : "Update Password")}
            </button>
            <button
              onClick={() => {
                if (step === 'update') window.history.replaceState(null, null, window.location.pathname);
                onClose();
              }}
              type="button"
              className="text-[10px] font-black uppercase text-gray-400 hover:text-black transition-all text-center tracking-[0.2em]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}