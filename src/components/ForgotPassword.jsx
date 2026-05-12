import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword({ isOpen, onClose, onForceOpen }) {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('request');
  const navigate = useNavigate();

  useEffect(() => {
    const fullUrl = window.location.href;
    if (fullUrl.includes('access_token') || fullUrl.includes('recovery') || window.location.hash.includes('type=recovery')) {
      setStep('update');
      if (onForceOpen) onForceOpen();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setStep('update');
        if (onForceOpen) onForceOpen();
      }
    });

    return () => subscription.unsubscribe();
  }, [onForceOpen]);

  if (!isOpen) return null;

  const handleRecover = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://faustino-events-gqgy.vercel.app/', 
      });
      if (error) throw error;
      alert("Reset link sent!");
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
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      alert("Password updated successfully!");
      await supabase.auth.signOut();

      window.history.replaceState(null, null, window.location.pathname);
      setStep('request');
      setNewPassword('');
      setConfirmPassword('');
      
      onClose();
      navigate('/', { replace: true });
      window.location.reload();
      
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 text-black">
        <div className="text-center space-y-2 mb-8">
          <h3 className="text-2xl font-black uppercase tracking-tighter">
            {step === 'request' ? 'Recover Account' : 'New Password'}
          </h3>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
            {step === 'request' ? 'Enter email to reset password' : 'Enter your new secure password below'}
          </p>
        </div>
        
        <form className="space-y-6" onSubmit={step === 'request' ? handleRecover : handleUpdatePassword}>
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest block ml-1">
              {step === 'request' ? 'Email Address' : 'New Password'}
            </label>
            <input 
              type={step === 'request' ? "email" : "password"}
              required
              value={step === 'request' ? email : newPassword}
              onChange={(e) => step === 'request' ? setEmail(e.target.value) : setNewPassword(e.target.value)}
              className="w-full bg-[#f9f9f9] border border-gray-200 p-4 rounded-2xl text-[12px] outline-none focus:border-yellow-500/50 transition-all" 
              placeholder={step === 'request' ? "user@example.com" : "••••••••"}
            />
          </div>

          {step === 'update' && (
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest block ml-1">
                Confirm Password
              </label>
              <input 
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#f9f9f9] border border-gray-200 p-4 rounded-2xl text-[12px] outline-none focus:border-yellow-500/50 transition-all" 
                placeholder="••••••••"
              />
            </div>
          )}
          
          <div className="pt-2 flex flex-col gap-4">
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-[#d4af37] text-white py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.1em] hover:bg-[#c4a030] transition-all disabled:opacity-50"
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