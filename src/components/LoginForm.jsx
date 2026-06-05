import { supabase } from '../supabaseClient.js';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoice } from './hooks/useVoice';
import { Mic, Volume2 } from 'lucide-react';

const LoginForm = ({ onForgotClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [focusedElement, setFocusedElement] = useState("");
  const recognitionRef = useRef(null);
  const navigate = useNavigate();

  const speak = (text) => {
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
      if (activeElement.classList.contains("email-input")) {
        textToRead = "Email address input field. Type your email.";
      }
      else if (activeElement.classList.contains("password-input")) {
        textToRead = "Password input field. Type your password.";
      }
      else if (activeElement.classList.contains("login-btn")) {
        textToRead = "Log In button. Press Enter to submit.";
      }
      else if (activeElement.classList.contains("forgot-btn")) {
        textToRead = "Forgot password button. Press Enter to reset your password.";
      }
      else if (activeElement.classList.contains("mic-btn")) {
        textToRead = "Microphone button. Press Enter to activate voice commands.";
      }
      else if (activeElement.getAttribute("aria-label")) {
        textToRead = activeElement.getAttribute("aria-label");
      }
      
      if (textToRead) {
        speak(textToRead);
        setFocusedElement(textToRead);
        setTimeout(() => setFocusedElement(""), 2000);
      }
    }
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
        else if (!activeElement?.classList?.contains("login-btn")) {
          handleLogin(e);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    
    const allInteractive = document.querySelectorAll("button, a, input, [tabindex]");
    allInteractive.forEach(el => {
      el.addEventListener("focus", readFocusedElement);
    });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      allInteractive.forEach(el => {
        el.removeEventListener("focus", readFocusedElement);
      });
    };
  }, []);

  const executeCommand = async (command) => {
    console.log("Command:", command);

    if (command === "mic" || command === "microphone") {
      startVoice();
    }
    else if (command === "email") {
      const emailInput = document.querySelector(".email-input");
      if (emailInput) {
        emailInput.focus();
        speak("Email field focused. Please say your email.");
      }
    }
    else if (command === "password") {
      const passwordInput = document.querySelector(".password-input");
      if (passwordInput) {
        passwordInput.focus();
        speak("Password field focused. Please say your password.");
      }
    }
    else if (command === "login" || command === "log in") {
      if (email && password) {
        await handleLogin(new Event('submit'));
      } else if (!email) {
        speak("Please enter your email first.");
      } else if (!password) {
        speak("Please enter your password first.");
      }
    }
    else if (command === "forgot" || command === "forgot password") {
      if (onForgotClick) onForgotClick();
      speak("Opening forgot password");
    }
    else if (command === "help") {
      speak("Commands: mic, email, password, login, forgot password, close");
    }
    else if (command === "close") {
      speak("Closing login form");
    }
  };

  const startVoice = () => {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported");
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
      speak("Voice off");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      speak("Listening. Say a command like email, password, or login.");
    };

    recognition.onresult = async (event) => {
      const command = event.results[0][0].transcript.toLowerCase().trim();
      
      if (command.startsWith("email")) {
        const emailValue = command.replace("email", "").trim();
        if (emailValue) {
          setEmail(emailValue);
          speak(`Email set to ${emailValue}`);
        } else {
          speak("Please say your email after saying email");
        }
      }
      else if (command.startsWith("password")) {
        const passwordValue = command.replace("password", "").trim();
        if (passwordValue) {
          setPassword(passwordValue);
          speak("Password received");
        } else {
          speak("Please say your password after saying password");
        }
      }
      else {
        await executeCommand(command);
      }
      
      recognition.stop();
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.log("Error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const handleLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (loading) return;
    setLoading(true);
    speak("Logging in");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      if (data?.session) {
        speak("Login successful. Redirecting to dashboard.");
        navigate('/ClientDashboard', { replace: true });
      }
      
    } catch (error) {
      speak(`Login failed. ${error.message}`);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative bg-[#1a1a2e]/90 backdrop-blur-xl p-10 rounded-2xl w-full max-w-[380px] mx-auto shadow-2xl border border-yellow-500/30">
      {focusedElement && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-4 py-2 rounded-full z-50 text-sm border border-yellow-500/30">
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

      <div className="absolute -top-12 right-0">
        <button 
          onClick={startVoice}
          className="mic-btn p-3 bg-yellow-500 rounded-full hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20"
          tabIndex={0}
          aria-label="Microphone button. Press Enter to activate voice commands."
        >
          <Mic size={18} className="text-black" />
        </button>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        <div className="text-left space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter px-1">Email Address</label>
          <input 
            type="email" 
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="email-input w-full bg-white/10 border border-white/20 p-5 rounded-xl text-white text-xs outline-none placeholder:text-gray-500 focus:border-yellow-500 transition-all"
            required
            tabIndex={0}
            aria-label="Email address input field"
          />
        </div>
        
        <div className="text-left space-y-2">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Password</label>
            <button 
              type="button" 
              onClick={onForgotClick} 
              className="forgot-btn text-[9px] font-bold text-yellow-500 uppercase tracking-tighter hover:text-yellow-400 transition-all"
              tabIndex={0}
              aria-label="Forgot password button"
            >
              Forgot?
            </button>
          </div>
          <input 
            type="password" 
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="password-input w-full bg-white/10 border border-white/20 p-5 rounded-xl text-white text-xs outline-none placeholder:text-gray-500 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all"
            required
            tabIndex={0}
            aria-label="Password input field"
          />
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="login-btn w-full bg-yellow-500 text-black py-5 rounded-xl font-black text-sm uppercase tracking-[0.15em] shadow-xl shadow-yellow-500/20 active:scale-95 transition-all mt-4 hover:bg-yellow-400 disabled:opacity-50"
          tabIndex={0}
          aria-label="Log In button. Press Enter to submit."
        >
          {loading ? "LOGGING IN..." : "LOG IN"}
        </button>
      </form>

      <div className="mt-4 text-center text-[9px] text-gray-500">
        <p>Press TAB to navigate, ENTER to select</p>
        <p>Say "help" for voice commands</p>
      </div>
    </div>
  );
};

export default LoginForm;