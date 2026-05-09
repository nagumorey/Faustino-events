import { supabase } from '../supabaseClient.js';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginForm = ({ onForgotClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // --- PINALAKAS NA AUTO-DETECT ---
  useEffect(() => {
    const handleCheckToken = () => {
      const fullUrl = window.location.href;
      
      // Chine-check kung may 'access_token' o 'type=recovery' kahit saan sa URL
      if (fullUrl.includes("access_token=") || fullUrl.includes("type=recovery")) {
        console.log("Recovery token detected!");
        if (onForgotClick) onForgotClick();
      }
    };

    // I-run agad pag-load
    handleCheckToken();

    // Makinig din sa hash changes para sigurado
    window.addEventListener('hashchange', handleCheckToken);
    return () => window.removeEventListener('hashchange', handleCheckToken);
  }, [onForgotClick]);
  // ---------------------------------

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!supabase) throw new Error("Supabase is not connected!");

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), 
        password: password,
      });

      if (authError) throw authError;

      const { data: adminData, error: roleError } = await supabase
        .from('Admins') 
        .select('admin_id')
        .eq('admin_id', authData.user.id)
        .maybeSingle();

      if (roleError) throw new Error("Could not verify user status.");

      if (adminData) {
        alert("Welcome back, Admin!");
        window.location.href = '/AdminDashboard'; 
      } else {
        alert("Login Successful!");
        window.location.href = '/ClientDashboard'; 
      }

    } catch (error) {
      alert("Login Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-[#FAF9F6] border border-[#E5E1DA] p-3 rounded-lg outline-none focus:border-[#D4AF37] text-slate-800 text-sm transition-all placeholder:text-slate-300";
  const labelClass = "text-[10px] font-black text-black uppercase tracking-widest mb-1.5 block";

  return (
    <div className="bg-white p-6 rounded-2xl w-full max-w-sm mx-auto shadow-2xl">
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className={labelClass}>Email Address</label>
          <input 
            type="email" 
            required
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        
        <div className="relative">
          <div className="flex justify-between items-end mb-1.5">
            <label className="text-[10px] font-black text-black uppercase tracking-widest block leading-none">
              Password
            </label>
            <button 
              type="button"
              onClick={onForgotClick}
              className="text-[9px] font-bold text-[#D4AF37] hover:text-black uppercase tracking-tighter transition-all border border-[#D4AF37]/30 px-1.5 py-0.5 rounded hover:border-black cursor-pointer"
            >
              Forgot?
            </button>
          </div>
          <input 
            type="password" 
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-[#D4AF37] hover:bg-black text-white py-4 rounded-xl font-black text-[12px] mt-4 transition-all active:scale-[0.96] disabled:opacity-50 shadow-lg shadow-yellow-900/10 uppercase tracking-[0.2em]"
        >
          {loading ? "LOGGING IN..." : "LOG IN"}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;