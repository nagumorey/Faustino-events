import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LayoutDashboard, Users, Calendar, Settings, LogOut, Star, CreditCard } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Ginamit natin ang structure pero ginawa nating placeholder/zero muna ang values
  const stats = [
    { label: "Bookings", value: "0", icon: <Calendar size={18} />, color: "bg-red-500" },
    { label: "Events", value: "0", icon: <Star size={18} />, color: "bg-green-500" },
    { label: "Registered Clients", value: "0", icon: <Users size={18} />, color: "bg-yellow-500" },
    { label: "Total Revenue", value: "₱0.00", icon: <CreditCard size={18} />, color: "bg-[#1e293b]" },
  ];

  const handleUpdate = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ email: newEmail, password: newPassword });
    if (!error) {
      alert("Account updated successfully.");
      setIsSettingsOpen(false);
    }
  };

  // FIX: Saktong logout logic para mag-update ang Home Navbar
  const handleLogout = async () => {
    try {
      // 1. Patayin ang session sa Supabase server
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // 2. Linisin ang local storage para siguradong malinis ang session state
      localStorage.clear();

      // 3. Force refresh pabalik sa Home para mag-re-render ang Navbar
      window.location.replace("/"); 
    } catch (error) {
      console.error('Logout error:', error.message);
      window.location.replace("/");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans text-slate-800">
      
      {/* SIDEBAR - Luxury Black Sidebar */}
      <aside className="w-64 bg-black p-6 flex flex-col shadow-xl">
        <div className="mb-10 px-2">
           <h2 className="text-white font-black tracking-tighter text-xl italic">FAUSTINO'S</h2>
           <p className="text-[10px] text-slate-500 font-bold tracking-widest mt-1 uppercase">Admin Panel</p>
        </div>

        <nav className="space-y-2 flex-1">
          <button className="flex items-center gap-3 w-full p-3 rounded-lg bg-white/10 text-white text-[11px] font-bold uppercase tracking-widest transition-all">
            <LayoutDashboard size={16} className="text-yellow-500" /> Dashboard
          </button>
          <button className="flex items-center gap-3 w-full p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all text-[11px] font-bold uppercase tracking-widest">
            <Star size={16} /> Event
          </button>
          <button className="flex items-center gap-3 w-full p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all text-[11px] font-bold uppercase tracking-widest">
            <Calendar size={16} /> Booking
          </button>
          <button className="flex items-center gap-3 w-full p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all text-[11px] font-bold uppercase tracking-widest">
            <Users size={16} /> User
          </button>
        </nav>

        <div className="border-t border-slate-800 pt-4 space-y-2">
          <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-3 w-full p-3 text-slate-400 hover:text-white text-[11px] font-bold uppercase tracking-widest">
            <Settings size={16} /> Settings
          </button>
          {/* UPDATED: Tinatawag na ang handleLogout dito */}
          <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 text-slate-500 hover:text-red-500 text-[11px] font-bold uppercase tracking-widest transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* TOP BLACK HEADER STRIP */}
        <header className="flex justify-between items-center mb-10 bg-black text-white p-4 rounded-xl shadow-lg">
          <h2 className="text-xs font-bold tracking-[0.3em] uppercase ml-4">EMS Dashboard</h2>
          <div className="mr-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System Live</span>
          </div>
        </header>

        {/* WELCOME SECTION */}
        <div className="mb-10">
          <h1 className="text-4xl font-serif font-bold text-[#1e293b]">Welcome Admin!</h1>
          <p className="text-slate-400 text-sm mt-1 font-medium italic">Manage your events, bookings, and analytics from this panel.</p>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {stats.map((s, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-black transition-colors">{s.label}</h3>
                <div className={`${s.color} p-2.5 rounded-xl text-white shadow-lg shadow-slate-200`}>{s.icon}</div>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-800 tracking-tighter">{s.value}</p>
                <div className="w-full bg-slate-100 h-1 rounded-full mt-4 overflow-hidden">
                   <div className={`${s.color} h-full opacity-20`} style={{width: '100%'}}></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CALENDAR & LIST PLACEHOLDERS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 min-h-[300px] flex flex-col items-center justify-center">
            <Calendar size={40} className="text-slate-200 mb-4" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">No Scheduled Events</p>
          </div>
          
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 min-h-[300px]">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-6 border-b border-slate-50 pb-4">Upcoming Schedule</h3>
            <div className="flex flex-col items-center justify-center h-full pb-10">
              <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">Database is empty</p>
            </div>
          </div>
        </div>
      </main>

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-[100]">
          <div className="bg-white w-full max-w-xs p-8 rounded-[2.5rem] shadow-2xl">
            <h3 className="text-black font-black text-center uppercase tracking-widest mb-6 text-sm">Update Credentials</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <input 
                type="email" 
                placeholder="New Email" 
                className="w-full bg-[#FAF9F6] border border-slate-100 p-4 rounded-2xl text-[11px] outline-none focus:border-yellow-500 transition-all"
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <input 
                type="password" 
                placeholder="New Password" 
                className="w-full bg-[#FAF9F6] border border-slate-100 p-4 rounded-2xl text-[11px] outline-none focus:border-yellow-500 transition-all"
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button type="submit" className="w-full bg-black text-white py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-600 transition-all shadow-lg">Save Settings</button>
              <button onClick={() => setIsSettingsOpen(false)} className="w-full text-slate-400 py-2 text-[10px] font-bold uppercase mt-2">Close</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;