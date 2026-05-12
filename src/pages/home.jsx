import React, { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient"; 
import LoginForm from "../components/LoginForm";
import SignupForm from "../components/SignupForm";
import ForgotPassword from "../components/ForgotPassword";

import EVL from "../assets/EVL.jpg";
import LVE from "../assets/LVE.jpg";
import Debut from "../assets/Debut.jpg";

function Home({ isRecovering }) { 
  const navigate = useNavigate();
  
  const getHasToken = () => {
    const hash = window.location.hash;
    const search = window.location.search;
    return hash.includes('access_token') || 
           hash.includes('type=recovery') || 
           search.includes('access_token') ||
           search.includes('type=recovery');
  };
  
  const [showAuth, setShowAuth] = useState(isRecovering || getHasToken());
  const [activeTab, setActiveTab] = useState((isRecovering || getHasToken()) ? 'forgot' : 'login');
  const [session, setSession] = useState(null);

  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (getHasToken() && activeTab !== 'forgot') {
        setShowAuth(true);
        setActiveTab('forgot');
        clearInterval(checkInterval);
      }
    }, 500);
    return () => clearInterval(checkInterval);
  }, [activeTab]);

  const handleNavAction = useCallback((type) => {
    if (getHasToken()) return;
    
    if (type === 'home') {
      setShowAuth(false);
      window.history.replaceState(null, null, window.location.pathname);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useLayoutEffect(() => {
    if (isRecovering || getHasToken()) {
      setShowAuth(true);
      setActiveTab('forgot');
    }
  }, [isRecovering]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      
      if (event === 'PASSWORD_RECOVERY') {
        setShowAuth(true);
        setActiveTab('forgot');
      }
      
      if (event === 'USER_UPDATED') {
        setTimeout(async () => {
          await supabase.auth.signOut();
          setSession(null);
          setShowAuth(true);
          setActiveTab('login');
          window.history.replaceState(null, null, window.location.pathname);
          alert("Password updated successfully!");
        }, 1500);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []); 

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setShowAuth(false);
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen text-white font-sans bg-black selection:bg-yellow-500/30 scroll-smooth">
      
      <nav className="flex items-center justify-between px-12 py-6 fixed top-0 w-full z-[100] bg-black/40 backdrop-blur-md border-b border-white/5">
        <div 
          className="text-2xl font-black text-yellow-500 italic tracking-tighter cursor-pointer" 
          onClick={() => handleNavAction('home')}
        >
          Faustino's
        </div>
        
        <div className="hidden md:flex gap-10 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-300">
          <a href="#home" className="hover:text-yellow-500 transition-all">Home</a>
          <a href="#about" className="hover:text-yellow-500 transition-all">About Us</a>
          <a href="#celebrations" className="hover:text-yellow-500 transition-all uppercase">Event</a>
          <button onClick={() => navigate('/ClientDashboard')} className="hover:text-yellow-500 transition-all uppercase text-[11px] font-bold tracking-[0.2em]">Packages</button>
        </div>

        <div className="flex gap-3">
          {!session ? (
            <>
              <button onClick={() => { setShowAuth(true); setActiveTab('signup'); }} className="text-[10px] font-black uppercase tracking-widest bg-[#D4AF37] text-white px-7 py-3 rounded-md active:scale-95 transition-all">Sign Up</button>
              <button onClick={() => { setShowAuth(true); setActiveTab('login'); }} className="text-[10px] font-black uppercase tracking-widest bg-[#D4AF37] text-white px-7 py-3 rounded-md active:scale-95 transition-all">Log In</button>
            </>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => navigate(session.user.email.includes('admin') ? '/AdminDashboard' : '/ClientDashboard')} className="text-[10px] font-black uppercase tracking-widest bg-white text-black px-6 py-3 rounded-md active:scale-95 transition-all">Dashboard</button>
              <button onClick={handleLogout} className="text-[10px] font-black uppercase tracking-widest border border-white/20 text-white px-6 py-3 rounded-md active:scale-95 transition-all">Logout</button>
            </div>
          )}
        </div>
      </nav>

      <section id="home" className="relative h-screen flex flex-col items-center justify-center text-center px-6">
        <div className="absolute inset-0 z-0">
          <img src={EVL} alt="Hero" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black" />
        </div>
        <div className="relative z-10 space-y-6">
          <h1 className="text-6xl md:text-8xl font-serif italic text-yellow-500 tracking-tight drop-shadow-2xl">Faustino's Event Place</h1>
          <p className="text-gray-300 text-sm md:text-lg max-w-2xl mx-auto leading-relaxed italic font-light tracking-wide">"Where timeless elegance meets modern sophistication for life's most cherished celebrations"</p>
        </div>
      </section>

      <section id="about" className="py-32 px-12 bg-black min-h-[70vh] flex items-center">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="flex justify-center">
            <div className="w-full max-w-lg overflow-hidden rounded-[2.5rem] shadow-2xl border border-white/5 aspect-video">
              <img src={LVE} alt="About Us" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-yellow-500 font-bold uppercase tracking-[0.4em] text-[9px]">Rustic Charm with Modern Luxury.</p>
              <h2 className="text-4xl md:text-5xl font-serif italic text-white leading-tight">Where Every Detail Tells a Story.</h2>
              <p className="text-gray-400 text-[12px] leading-relaxed max-w-sm font-light">Faustino's Event Place is dedicated to providing a sophisticated backdrop for life's most precious milestones.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="celebrations" className="py-24 px-12 bg-black border-t border-white/5">
        <div className="text-center mb-16 space-y-2">
          <h2 className="text-4xl md:text-5xl font-serif italic text-yellow-500">Our Packages</h2>
          <p className="text-gray-500 text-[9px] font-bold uppercase tracking-[0.3em]">View our exclusive offers</p>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 pb-32">
          {[EVL, LVE, Debut].map((img, index) => (
            <div key={index} className="group relative overflow-hidden rounded-xl aspect-[4/5] cursor-pointer" onClick={() => navigate('/ClientDashboard')}>
              <img src={img} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" alt="Celebration" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all duration-300" />
            </div>
          ))}
        </div>
      </section>

      <section className="py-24 px-12 bg-black border-t border-white/5">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-4xl md:text-5xl font-serif italic text-yellow-500">Find Us</h2>
            <p className="text-gray-500 text-[9px] font-bold uppercase tracking-[0.3em]">Visit our elegant venue</p>
          </div>
          
          <div className="w-full h-[450px] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 relative group">
            <iframe
              title="Faustino's Event Place Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3864.5516!2d120.9333!3d14.4103!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397d28ccbc9dd0d%3A0x12012061404c6c05!2s54%20Tahimik%20St%2C%20Imus%2C%20Cavite!5e0!3m2!1sen!2sph!4v1715560000000!5m2!1sen!2sph" 
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="grayscale group-hover:grayscale-0 transition-all duration-1000 opacity-70 group-hover:opacity-100"
            ></iframe>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-white/5 bg-black text-center">
        <div className="space-y-4">
          <div className="text-xl font-black text-yellow-500 italic tracking-tighter">Faustino's</div>
          <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.2em]">
            © 2026 Faustino's Event Place. All Rights Reserved.
          </p>
        </div>
      </footer>

      {showAuth && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => { 
            if(!getHasToken()) setShowAuth(false); 
          }} />
          <div className="relative w-full max-w-md bg-[#111] p-10 rounded-2xl border border-white/10 shadow-2xl">
            {activeTab !== 'forgot' && (
              <div className="flex justify-center gap-8 mb-8 border-b border-white/5 pb-4">
                <button onClick={() => setActiveTab('login')} className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'login' ? 'text-yellow-500 border-b border-yellow-500 pb-2' : 'text-gray-400'}`}>Log In</button>
                <button onClick={() => setActiveTab('signup')} className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'signup' ? 'text-yellow-500 border-b border-yellow-500 pb-2' : 'text-gray-400'}`}>Sign Up</button>
              </div>
            )}
            <div className="min-h-[300px] flex flex-col justify-center">
              {activeTab === 'login' && <LoginForm onForgotClick={() => setActiveTab('forgot')} />}
              {activeTab === 'signup' && <SignupForm />}
              {activeTab === 'forgot' && (
                <ForgotPassword 
                  isOpen={true} 
                  isRecoveryMode={isRecovering || getHasToken()} 
                  onClose={() => { 
                    if (!getHasToken()) {
                       setShowAuth(false); 
                       setActiveTab('login'); 
                       window.history.replaceState(null, null, window.location.pathname);
                    }
                  }} 
                />
              )}
            </div>
            {!getHasToken() && (
               <button onClick={() => { setShowAuth(false); setActiveTab('login'); }} className="mt-8 w-full text-[9px] font-bold uppercase text-gray-600 hover:text-white transition-all text-center tracking-widest">Back to Home</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;