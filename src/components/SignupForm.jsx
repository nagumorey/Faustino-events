import { supabase } from '../supabaseClient.js';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Volume2 } from 'lucide-react';

const SignupForm = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone_number, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      if (activeElement.classList.contains("firstname-input")) {
        textToRead = "First name input field. Current value: " + (firstName || "empty");
      }
      else if (activeElement.classList.contains("lastname-input")) {
        textToRead = "Last name input field. Current value: " + (lastName || "empty");
      }
      else if (activeElement.classList.contains("email-input")) {
        textToRead = "Email input field. Current value: " + (email || "empty");
      }
      else if (activeElement.classList.contains("phone-input")) {
        textToRead = "Phone number input field. Current value: " + (phone_number || "empty");
      }
      else if (activeElement.classList.contains("password-input")) {
        textToRead = "Password input field";
      }
      else if (activeElement.classList.contains("confirm-input")) {
        textToRead = "Confirm password input field";
      }
      else if (activeElement.classList.contains("signup-btn")) {
        textToRead = "Sign Up button. Press Enter to submit.";
      }
      else if (activeElement.classList.contains("mic-btn")) {
        textToRead = "Microphone button. Press Enter to activate voice commands.";
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
        else if (!activeElement?.classList?.contains("signup-btn")) {
          handleSignup(e);
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
  }, [firstName, lastName, email, phone_number]);

  const executeCommand = async (command) => {
    console.log("Command:", command);

    if (command === "mic" || command === "microphone") {
      startVoice();
    }
    else if (command === "first name") {
      document.querySelector(".firstname-input")?.focus();
      speak("First name field focused");
    }
    else if (command === "last name") {
      document.querySelector(".lastname-input")?.focus();
      speak("Last name field focused");
    }
    else if (command === "email") {
      document.querySelector(".email-input")?.focus();
      speak("Email field focused");
    }
    else if (command === "phone" || command === "phone number") {
      document.querySelector(".phone-input")?.focus();
      speak("Phone number field focused");
    }
    else if (command === "password") {
      document.querySelector(".password-input")?.focus();
      speak("Password field focused");
    }
    else if (command === "confirm" || command === "confirm password") {
      document.querySelector(".confirm-input")?.focus();
      speak("Confirm password field focused");
    }
    else if (command === "signup" || command === "sign up") {
      if (firstName && lastName && email && password && confirmPassword) {
        await handleSignup(new Event('submit'));
      } else {
        speak("Please fill all required fields");
      }
    }
    else if (command === "help") {
      speak("Commands: mic, first name, last name, email, phone, password, confirm, signup, close");
    }
    else if (command.startsWith("first name")) {
      const value = command.replace("first name", "").trim();
      if (value) setFirstName(value);
    }
    else if (command.startsWith("last name")) {
      const value = command.replace("last name", "").trim();
      if (value) setLastName(value);
    }
    else if (command.startsWith("email")) {
      const value = command.replace("email", "").trim();
      if (value) setEmail(value);
    }
    else if (command.startsWith("phone")) {
      const value = command.replace("phone", "").trim();
      if (value) setPhone(value);
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
      speak("Listening. Say a command like first name, email, or signup");
    };

    recognition.onresult = async (event) => {
      const command = event.results[0][0].transcript.toLowerCase().trim();
      await executeCommand(command);
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

  const clearForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSignup = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (password !== confirmPassword) {
      speak("Passwords do not match");
      return alert("Passwords do not match!");
    }
    if (password.length < 6) {
      speak("Password must be at least 6 characters");
      return alert("Password must be at least 6 characters.");
    }

    setLoading(true);
    speak("Creating your account");

    try {
      const cleanEmail = email.trim().toLowerCase();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
      });

      if (authError) throw authError;

      if (authData.user) {
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

        await supabase.auth.signOut();

        speak("Registration successful");
        alert("Registration Successful!");
        clearForm();
        navigate('/');
      }
    } catch (error) {
      speak("Error: " + error.message);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-[#FAF9F6] border border-[#E5E1DA] p-2.5 rounded-lg outline-none focus:border-[#D4AF37] text-slate-800 text-xs transition-all placeholder:text-slate-300";
  const labelClass = "text-[9px] font-bold text-slate-700 uppercase tracking-widest mb-1 block";

  return (
    <div className="relative bg-white p-6 rounded-2xl w-full max-w-sm mx-auto shadow-2xl border border-slate-50">
      {focusedElement && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-4 py-2 rounded-full z-50 text-sm">
          <Volume2 size={14} className="inline mr-2" />
          {focusedElement}
        </div>
      )}

      {isListening && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#D4AF37] text-black px-5 py-2 rounded-full z-50 flex items-center gap-2 shadow-lg">
          <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
          <Mic size={14} />
          <span className="text-xs font-bold">Say a command...</span>
        </div>
      )}

      <div className="absolute -top-12 right-0">
        <button 
          onClick={startVoice}
          className="mic-btn p-3 bg-[#D4AF37] rounded-full hover:bg-[#c4a137] transition-all shadow-lg"
          tabIndex={0}
          aria-label="Microphone button"
        >
          <Mic size={18} className="text-white" />
        </button>
      </div>

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
              className={`${inputClass} firstname-input`}
              tabIndex={0}
              aria-label="First name input"
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
              className={`${inputClass} lastname-input`}
              tabIndex={0}
              aria-label="Last name input"
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
            className={`${inputClass} email-input`}
            tabIndex={0}
            aria-label="Email input"
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
            className={`${inputClass} phone-input`}
            tabIndex={0}
            aria-label="Phone number input"
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
              className={`${inputClass} password-input`}
              tabIndex={0}
              aria-label="Password input"
            />
          </div>
          <div>
            <label className={labelClass}>Confirm</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${inputClass} confirm-input`}
              tabIndex={0}
              aria-label="Confirm password input"
            />
          </div>
        </div>

        <div className="text-[8px] text-slate-400 font-medium text-right">
          {password.length}/6 characters
        </div>

        <button
          type="submit"
          disabled={loading}
          className="signup-btn w-full bg-[#D4AF37] hover:bg-black hover:text-white text-white py-3 rounded-xl font-bold text-[11px] mt-4 transition-all active:scale-[0.96] disabled:opacity-50 shadow-md uppercase tracking-widest"
          tabIndex={0}
          aria-label="Sign Up button"
        >
          {loading ? "PROCESSING..." : "SIGN UP"}
        </button>
      </form>

      <div className="mt-4 text-center text-[8px] text-gray-400">
        <p>Press TAB to navigate, ENTER to select</p>
        <p>Say "help" for voice commands</p>
      </div>
    </div>
  );
};

export default SignupForm;