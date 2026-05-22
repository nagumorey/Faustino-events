import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { LogOut, ArrowRight, Search, X, Clock, Mic } from "lucide-react";
import ClientPayment from "../components/ClientPayments";
import ClientProfile from "../components/ClientProfile";

import bapImg from "../assets/BAP.jpg";
import wedImg from "../assets/WED.jpg";
import venImg from "../assets/VEN.jpg";

const ClientDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [myBookings, setMyBookings] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [paymentModal, setPaymentModal] = useState({ open: false, booking: null });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tempProfile, setTempProfile] = useState({ first_name: "", last_name: "" });
  const [isListening, setIsListening] = useState(false);
  
  const recognitionRef = useRef(null);
  const navigate = useNavigate();

  const eventPackages = [
    { id: 1, title: "Baptismal Package", price: "₱1,500.00", image: bapImg, details: "Exclusive use of venue with elegant thematic design and full dining set-up." },
    { id: 2, title: "Wedding Package", price: "₱1,500.00", image: wedImg, details: "Grand wedding celebration with premium styling and red carpet entrance." },
    { id: 3, title: "Venue Rental", price: "₱450.00", image: venImg, details: "Flexible venue use for various events with full air-conditioning system." }
  ];

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    let isMounted = true;
    const verifyAndFetch = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (isMounted) { setUser(null); setLoading(false); }
          return;
        }
        const { data: adminData } = await supabase.from('Admins').select('admin_id').eq('admin_id', session.user.id).maybeSingle();
        if (isMounted) {
          if (adminData) { navigate("/AdminDashboard", { replace: true }); }
          else {
            setUser(session.user);
            const { data: bookingData } = await supabase.from('bookings').select('*').eq('user_id', session.user.id).order('booking_id', { ascending: false });
            const { data: clientData } = await supabase.from('clients').select('*').eq('email', session.user.email).maybeSingle();
            if (clientData) {
              setProfileData(clientData);
              setTempProfile({ first_name: clientData.first_name, last_name: clientData.last_name });
            }
            setMyBookings(bookingData || []);
            setLoading(false);
          }
        }
      } catch (error) { if (isMounted) setLoading(false); }
    };
    verifyAndFetch();
    return () => { isMounted = false; };
  }, [navigate]);

  const startVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speak("Browser not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      speak("Listening");
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      
      if (transcript.includes("thank you")) {
        speak("Command cancelled");
        setIsListening(false);
      } else if (transcript.includes("logout") || transcript.includes("sign out")) {
        speak("Logging out");
        handleLogout();
      } else if (transcript.includes("profile") || transcript.includes("account")) {
        speak("Opening profile");
        setIsProfileModalOpen(true);
      } else if (transcript.includes("booking") || transcript.includes("my bookings")) {
        speak("Showing my bookings");
        document.getElementById("my-bookings-section")?.scrollIntoView({ behavior: "smooth" });
      } else if (transcript.includes("close") || transcript.includes("exit") || transcript.includes("back") || transcript.includes("cancel")) {
        speak("Closing windows");
        setIsProfileModalOpen(false);
        setIsModalOpen(false);
        setPaymentModal({ open: false, booking: null });
      } else if (transcript.includes("baptismal")) {
        speak("Selected baptismal package");
        setSelectedPackage(eventPackages[0]);
        setIsModalOpen(true);
      } else if (transcript.includes("wedding")) {
        speak("Selected wedding package");
        setSelectedPackage(eventPackages[1]);
        setIsModalOpen(true);
      } else if (transcript.includes("venue")) {
        speak("Selected venue rental");
        setSelectedPackage(eventPackages[2]);
        setIsModalOpen(true);
      } else {
        speak("Command not recognized");
      }
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
  };

  const handleUpdateProfile = async () => {
    const { error } = await supabase.from('clients').update(tempProfile).eq('email', user.email);
    if (!error) {
      setProfileData({ ...profileData, ...tempProfile });
      setIsEditing(false);
      speak("Profile updated successfully");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  const handleBooking = (pkg) => {
    if (!user) navigate("/");
    else navigate("/booking", { state: { selectedType: pkg.title, price: pkg.price } });
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#B8860B] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-[#B8860B] font-black uppercase tracking-[0.3em] text-[10px]">Updating Dashboard...</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <nav className="bg-white/90 backdrop-blur-xl border-b border-slate-100 px-6 py-5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-xl font-black tracking-tighter flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-1.5 h-6 bg-[#B8860B]"></div>
            FAUSTINO <span className="text-[#B8860B] italic text-lg">EVENTS</span>
          </div>
          <div className="flex items-center gap-6">
            {user ? (
              <>
                <div className="flex items-center gap-3">
                  <ClientProfile onClick={() => setIsProfileModalOpen(true)} />
                  <span className="text-[10px] font-black uppercase text-slate-500">{user.email}</span>
                </div>
                <button aria-label="Voice command" onClick={startVoice} className={`p-2.5 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400 hover:bg-[#B8860B] hover:text-white'}`}>
                  <Mic size={18} />
                </button>
                <button onClick={handleLogout} className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all">
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <button onClick={() => navigate("/")} className="text-[10px] font-black bg-black text-white px-8 py-3 rounded-xl hover:bg-[#B8860B] transition-all uppercase tracking-widest">Sign In</button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <section className="mb-24">
          <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-16">
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9]">Premium <br/><span className="text-[#B8860B]">Packages</span></h1>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input type="text" placeholder="Find an event..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-[11px] font-bold tracking-widest outline-none shadow-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {eventPackages.filter((pkg) => pkg.title.toLowerCase().includes(searchQuery.toLowerCase())).map((pkg) => (
              <div key={pkg.id} className="bg-white rounded-[2rem] border border-slate-100 p-8 flex flex-col">
                <img src={pkg.image} alt={pkg.title} className="h-64 w-full object-cover rounded-2xl mb-6" />
                <h3 className="text-xl font-black uppercase mb-3">{pkg.title}</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase mb-8 flex-1">{pkg.details}</p>
                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <span className="text-[#B8860B] font-black text-xl">{pkg.price}</span>
                  <button onClick={() => { setSelectedPackage(pkg); setIsModalOpen(true); }} className="p-3 bg-black text-white rounded-xl hover:bg-[#B8860B] transition-all"><ArrowRight size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {user && myBookings.length > 0 && (
          <section id="my-bookings-section" className="mt-32">
            <h2 className="text-3xl font-black uppercase mb-12">My Bookings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myBookings.map((item) => (
                <div key={item.booking_id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative">
                  <div className={`absolute top-0 right-0 px-5 py-2 text-[8px] font-black uppercase ${item.booking_status === 'Approved' ? 'bg-green-500' : 'bg-orange-400'} text-white`}>
                    {item.booking_status}
                  </div>
                  <h4 className="text-lg font-black uppercase">{new Date(item.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h4>
                  <div className="flex items-center gap-4 mt-4">
                    <Clock size={14} className="text-slate-400" />
                    <span className="text-[10px] font-bold uppercase">{item.appointment_time} - {item.end_time}</span>
                  </div>
                  {item.payment_status === 'Unpaid' && (
                    <button onClick={() => setPaymentModal({ open: true, booking: item })} className="mt-4 text-[9px] font-black text-[#B8860B] hover:text-black uppercase">Pay Now</button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white p-10 rounded-[2rem] w-full max-w-md relative">
            <h2 className="text-3xl font-black uppercase mb-6">Account Details</h2>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase">First Name</label>
                <input disabled={!isEditing} value={tempProfile.first_name} onChange={(e) => setTempProfile({...tempProfile, first_name: e.target.value})} className="w-full bg-slate-50 p-2 rounded mt-1 font-bold" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase">Last Name</label>
                <input disabled={!isEditing} value={tempProfile.last_name} onChange={(e) => setTempProfile({...tempProfile, last_name: e.target.value})} className="w-full bg-slate-50 p-2 rounded mt-1 font-bold" />
              </div>
              <p className="pt-2"><strong>Email:</strong> {profileData?.email}</p>
            </div>
            <div className="flex gap-2 mt-8">
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="flex-1 bg-black text-white py-4 rounded-xl font-black uppercase">Edit</button>
              ) : (
                <button onClick={handleUpdateProfile} className="flex-1 bg-[#B8860B] text-white py-4 rounded-xl font-black uppercase">Save</button>
              )}
              <button onClick={() => {setIsProfileModalOpen(false); setIsEditing(false);}} className="flex-1 bg-slate-100 py-4 rounded-xl font-black uppercase">Close</button>
            </div>
          </div>
        </div>
      )}
      
      {isModalOpen && selectedPackage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl relative z-10 p-10">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 bg-black text-white rounded-full"><X size={18} /></button>
            <h2 className="text-3xl font-black uppercase mb-6">{selectedPackage.title}</h2>
            <button onClick={() => handleBooking(selectedPackage)} className="bg-black text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#B8860B]">Reserve Package</button>
          </div>
        </div>
      )}

      {paymentModal.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPaymentModal({ open: false, booking: null })}></div>
          <div className="relative z-10 w-full max-w-md bg-white rounded-3xl p-6">
            <ClientPayment bookingId={paymentModal.booking.booking_id} totalAmount={paymentModal.booking.amount} />
            <button onClick={() => setPaymentModal({ open: false, booking: null })} className="mt-4 w-full text-[10px] font-black text-slate-400 uppercase">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;