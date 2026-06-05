import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient"; 
import LoginForm from "../components/LoginForm";
import SignupForm from "../components/SignupForm";
import ForgotPassword from "../components/ForgotPassword";
import { useVoice } from '../components/hooks/useVoice';
import { Mic, Volume2, Keyboard } from 'lucide-react';

import EVL from "../assets/EVL.jpg";
import LVE from "../assets/LVE.jpg";
import Debut from "../assets/Debut.jpg";

function Home({ isRecovering }) { 
  const navigate = useNavigate();
  const { speak } = useVoice();
  
  const [isListening, setIsListening] = useState(false);
  const [focusedElement, setFocusedElement] = useState("");
  const recognitionRef = useRef(null);
  
  const getHasToken = () => {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    return hash.includes('access_token') || 
            hash.includes('type=recovery') || 
            params.has('access_token') ||
            isRecovering;
  };
  
  const [showAuth, setShowAuth] = useState(getHasToken());
  const [activeTab, setActiveTab] = useState(getHasToken() ? 'forgot' : 'login');
  const [session, setSession] = useState(null);
  const [authError, setAuthError] = useState(null);

  const speakText = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const readFocusedElement = () => {
    const activeElement = document.activeElement;
    let textToRead = "";

    if (activeElement) {
      if (activeElement.classList.contains("mic-button")) {
        textToRead = "Microphone button. Press Enter to activate voice commands.";
      }
      else if (activeElement.classList.contains("signup-btn")) {
        textToRead = "Sign Up button. Press Enter to create an account.";
      }
      else if (activeElement.classList.contains("login-btn")) {
        textToRead = "Log In button. Press Enter to sign in to your account.";
      }
      else if (activeElement.classList.contains("dashboard-btn")) {
        textToRead = "Dashboard button. Press Enter to go to your dashboard.";
      }
      else if (activeElement.classList.contains("logout-btn")) {
        textToRead = "Logout button. Press Enter to sign out.";
      }
      else if (activeElement.classList.contains("home-link")) {
        textToRead = "Home link. Press Enter to go to home section.";
      }
      else if (activeElement.classList.contains("about-link")) {
        textToRead = "About Us link. Press Enter to go to about section.";
      }
      else if (activeElement.classList.contains("events-link")) {
        textToRead = "Events link. Press Enter to go to events section.";
      }
      else if (activeElement.classList.contains("packages-link")) {
        textToRead = "Packages link. Press Enter to view our packages.";
      }
      else if (activeElement.classList.contains("package-card")) {
        textToRead = "Package image. Press Enter to view packages.";
      }
      else if (activeElement.getAttribute("aria-label")) {
        textToRead = activeElement.getAttribute("aria-label");
      }
      else if (activeElement.tagName === "BUTTON") {
        textToRead = activeElement.innerText || "Button";
      }
      else if (activeElement.tagName === "A") {
        textToRead = activeElement.innerText || "Link";
      }
      
      if (textToRead) {
        speakText(textToRead);
        setFocusedElement(textToRead);
        setTimeout(() => setFocusedElement(""), 2000);
      }
    }
  };

  const executeCommand = (command) => {
    console.log("Command recognized:", command);
    const lowerCommand = command.toLowerCase();

    if (lowerCommand === "mic" || lowerCommand === "microphone" || lowerCommand === "microphone button") {
      startVoiceCommand();
    }
    else if (lowerCommand === "login" || lowerCommand === "log in" || lowerCommand === "sign in" || lowerCommand.includes("login")) {
      setShowAuth(true);
      setActiveTab('login');
      setAuthError(null);
      speakText("Login form opened");
    }
    else if (lowerCommand === "signup" || lowerCommand === "sign up" || lowerCommand === "create account" || lowerCommand.includes("signup")) {
      setShowAuth(true);
      setActiveTab('signup');
      setAuthError(null);
      speakText("Sign up form opened");
    }
    else if (lowerCommand === "packages" || lowerCommand === "package" || lowerCommand === "view packages" || 
             lowerCommand === "show packages" || lowerCommand === "see packages" || lowerCommand === "check packages" ||
             lowerCommand === "our packages" || lowerCommand === "view package" || lowerCommand.includes("package")) {
      speakText("Opening packages");
      setTimeout(() => {
        navigate('/ClientDashboard');
      }, 300);
    }
    else if (lowerCommand === "home" || lowerCommand === "go home" || lowerCommand === "back to home" || lowerCommand === "home page") {
      setShowAuth(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      speakText("Going to home");
    }
    else if (lowerCommand === "about" || lowerCommand === "about us" || lowerCommand === "go to about" || lowerCommand === "about section" ||
             lowerCommand.includes("about")) {
      const aboutSection = document.getElementById('about');
      if (aboutSection) {
        aboutSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        speakText("Scrolling to about us");
      } else {
        speakText("About section not found");
      }
    }
    else if (lowerCommand === "events" || lowerCommand === "event" || lowerCommand === "our events" || lowerCommand === "view events" ||
             lowerCommand === "show events" || lowerCommand === "check events" || lowerCommand.includes("event")) {
      const eventsSection = document.getElementById('celebrations');
      if (eventsSection) {
        eventsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        speakText("Scrolling to events");
      } else {
        speakText("Events section not found");
      }
    }
    else if (lowerCommand === "find us" || lowerCommand === "location" || lowerCommand === "find location" || 
             lowerCommand === "map" || lowerCommand === "where are you" || lowerCommand === "address" ||
             lowerCommand === "find" || lowerCommand === "our location" || lowerCommand.includes("location") ||
             lowerCommand.includes("find")) {
      const locationSection = document.getElementById('find-us');
      if (locationSection) {
        locationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        speakText("Scrolling to location");
      } else {
        speakText("Location section not found");
      }
    }
    else if (lowerCommand === "close" || lowerCommand === "close modal" || lowerCommand === "close form" || lowerCommand === "cancel") {
      if (showAuth) {
        setShowAuth(false);
        setActiveTab('login');
        setAuthError(null);
        speakText("Closed");
      } else {
        speakText("Nothing to close");
      }
    }
    else if (lowerCommand === "dashboard" || lowerCommand === "my dashboard" || lowerCommand === "go to dashboard") {
      if (session) {
        const isAdmin = session.user.email?.toLowerCase().includes('admin');
        navigate(isAdmin ? '/AdminDashboard' : '/ClientDashboard');
        speakText("Opening dashboard");
      } else {
        speakText("Please login first");
        setShowAuth(true);
        setActiveTab('login');
      }
    }
    else if (lowerCommand === "logout" || lowerCommand === "sign out" || lowerCommand === "log out") {
      if (session) {
        handleLogout();
      } else {
        speakText("You are not logged in");
      }
    }
    else if (lowerCommand === "help" || lowerCommand === "what can I say" || lowerCommand === "commands" || lowerCommand === "help me") {
      speakText("Commands: mic, login, signup, packages, view packages, home, about, about us, events, find us, location, close, dashboard, logout, scroll up, scroll down");
    }
    else if (lowerCommand === "scroll up" || lowerCommand === "up" || lowerCommand === "go up") {
      window.scrollBy({ top: -300, behavior: 'smooth' });
      speakText("Scrolling up");
    }
    else if (lowerCommand === "scroll down" || lowerCommand === "down" || lowerCommand === "go down") {
      window.scrollBy({ top: 300, behavior: 'smooth' });
      speakText("Scrolling down");
    }
    else {
      speakText("Command not recognized. Say help for list of commands.");
    }
  };

  const startVoiceCommand = () => {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported");
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
      speakText("Voice off");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 5;

    recognition.onstart = () => {
      setIsListening(true);
      speakText("Listening");
    };

    recognition.onresult = (event) => {
      let command = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          command = event.results[i][0].transcript.toLowerCase().trim();
          break;
        }
      }
      
      if (command) {
        console.log("Recognized:", command);
        executeCommand(command);
      } else if (event.results[0]) {
        const alternative = event.results[0][0].transcript.toLowerCase().trim();
        console.log("Alternative:", alternative);
        executeCommand(alternative);
      }
      
      recognition.stop();
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.log("Error:", event.error);
      if (event.error === 'no-speech') {
        speakText("I didn't hear anything. Please try again.");
      } else if (event.error === 'not-allowed') {
        speakText("Microphone access denied. Please allow microphone access.");
      } else if (event.error === 'network') {
        speakText("Network error. Please check your connection.");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Tab") {
        setTimeout(() => readFocusedElement(), 100);
      }
      else if (e.key === "Enter") {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.click) {
          activeElement.click();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    
    const allInteractive = document.querySelectorAll("button, a, [tabindex]");
    allInteractive.forEach(el => {
      el.addEventListener("focus", readFocusedElement);
    });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      allInteractive.forEach(el => {
        el.removeEventListener("focus", readFocusedElement);
      });
    };
  }, [showAuth, session]);

  useEffect(() => {
    speakText("Maligayang pagdating sa Faustino's Event Place. Press Tab to navigate, or press the mic button for voice commands.");
  }, []);

  useEffect(() => {
    if (getHasToken()) {
      setShowAuth(true);
      setActiveTab('forgot');
    }
  }, [isRecovering]);

  const handleNavAction = useCallback((type) => {
    if (getHasToken()) return;
    if (type === 'home') {
      setShowAuth(false);
      window.history.replaceState(null, null, window.location.pathname);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useLayoutEffect(() => {
    if (getHasToken()) {
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
          speakText("Password updated successfully");
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
    speakText("Logged out");
  };

  // Simple error boundary for forms
  const renderForm = () => {
    try {
      if (activeTab === 'login') {
        return <LoginForm onForgotClick={() => setActiveTab('forgot')} />;
      }
      if (activeTab === 'signup') {
        return <SignupForm />;
      }
      return null;
    } catch (err) {
      console.error("Form render error:", err);
      return (
        <div className="text-center text-red-400 text-xs py-4">
          Error loading form. Please refresh the page.
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen text-white font-sans bg-gradient-to-br from-[#1a1a2e] to-[#16213e] selection:bg-yellow-500/30 scroll-smooth relative overflow-x-hidden">
      {/* Elegant Background Ornaments */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-yellow-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -right-40 w-96 h-96 bg-yellow-600/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-r from-yellow-500/5 to-transparent rounded-full blur-3xl"></div>
      </div>

      {focusedElement && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-xl text-white px-4 py-2 rounded-full z-50 text-sm border border-yellow-500/30">
          <Volume2 size={14} className="inline mr-2 text-yellow-500" />
          {focusedElement}
        </div>
      )}

      {isListening && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-5 py-2 rounded-full z-50 flex items-center gap-2 shadow-lg shadow-yellow-500/20">
          <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
          <Mic size={14} />
          <span className="text-xs font-bold">Say a command...</span>
        </div>
      )}

      <div className="fixed top-20 right-4 bg-black/60 backdrop-blur-xl text-white p-3 rounded-xl z-40 text-xs max-w-xs border border-yellow-500/20">
        <Keyboard size={14} className="inline mr-1 text-yellow-500" />
        <span className="font-bold">Accessibility:</span>
        <p className="mt-1">Press TAB to navigate, ENTER to select</p>
        <p>Press MIC button or say "mic" for voice commands</p>
        <p>Say "help" for all voice commands</p>
      </div>

      <nav className="flex items-center justify-between px-12 py-6 fixed top-0 w-full z-[100] bg-black/40 backdrop-blur-xl border-b border-yellow-500/20">
        <div 
          className="text-2xl font-black italic tracking-tighter cursor-pointer bg-gradient-to-r from-yellow-500 to-yellow-400 bg-clip-text text-transparent"
          onClick={() => handleNavAction('home')}
          tabIndex={0}
          aria-label="Faustino's home"
        >
          Faustino's
        </div>
        
        <div className="hidden md:flex gap-10 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-300">
          <a href="#home" className="home-link hover:text-yellow-500 transition-all" tabIndex={0} aria-label="Home section">Home</a>
          <a href="#about" className="about-link hover:text-yellow-500 transition-all" tabIndex={0} aria-label="About Us section">About Us</a>
          <a href="#celebrations" className="events-link hover:text-yellow-500 transition-all uppercase" tabIndex={0} aria-label="Events section">Event</a>
          <button onClick={() => navigate('/ClientDashboard')} className="packages-link hover:text-yellow-500 transition-all uppercase text-[11px] font-bold tracking-[0.2em]" tabIndex={0} aria-label="View packages">Packages</button>
        </div>

        <div className="flex gap-3 items-center">
          <button 
            onClick={startVoiceCommand} 
            className="mic-button p-2 bg-white/10 backdrop-blur-sm rounded-full hover:bg-yellow-500 hover:text-black transition-all border border-white/20"
            tabIndex={0}
            aria-label="Microphone button. Press Enter to activate voice commands."
          >
            <Mic size={16}/>
          </button>
          {!session ? (
            <>
              <button 
                onClick={() => { setShowAuth(true); setActiveTab('signup'); setAuthError(null); }} 
                className="signup-btn text-[10px] font-black uppercase tracking-widest bg-yellow-500 text-black px-7 py-3 rounded-full active:scale-95 transition-all cursor-pointer hover:bg-yellow-400 shadow-lg shadow-yellow-500/20"
                tabIndex={0}
                aria-label="Sign Up button. Press Enter to create an account."
              >
                Sign Up
              </button>
              <button 
                onClick={() => { setShowAuth(true); setActiveTab('login'); setAuthError(null); }} 
                className="login-btn text-[10px] font-black uppercase tracking-widest bg-yellow-500 text-black px-7 py-3 rounded-full active:scale-95 transition-all cursor-pointer hover:bg-yellow-400 shadow-lg shadow-yellow-500/20"
                tabIndex={0}
                aria-label="Log In button. Press Enter to sign in."
              >
                Log In
              </button>
            </>
          ) : (
            <div className="flex gap-3">
              <button 
                onClick={() => navigate(session.user.email.includes('admin') ? '/AdminDashboard' : '/ClientDashboard')} 
                className="dashboard-btn text-[10px] font-black uppercase tracking-widest bg-yellow-500 text-black px-6 py-3 rounded-full active:scale-95 transition-all cursor-pointer hover:bg-yellow-400"
                tabIndex={0}
                aria-label="Dashboard button. Press Enter to go to your dashboard."
              >
                Dashboard
              </button>
              <button 
                onClick={handleLogout} 
                className="logout-btn text-[10px] font-black uppercase tracking-widest border border-white/30 text-white px-6 py-3 rounded-full active:scale-95 transition-all cursor-pointer hover:bg-red-500/20 hover:border-red-500/50"
                tabIndex={0}
                aria-label="Logout button. Press Enter to sign out."
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      <section id="home" className="relative h-screen flex flex-col items-center justify-center text-center px-6" tabIndex={0} aria-label="Hero section">
        <div className="absolute inset-0 z-0">
          <img src={EVL} alt="Hero" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-[#1a1a2e]" />
        </div>
        <div className="relative z-10 space-y-6">
          <h1 className="text-6xl md:text-8xl font-serif italic tracking-tight drop-shadow-2xl bg-gradient-to-r from-yellow-500 to-yellow-400 bg-clip-text text-transparent">
            Faustino's Event Place
          </h1>
        </div>
      </section>

      <section id="about" className="py-32 px-12 min-h-[70vh] flex items-center relative z-10" tabIndex={0} aria-label="About Us section">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl border border-yellow-500/20 aspect-video">
            <img src={LVE} alt="About Us" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-4xl md:text-5xl font-serif italic text-white leading-tight">Where Every Detail Tells a Story.</h2>
        </div>
      </section>

      <section id="celebrations" className="py-24 px-12 border-t border-yellow-500/20 relative z-10" tabIndex={0} aria-label="Events section">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif italic bg-gradient-to-r from-yellow-500 to-yellow-400 bg-clip-text text-transparent">Our Packages</h2>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 pb-32">
          {[EVL, LVE, Debut].map((img, index) => (
            <div 
              key={index} 
              className="package-card group overflow-hidden rounded-xl aspect-[4/5] cursor-pointer border border-white/10 hover:border-yellow-500/50 transition-all duration-300" 
              onClick={() => navigate('/ClientDashboard')}
              tabIndex={0}
              aria-label="Package image. Press Enter to view packages"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  navigate('/ClientDashboard');
                }
              }}
            >
              <img src={img} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" alt="Celebration" />
            </div>
          ))}
        </div>
      </section>

      <section id="find-us" className="py-24 px-12 border-t border-yellow-500/20 relative z-10" tabIndex={0} aria-label="Location section">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-serif italic bg-gradient-to-r from-yellow-500 to-yellow-400 bg-clip-text text-transparent">Find Us</h2>
          </div>
          <div className="w-full h-[450px] rounded-2xl overflow-hidden shadow-2xl border border-yellow-500/20 relative">
            <iframe title="Location" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3864.5516!2d120.9333!3d14.4103!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397d28ccbc9dd0d%3A0x12012061404c6c05!2s54%20Tahimik%20St%2C%20Imus%2C%20Cavite!5e0!3m2!1sen!2sph!4v1715560000000!5m2!1sen!2sph" width="100%" height="100%" style={{ border: 0 }} allowFullScreen="" loading="lazy"></iframe>
          </div>
        </div>
      </section>

      {showAuth && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="relative z-10 w-full max-w-md">
            {activeTab === 'forgot' ? (
              <ForgotPassword isOpen={true} onClose={() => { setShowAuth(false); setActiveTab('login'); }} />
            ) : (
              <div className="bg-[#1a1a2e]/90 backdrop-blur-xl p-10 rounded-2xl border border-yellow-500/30 shadow-2xl">
                {/* Debug indicator - remove later */}
                <div className="text-center text-[8px] text-yellow-500/50 mb-2">
                  Active: {activeTab}
                </div>
                
                <div className="flex justify-center gap-8 mb-8 border-b border-yellow-500/20 pb-4">
                  <button 
                    onClick={() => {
                      console.log("Switching to login");
                      setActiveTab('login');
                      setAuthError(null);
                    }} 
                    className={`text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'login' ? 'text-yellow-500 border-b-2 border-yellow-500 pb-3 -mb-4' : 'text-gray-500 hover:text-yellow-500'}`}
                    tabIndex={0}
                    aria-label="Login tab"
                  >
                    Log In
                  </button>
                  <button 
                    onClick={() => {
                      console.log("Switching to signup");
                      setActiveTab('signup');
                      setAuthError(null);
                    }} 
                    className={`text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'signup' ? 'text-yellow-500 border-b-2 border-yellow-500 pb-3 -mb-4' : 'text-gray-500 hover:text-yellow-500'}`}
                    tabIndex={0}
                    aria-label="Sign Up tab"
                  >
                    Sign Up
                  </button>
                </div>
                
                {authError && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-xs text-center">
                    {authError}
                  </div>
                )}
                
                {renderForm()}
                
                <button 
                  onClick={() => { setShowAuth(false); setActiveTab('login'); setAuthError(null); }} 
                  className="mt-8 w-full text-[9px] font-bold uppercase text-gray-500 hover:text-yellow-500 transition-all text-center tracking-widest cursor-pointer"
                  tabIndex={0}
                  aria-label="Back to home"
                >
                  Back to Home
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;