import { supabase } from '../supabaseclient.js';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SignupForm = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone_number, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Helper para i-clear ang lahat ng fields
  const clearForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return alert("Passwords do not match!");
    if (password.length < 6) return alert("Password must be at least 6 characters.");

    setLoading(true);
    try {
      // Ginawang lowercase ang email at trinim ang whitespace
      const cleanEmail = email.trim().toLowerCase();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // I-save ang details sa 'clients' table
        const { error: dbError } = await supabase
          .from('clients')
          .insert([
            {
              user_id: authData.user.id,
              first_name: firstName, 
              last_name: lastName,
              email: cleanEmail,
              phone_number: phone_number
            }
          ]);

        if (dbError) throw dbError;

        // --- ETO YUNG FIX TOL ---
        // I-sign out agad ang user pagka-signup para hindi sila maging "logged in" 
        // sa state ng app mo habang hindi pa confirmed ang email.
        await supabase.auth.signOut();

        alert("Registration Successful! Pakicheck ang email mo para sa confirmation link bago mag-login.");
        
        clearForm();
        
        // Ibalik sa Home page (bilang Guest)
        navigate('/');
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-[#FAF9F6] border border-[#E5E1DA] p-2.5 rounded-lg outline-none focus:border-[#D4AF37] text-slate-800 text-xs transition-all placeholder:text-slate-300";
  const labelClass = "text-[9px] font-bold text-slate-700 uppercase tracking-widest mb-1 block";

  return (
    <div className="bg-white p-6 rounded-2xl w-full max-w-sm mx-auto shadow-2xl border border-slate-50">
      <form onSubmit={handleSignup} className="space-y-3">

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>First Name</label>
            <input
              type="text"
              required
              placeholder="Juan"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Last Name</label>
            <input
              type="text"
              required
              placeholder="Dela Cruz"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Email Address</label>
          <input
            type="email"
            required
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Phone Number</label>
          <input
            type="text"
            maxLength="11"
            placeholder="09XXXXXXXXX"
            value={phone_number}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Confirm</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="text-[8px] text-slate-400 font-medium text-right">
          {password.length}/6 characters
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#D4AF37] hover:bg-black hover:text-white text-white py-3 rounded-xl font-bold text-[11px] mt-4 transition-all active:scale-[0.96] disabled:opacity-50 shadow-md uppercase tracking-widest"
        >
          {loading ? "PROCESSING..." : "SIGN UP"}
        </button>
      </form>
    </div>
  );
};

export default SignupForm;