import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const ClientProfile = ({ onClose, onProfileUpdate }) => {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ first_name: "", last_name: "", phone_number: "" });
  const [voiceFeedback, setVoiceFeedback] = useState("");

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setVoiceFeedback(text);
    setTimeout(() => setVoiceFeedback(""), 2000);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();
        
        if (data) {
          setProfile(data);
          setFormData({ 
            first_name: data.first_name || "", 
            last_name: data.last_name || "", 
            phone_number: data.phone_number || "" 
          });
        }
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isEditing) {
        const closeButton = document.querySelector('.close-profile-btn');
        if (closeButton) {
          closeButton.focus();
          speak("Profile opened. Close button focused. Press Tab to navigate, Enter to close.");
        }
      } else {
        const firstNameInput = document.querySelector('.first-name-input');
        if (firstNameInput) {
          firstNameInput.focus();
          speak("Edit mode. First name input focused. Type your first name, then press Tab to continue.");
        }
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, [isEditing]);

  const handleSave = async () => {
    setIsSaving(true);
    speak("Saving profile changes");
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('clients')
      .update({
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number
      })
      .eq('email', user.email);
    
    if (!error) {
      setProfile({ ...profile, ...formData });
      setIsEditing(false);
      
      if (onProfileUpdate) {
        onProfileUpdate(formData);
      }
      
      speak(`Profile saved successfully. Name: ${formData.first_name} ${formData.last_name}`);
    } else {
      console.error("Save error:", error);
      speak("Error saving profile");
      alert("Error saving: " + error.message);
    }
    setIsSaving(false);
  };

  const handleChangePassword = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      speak("Sending password reset link to your email");
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (!error) {
        speak("Password reset link sent to your email");
        alert("Password reset link sent to your email");
      } else {
        speak("Error sending reset link");
        alert("Error sending reset link");
      }
    }
  };

  const readFocusedElement = () => {
    const activeElement = document.activeElement;
    let textToRead = "";

    if (activeElement) {
      if (activeElement.classList.contains("edit-profile-btn")) {
        textToRead = "Edit Profile button. Press Enter to edit your information.";
      }
      else if (activeElement.classList.contains("save-profile-btn")) {
        textToRead = "Save Changes button. Press Enter to save your profile.";
      }
      else if (activeElement.classList.contains("cancel-btn")) {
        textToRead = "Cancel button. Press Enter to cancel editing.";
      }
      else if (activeElement.classList.contains("close-profile-btn")) {
        textToRead = "Close button. Press Enter to close profile.";
      }
      else if (activeElement.classList.contains("change-password-btn")) {
        textToRead = "Change Password button. Press Enter to reset your password.";
      }
      else if (activeElement.classList.contains("first-name-input")) {
        textToRead = `First name input. Current value: ${formData.first_name || "empty"}`;
      }
      else if (activeElement.classList.contains("last-name-input")) {
        textToRead = `Last name input. Current value: ${formData.last_name || "empty"}`;
      }
      else if (activeElement.classList.contains("phone-input")) {
        textToRead = `Phone number input. Current value: ${formData.phone_number || "empty"}`;
      }
      
      if (textToRead) {
        speak(textToRead);
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditing, formData]);

  if (!profile) {
    return (
      <div className="bg-[#1a1a2e]/90 backdrop-blur-xl rounded-2xl w-full max-w-md p-10 text-center border border-yellow-500/30">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
        <p className="mt-4 text-sm text-gray-400">Loading profile...</p>
      </div>
    );
  }

  const handleClose = () => {
    console.log("Close function called");
    if (onClose) {
      onClose(formData);
    }
  };

  return (
    <div className="bg-[#1a1a2e]/90 backdrop-blur-xl rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-yellow-500/30">
      {voiceFeedback && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-4 py-2 rounded-full z-50 text-sm border border-yellow-500/30">
          {voiceFeedback}
        </div>
      )}

      <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 text-black">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-wider">PROFILE</h2>
            <p className="text-xs opacity-90 mt-1">Manage your account</p>
          </div>
          <button 
            onClick={handleClose}
            className="close-profile-btn p-1 hover:bg-black/20 rounded-full transition-all"
            aria-label="Close profile. Press Enter to close."
            tabIndex={0}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-6">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">First Name</label>
              <input 
                type="text"
                value={formData.first_name} 
                onChange={(e) => setFormData({...formData, first_name: e.target.value})} 
                className="first-name-input w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white font-bold outline-none focus:border-yellow-500 transition-all placeholder:text-gray-500"
                placeholder="Enter first name"
                tabIndex={0}
                aria-label="First name input field"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Last Name</label>
              <input 
                type="text"
                value={formData.last_name} 
                onChange={(e) => setFormData({...formData, last_name: e.target.value})} 
                className="last-name-input w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white font-bold outline-none focus:border-yellow-500 transition-all placeholder:text-gray-500"
                placeholder="Enter last name"
                tabIndex={0}
                aria-label="Last name input field"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Phone Number</label>
              <input 
                type="tel"
                value={formData.phone_number} 
                onChange={(e) => setFormData({...formData, phone_number: e.target.value})} 
                className="phone-input w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white font-bold outline-none focus:border-yellow-500 transition-all placeholder:text-gray-500"
                placeholder="Enter phone number"
                tabIndex={0}
                aria-label="Phone number input field"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Email</label>
              <div className="bg-white/10 border border-white/20 rounded-xl p-3">
                <p className="font-bold text-sm text-gray-300">{profile.email}</p>
              </div>
              <p className="text-[8px] text-gray-500 mt-1">Email cannot be changed</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-yellow-500/10 to-transparent p-4 rounded-xl border border-yellow-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center border border-yellow-500/30">
                  <span className="text-xl font-black text-yellow-500">
                    {formData.first_name?.charAt(0)}{formData.last_name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">{formData.first_name} {formData.last_name}</h3>
                  <p className="text-xs text-gray-400">Client</p>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400">EMAIL ADDRESS</p>
                  <p className="font-bold text-sm text-white">{profile.email}</p>
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div className="border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400">FULL NAME</p>
                  <p className="font-bold text-sm text-white">{formData.first_name} {formData.last_name}</p>
                </div>
              </div>
            </div>

            {/* Phone Number */}
            <div className="border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase text-gray-400">PHONE NUMBER</p>
                  <p className="font-bold text-sm text-white">{formData.phone_number || "Not provided"}</p>
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase text-gray-400">PASSWORD</p>
                  <p className="font-bold text-sm text-white">********</p>
                </div>
                <button 
                  onClick={handleChangePassword}
                  className="change-password-btn text-[9px] text-yellow-500 font-bold uppercase hover:text-yellow-400"
                  tabIndex={0}
                  aria-label="Change password button. Press Enter to reset your password."
                >
                  CHANGE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
          {isEditing ? (
            <>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="save-profile-btn flex-1 bg-yellow-500 text-black py-3 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-yellow-500/20"
                tabIndex={0}
                aria-label="Save changes button. Press Enter to save your profile."
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isSaving ? "Saving..." : "SAVE CHANGES"}
              </button>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setFormData({ 
                    first_name: profile.first_name || "", 
                    last_name: profile.last_name || "", 
                    phone_number: profile.phone_number || "" 
                  });
                  speak("Edit cancelled");
                }}
                className="cancel-btn flex-1 bg-white/10 text-gray-300 py-3 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-white/20 transition-all border border-white/20"
                tabIndex={0}
                aria-label="Cancel button. Press Enter to cancel editing."
              >
                CANCEL
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => {
                  setIsEditing(true);
                  speak("Edit mode enabled. First name input focused.");
                }} 
                className="edit-profile-btn flex-1 bg-yellow-500 text-black py-3 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20"
                tabIndex={0}
                aria-label="Edit profile button. Press Enter to edit your information."
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                EDIT PROFILE
              </button>
              <button 
                onClick={handleClose}
                className="close-profile-btn flex-1 bg-white/10 text-gray-300 py-3 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-white/20 transition-all border border-white/20"
                tabIndex={0}
                aria-label="Close profile button. Press Enter to close."
              >
                CLOSE
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientProfile;