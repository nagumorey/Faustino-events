import React, { useState, useEffect, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabasecLient"; 
import LoginForm from "../components/LoginForm";
import SignupForm from "../components/SignupForm";
import ForgotPassword from "../components/ForgotPassword";

// Assets
import EVL from "../assets/EVL.jpg";
import LVE from "../assets/LVE.jpg";
import Debut from "../assets/Debut.jpg";

function Home({ isRecovering }) { 
  const navigate = useNavigate();
  
  // 1. Initialize states
  const [showAuth, setShowAuth] = useState(isRecovering);
  const [activeTab, setActiveTab] = useState(isRecovering ? 'forgot' : 'login');
  const [session, setSession] = useState(null);

  // 2. Cleanup function para sa URL
  const clearUrl = () => {
    window.history.replaceState(null, null, window.location.pathname);
  };

  // 3. useLayoutEffect: Ito ang secret weapon. 
  // Sinisigurado nito na bago mag-paint ang browser, naka-check na ang recovery status.
  useLayoutEffect(() => {
    if (isRecovering) {
      setShowAuth(true);
      setActiveTab('forgot');
    }
  }, [isRecovering]);

  useEffect(() => {
    // Initial Session Check
    const getInitialSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
    };
    getInitialSession();

    // Listen for Auth Events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      
      // Explicitly handle recovery event
      if (event === 'PASSWORD_RECOVERY') {
        setShowAuth(true);
        setActiveTab('forgot');
      }

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setShowAuth(false);
        clearUrl();
      }

      if (event === 'USER_UPDATED') {
        setTimeout(() => {
          setShowAuth(false);
          setActiveTab('login');
          clearUrl();
        }, 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, [isRecovering]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setShowAuth(false);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout error:', error.message);
    }
  };

  return (
    <div className="min-h-screen text-white font-sans bg-black selection:bg-yellow-500/30 scroll-smooth">
      
      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-12 py-6 fixed top-0 w-full z-[100] bg-black/40 backdrop-blur-md border-b border-white/5">
        <div 
          className="text-2xl font-black text-yellow-500 italic tracking-tighter cursor-pointer" 
          onClick={() => {
            setShowAuth(false);
            clearUrl();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          Faustino's
        </div>
        
        <div className="hidden md:flex gap-10 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-300">
          <a href="#home" className="hover:text-yellow-500 transition-all">Home</a>
          <a href="#about" className="hover:text-yellow-500 transition-all">About Us</a>
          <a href="#celebrations" className="hover:text-yellow-500 transition-all uppercase">Event</a>
          <button 
            onClick={() => navigate('/ClientDashboard')} 
            className="hover:text-yellow-500 transition-all uppercase text-[11px] font-bold tracking-[0.2em]"
          >
            Packages
          </button>
        </div>

        <div className="flex gap-3">
          {!session ? (
            <>
              <button onClick={() => { setShowAuth(true); setActiveTab('signup'); }} className="text-[10px] font-black uppercase tracking-widest bg-[#D4AF37] text-white px-7 py-3 rounded-md hover:bg-white hover:text-black transition-all shadow-lg active:scale-95">Sign Up</button>
              <button onClick={() => { setShowAuth(true); setActiveTab('login'); }} className="text-[10px] font-black uppercase tracking-widest bg-[#D4AF37] text-white px-7 py-3 rounded-md hover:bg-white hover:text-black transition-all shadow-lg active:scale-95">Log In</button>
            </>
          ) : (
            <div className="flex gap-3">
              <button 
                onClick={() => navigate(session.user.email.includes('admin') ? '/AdminDashboard' : '/ClientDashboard')}
                className="text-[10px] font-black uppercase tracking-widest bg-white text-black px-6 py-3 rounded-md hover:bg-yellow-500 hover:text-white transition-all shadow-lg active:scale-95"
              >
                Dashboard
              </button>
              <button 
                onClick={handleLogout}
                className="text-[10px] font-black uppercase tracking-widest border border-white/20 text-white px-6 py-3 rounded-md hover:bg-red-600 hover:border-red-600 transition-all shadow-lg active:scale-95"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {!showAuth ? (
        <>
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
                  <h2 className="text-4xl md:text-5xl font-serif italic text-white leading-tight">Where Every Detail <br /> Tells a Story.</h2>
                  <p className="text-gray-400 text-[12px] leading-relaxed max-w-sm font-light">Faustino's Event Place is dedicated to providing a sophisticated backdrop for life's most precious milestones.</p>
                </div>
                <div className="flex gap-10 pt-2">
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div><span className="text-[9px] font-black uppercase tracking-widest text-gray-200">500 Guest Capacity</span></div>
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div><span className="text-[9px] font-black uppercase tracking-widest text-gray-200">Full Catering</span></div>
                </div>
              </div>
            </div>
          </section>
          
          {/* Celebrations/Packages Section */}
          <section id="celebrations" className="py-24 px-12 bg-black border-t border-white/5">
             <div className="text-center mb-16 space-y-2">
               <h2 className="text-4xl md:text-5xl font-serif italic text-yellow-500">Our Packages</h2>
               <p className="text-gray-500 text-[9px] font-bold uppercase tracking-[0.3em]">View our exclusive offers</p>
             </div>
             <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
               {[EVL, LVE, Debut].map((img, index) => (
                 <div key={index} className="group relative overflow-hidden rounded-xl aspect-[4/5] cursor-pointer" onClick={() => navigate('/ClientDashboard')}>
                   <img src={img} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" alt="Celebration" />
                   <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all duration-300" />
                 </div>
               ))}
             </div>
          </section>
        </>
      ) : (
        /* AUTH OVERLAY */
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
          {/* Prevent closing if in recovery mode unless explicit "Back to Home" click */}
          <div className="absolute inset-0" onClick={() => { if(!isRecovering) setShowAuth(false); }} />
          
          <div className="relative w-full max-w-md bg-[#111] p-10 rounded-2xl border border-white/10 shadow-2xl">
            {activeTab !== 'forgot' && (
              <div className="flex justify-center gap-8 mb-8 border-b border-white/5 pb-4">
                <button 
                  onClick={() => setActiveTab('login')} 
                  className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'login' ? 'text-yellow-500 border-b border-yellow-500 pb-2' : 'text-gray-400'}`}
                >
                  Log In
                </button>
                <button 
                  onClick={() => setActiveTab('signup')} 
                  className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'signup' ? 'text-yellow-500 border-b border-yellow-500 pb-2' : 'text-gray-400'}`}
                >
                  Sign Up
                </button>
              </div>
            )}

            <div className="min-h-[300px] flex flex-col justify-center">
              {activeTab === 'login' && (
                <LoginForm onForgotClick={() => setActiveTab('forgot')} />
              )}
              
              {activeTab === 'signup' && (
                <SignupForm />
              )}

              {activeTab === 'forgot' && (
                <ForgotPassword 
                  isOpen={true} 
                  onClose={() => {
                    setShowAuth(false);
                    setActiveTab('login');
                    clearUrl();
                  }} 
                />
              )}
            </div>

            <button 
              onClick={() => {
                setShowAuth(false);
                setActiveTab('login');
                clearUrl();
              }} 
              className="mt-8 w-full text-[9px] font-bold uppercase text-gray-600 hover:text-white transition-all text-center tracking-widest"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;