import React, { useState, useEffect } from 'react';
import { supabase } from '../supabasecLient';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword({ isOpen, onClose, onForceOpen }) {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('request'); 
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Check kung ang URL ay may recovery data galing sa Supabase
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token=")) {
      setStep('update'); // I-force ang step sa update para lumabas agad ang New Password field
      
      // 2. IMPORTANTE: Piliting bumukas ang modal kahit naka-false ang isOpen sa parent
      if (onForceOpen) onForceOpen();
    }
  }, [onForceOpen]);

  // Protection: Siguraduhin na kung galing sa recovery link, 'update' talaga ang step
  useEffect(() => {
    if (isOpen && window.location.hash.includes("type=recovery")) {
      setStep('update');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // STEP 1: Pag-send ng Reset Link
  const handleRecover = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // 3. Siguraduhin na ang hash ay kasama sa redirect para ma-detect ng useEffect sa taas
        redirectTo: `${window.location.origin}/#type=recovery`, 
      });

      if (error) throw error;
      alert("Success! Check your email for the reset link.");
      onClose(); 
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
      setEmail(''); 
    }
  };

  // STEP 2: Pag-update ng Password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      alert("Password updated successfully!");
      
      // 4. Linisin ang URL hash para hindi na bumalik sa update step kapag nag-refresh
      window.history.replaceState(null, null, window.location.pathname);
      
      setStep('request');
      onClose();
      navigate('/'); 
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full animate-in fade-in zoom-in duration-300">
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl">
        <div className="text-center space-y-2 mb-8">
          <h3 className="text-2xl font-black uppercase tracking-tighter text-black">
            {step === 'request' ? 'Recover Account' : 'New Password'}
          </h3>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
            {step === 'request' ? 'Enter email to reset password' : 'Set your new secure password'}
          </p>
        </div>

        <form className="space-y-6" onSubmit={step === 'request' ? handleRecover : handleUpdatePassword}>
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-black block ml-1">
              {step === 'request' ? 'Email Address' : 'Enter New Password'}
            </label>
            
            <input 
              type={step === 'request' ? "email" : "password"}
              placeholder={step === 'request' ? "user@example.com" : "••••••••"}
              required
              value={step === 'request' ? email : newPassword}
              onChange={(e) => step === 'request' ? setEmail(e.target.value) : setNewPassword(e.target.value)}
              className="w-full bg-[#f9f9f9] border border-gray-200 p-4 rounded-2xl text-[12px] text-black outline-none focus:border-yellow-500/50 transition-all placeholder:text-gray-300" 
            />
          </div>

          <div className="pt-2 flex flex-col gap-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#d4af37] text-white py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.1em] hover:bg-[#c4a030] transition-all active:scale-[0.98] shadow-lg shadow-yellow-500/20 disabled:opacity-50"
            >
              {loading ? "Processing..." : (step === 'request' ? "Send Request" : "Update Password")}
            </button>
            
            <button 
              onClick={onClose} 
              type="button"
              className="text-[10px] font-black uppercase text-gray-400 hover:text-black transition-all text-center tracking-[0.2em] mt-2"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}