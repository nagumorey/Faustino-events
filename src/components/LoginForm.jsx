import { supabase } from '../supabaseClient.js';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginForm = ({ onForgotClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      // DAGDAG NATIN ITO TOL: Manual navigation para hindi na maghintay sa App.jsx
      if (data?.session) {
        navigate('/ClientDashboard', { replace: true });
      }
      
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    /* GINAYA KO YUNG STYLE NUNG PUTI SA GITNA */
    <div className="bg-white p-10 rounded-[3rem] w-full max-w-[380px] mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
      <form onSubmit={handleLogin} className="space-y-6">
        
        {/* Email Field */}
        <div className="text-left space-y-2">
          <label className="text-[10px] font-black text-black uppercase tracking-tighter px-1">Email Address</label>
          <input 
            type="email" 
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#f3f4f6] border-none p-5 rounded-2xl text-black text-xs outline-none placeholder:text-gray-400"
            required
          />
        </div>
        
        {/* Password Field */}
        <div className="text-left space-y-2">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-black text-black uppercase tracking-tighter">Password</label>
            <button 
              type="button" 
              onClick={onForgotClick} 
              className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-tighter hover:underline"
            >
              Forgot?
            </button>
          </div>
          <input 
            type="password" 
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#f3f4f6] border border-[#D4AF37]/10 p-5 rounded-2xl text-black text-xs outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
            required
          />
        </div>

        {/* LOGING BUTTON */}
        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-[#D4AF37] text-white py-5 rounded-2xl font-black text-[14px] uppercase tracking-[0.15em] shadow-xl active:scale-95 transition-all mt-4"
        >
          {loading ? "LOGGING IN..." : "LOG IN"}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;