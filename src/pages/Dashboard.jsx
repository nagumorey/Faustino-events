import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  ArrowRight,
  X,
  Clock,
  Mic,
  Volume2,
  Keyboard,
  FileText,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";

import ClientPayment from "../components/ClientPayments";
import ClientProfile from "../components/ClientProfile";
import BookingReceipt from "../components/BookingReceipts";

const ClientDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [profileData, setProfileData] = useState(null);
  const [eventPackages, setEventPackages] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [myBookings, setMyBookings] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [paymentModal, setPaymentModal] = useState({
    open: false,
    booking: null,
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

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
      if (activeElement.classList.contains("mic-button")) {
        textToRead = "Microphone button. Press Enter to activate voice commands.";
      }
      else if (activeElement.classList.contains("profile-button")) {
        const name = profileData ? `${profileData.first_name} ${profileData.last_name}` : "Profile";
        textToRead = `${name} profile button. Press Enter to open your profile.`;
      }
      else if (activeElement.classList.contains("package-card")) {
        const title = activeElement.querySelector(".package-title")?.innerText;
        const price = activeElement.querySelector(".package-price")?.innerText;
        textToRead = `${title}, ${price}. Press Enter to view details.`;
      }
      else if (activeElement.classList.contains("booking-card")) {
        const status = activeElement.querySelector(".booking-status")?.innerText;
        const date = activeElement.querySelector(".booking-date")?.innerText;
        textToRead = `Booking ${status}, date ${date}. Press Enter for options.`;
      }
      else if (activeElement.classList.contains("view-receipt-btn")) {
        textToRead = "View Receipt button. Press Enter to see full receipt.";
      }
      else if (activeElement.classList.contains("cancel-booking-btn")) {
        textToRead = "Cancel Booking button. Press Enter to cancel this booking.";
      }
      else if (activeElement.getAttribute("aria-label")) {
        textToRead = activeElement.getAttribute("aria-label");
      }
      else if (activeElement.tagName === "BUTTON") {
        textToRead = activeElement.innerText || "Button";
      }
      else if (activeElement.tagName === "INPUT") {
        textToRead = activeElement.getAttribute("placeholder") || "Input field";
      }
      else if (activeElement.tagName === "A") {
        textToRead = activeElement.innerText || "Link";
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
  }, [isProfileModalOpen, isModalOpen, myBookings, profileData]);

  const loadUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: clientData } = await supabase
      .from("clients")
      .select("*")
      .eq("email", session.user.email)
      .maybeSingle();

    if (clientData) {
      setProfileData(clientData);
    }

    const { data: bookingData } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", session.user.id)
      .order("booking_id", { ascending: false });

    setMyBookings(bookingData || []);
  };

  const fetchEvents = async () => {
    try {
      const { data: events, error } = await supabase
        .from("events")
        .select(`
          *,
          event_images (
            image_id,
            image_url,
            is_cover,
            display_order
          )
        `)
        .eq("event_status", "Available")
        .order("event_id", { ascending: true });
      
      if (error) throw error;
      
      if (events && events.length > 0) {
        const formattedEvents = events.map(event => {
          let coverImage = null;
          let allImages = [];
          
          if (event.event_images && event.event_images.length > 0) {
            allImages = event.event_images.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
            
            const coverImg = allImages.find(img => img.is_cover === true);
            if (coverImg) {
              coverImage = coverImg.image_url;
            } else {
              coverImage = allImages[0]?.image_url;
            }
          }
          
          return {
            id: event.event_id,
            title: event.event_name,
            price: `₱${Number(event.amount_per_pax).toLocaleString()}.00`,
            price_raw: Number(event.amount_per_pax),
            image: coverImage,
            all_images: allImages,
            details: event.event_description || `${event.event_name}`,
            ariaLabel: `${event.event_name} package, price ${event.amount_per_pax} pesos`
          };
        });
        setEventPackages(formattedEvents);
      } else {
        setEventPackages([]);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      setEventPackages([]);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [refreshTrigger]);

  useEffect(() => {
    let isMounted = true;

    const verifyAndFetch = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          setError(sessionError.message);
          setLoading(false);
          return;
        }

        if (!session) {
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        const { data: adminData, error: adminError } = await supabase
          .from("Admins")
          .select("admin_id")
          .eq("admin_id", session.user.id)
          .maybeSingle();

        if (adminError) {
          console.error("Admin check error:", adminError);
        }

        if (isMounted) {
          if (adminData) {
            navigate("/AdminDashboard", { replace: true });
          } else {
            setUser(session.user);
            await loadUserData();
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("FATAL ERROR:", error);
        setError(error.message);
        if (isMounted) setLoading(false);
      }
    };

    verifyAndFetch();

    return () => {
      isMounted = false;
    };
  }, [navigate, refreshTrigger]);

  const executeCommand = (command) => {
    console.log("Voice command detected:", command);
    const lowerCommand = command.toLowerCase().trim();

    if (lowerCommand === "mic" || lowerCommand === "microphone" || lowerCommand === "voice" || lowerCommand === "start listening") {
      startVoice();
    }
    else if (lowerCommand === "profile" || lowerCommand === "my profile" || lowerCommand === "open profile" || lowerCommand === "view profile" || lowerCommand === "show profile") {
      setIsProfileModalOpen(true);
      speak("Opening your profile");
    }
    else if (lowerCommand === "packages" || lowerCommand === "view packages" || lowerCommand === "show packages" || lowerCommand === "see packages" || lowerCommand === "our packages" || lowerCommand === "check packages" || lowerCommand === "browse packages") {
      const packagesSection = document.querySelector("section");
      if (packagesSection) {
        packagesSection.scrollIntoView({ behavior: "smooth", block: "start" });
        speak(`Showing ${eventPackages.length} available packages`);
      } else {
        speak("Packages section not found");
      }
    }
    else if (lowerCommand === "my bookings" || lowerCommand === "bookings" || lowerCommand === "my reservations" || lowerCommand === "reservations" || lowerCommand === "view bookings" || lowerCommand === "show bookings" || lowerCommand === "see bookings") {
      const element = document.getElementById("my-bookings-section");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        speak(`You have ${myBookings.length} bookings. Scrolling to your bookings section`);
      } else {
        speak("Bookings section not found");
      }
    }
    else if (lowerCommand === "pay now" || lowerCommand === "make payment" || lowerCommand === "pay" || lowerCommand === "payment" || lowerCommand === "settle payment") {
      if (myBookings.length > 0) {
        setPaymentModal({ open: true, booking: myBookings[0] });
        speak("Opening payment window");
      } else {
        speak("You have no bookings to pay");
      }
    }
    else if (lowerCommand === "receipt" || lowerCommand === "view receipt" || lowerCommand === "my receipt" || lowerCommand === "show receipt" || lowerCommand === "see receipt") {
      if (myBookings.length > 0) {
        setSelectedBooking(myBookings[0]);
        setShowReceiptModal(true);
        speak("Opening your receipt");
      } else {
        speak("No receipts found");
      }
    }
    else if (lowerCommand === "book this" || lowerCommand === "reserve this" || lowerCommand === "book now" || lowerCommand === "reserve now") {
      if (selectedPackage) {
        speak(`Booking ${selectedPackage.title}. Proceeding to reservation`);
        handleBooking(selectedPackage);
      } else {
        speak("Please select a package first by saying its name or clicking on it");
      }
    }
    else if (lowerCommand === "scroll up" || lowerCommand === "up" || lowerCommand === "go up") {
      window.scrollBy({ top: -300, behavior: "smooth" });
      speak("Scrolling up");
    }
    else if (lowerCommand === "scroll down" || lowerCommand === "down" || lowerCommand === "go down") {
      window.scrollBy({ top: 300, behavior: "smooth" });
      speak("Scrolling down");
    }
    else if (lowerCommand === "scroll to top" || lowerCommand === "top" || lowerCommand === "go to top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      speak("Scrolling to top");
    }
    else if (lowerCommand === "scroll to bottom" || lowerCommand === "bottom" || lowerCommand === "go to bottom") {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      speak("Scrolling to bottom");
    }
    else if (lowerCommand === "tab" || lowerCommand === "next" || lowerCommand === "next button") {
      const focusable = document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      let currentIndex = Array.from(focusable).findIndex(el => el === document.activeElement);
      let nextIndex = (currentIndex + 1) % focusable.length;
      focusable[nextIndex].focus();
      speak("Moved to next element");
    }
    else if (lowerCommand === "previous" || lowerCommand === "prev" || lowerCommand === "back tab") {
      const focusable = document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      let currentIndex = Array.from(focusable).findIndex(el => el === document.activeElement);
      let prevIndex = (currentIndex - 1 + focusable.length) % focusable.length;
      focusable[prevIndex].focus();
      speak("Moved to previous element");
    }
    else if (lowerCommand === "read" || lowerCommand === "read this" || lowerCommand === "speak" || lowerCommand === "say it") {
      readFocusedElement();
    }
    else if (lowerCommand === "close" || lowerCommand === "close modal" || lowerCommand === "cancel" || lowerCommand === "exit") {
      if (isProfileModalOpen) {
        setIsProfileModalOpen(false);
        speak("Profile closed");
      }
      else if (isModalOpen) {
        setIsModalOpen(false);
        setCurrentImageIndex(0);
        speak("Package details closed");
      }
      else if (paymentModal.open) {
        setPaymentModal({ open: false, booking: null });
        speak("Payment closed");
      }
      else if (showReceiptModal) {
        setShowReceiptModal(false);
        setSelectedBooking(null);
        speak("Receipt closed");
      }
      else {
        speak("Nothing to close");
      }
    }
    else if (lowerCommand === "logout" || lowerCommand === "sign out" || lowerCommand === "log out") {
      speak("Goodbye. Signing you out");
      setTimeout(() => {
        supabase.auth.signOut();
        navigate("/");
      }, 300);
    }
    else if (lowerCommand === "help" || lowerCommand === "commands" || lowerCommand === "what can I say") {
      speak("Available commands: profile, packages, my bookings, pay now, receipt, book this, scroll up, scroll down, scroll to top, scroll to bottom, tab, previous, read, close, logout. You can also say any package name to view details.");
    }
    else {
      const foundPackage = eventPackages.find(pkg => 
        pkg.title.toLowerCase().includes(lowerCommand) || 
        lowerCommand.includes(pkg.title.toLowerCase())
      );
      
      if (foundPackage) {
        setSelectedPackage(foundPackage);
        setCurrentImageIndex(0);
        setIsModalOpen(true);
        speak(`${foundPackage.title}, ${foundPackage.price}. Say book this to reserve`);
      } else {
        speak("Command not recognized. Say help for list of commands");
      }
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
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 5;

    recognition.onstart = () => {
      setIsListening(true);
      speak("Listening for commands");
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
        speak("I didn't hear anything. Please try again");
      } else if (event.error === 'not-allowed') {
        speak("Microphone access denied. Please allow microphone access");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  const handleBooking = (pkg) => {
    if (!user) {
      navigate("/");
    } else {
      navigate("/booking", {
        state: {
          selectedType: pkg.title,
          price: pkg.price,
          price_raw: pkg.price_raw,
          event_id: pkg.id,
          party_package: pkg.title
        },
      });
    }
  };

  const handleProfileClose = async (updatedData) => {
    console.log("Profile closed with data:", updatedData);
    setIsProfileModalOpen(false);
    
    if (updatedData) {
      setProfileData(updatedData);
    }
    
    await loadUserData();
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCancelBooking = async (booking) => {
    if (!window.confirm(`Are you sure you want to cancel your booking on ${new Date(booking.event_date).toLocaleDateString()}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const hasPayment = booking.amount_paid > 0;
      
      const { error } = await supabase
        .from("bookings")
        .update({ 
          booking_status: "Cancelled",
          payment_status: hasPayment ? "Refund Pending" : "Cancelled"
        })
        .eq("booking_id", booking.booking_id);
      
      if (error) throw error;
      
      if (hasPayment) {
        await supabase.from("notifications").insert([
          {
            booking_id: booking.booking_id,
            is_read: false,
            message: `REFUND REQUEST: Client cancelled booking #${booking.booking_id}. Amount paid: ₱${booking.amount_paid.toLocaleString()}. Please process refund.`,
          }
        ]);
        alert("Booking cancelled. Refund request has been sent to admin.");
      } else {
        alert("Booking cancelled successfully.");
      }
      
      await loadUserData();
      setRefreshTrigger(prev => prev + 1);
      
    } catch (error) {
      console.error("Cancel error:", error);
      alert("Error cancelling booking: " + error.message);
    }
  };

  const nextImage = () => {
    if (selectedPackage && selectedPackage.all_images && selectedPackage.all_images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % selectedPackage.all_images.length);
    }
  };

  const prevImage = () => {
    if (selectedPackage && selectedPackage.all_images && selectedPackage.all_images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + selectedPackage.all_images.length) % selectedPackage.all_images.length);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mb-4"></div>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">Loading...</p>
        {error && <p className="text-red-500 text-sm mt-4">Error: {error}</p>}
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex flex-col items-center justify-center">
        <p className="text-red-500 mb-4">Error: {error}</p>
        <button onClick={() => window.location.reload()} className="bg-yellow-500 text-black px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
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
          <span className="text-xs font-bold">Listening for commands...</span>
        </div>
      )}

      <div className="fixed top-20 right-4 bg-black/60 backdrop-blur-xl text-white p-3 rounded-xl z-40 text-xs max-w-xs border border-yellow-500/20">
        <Keyboard size={14} className="inline mr-1 text-yellow-500" />
        <span className="font-bold">Accessibility:</span>
        <p className="mt-1">Press TAB to navigate, ENTER to select</p>
        <p>Press MIC button or say "mic" for voice commands</p>
        <p>Say "help" for all voice commands</p>
      </div>

      <nav className="bg-black/40 backdrop-blur-xl border-b border-yellow-500/20 px-6 py-5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-xl font-black tracking-tighter flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")} tabIndex={0} aria-label="Faustino Events, home">
            <div className="w-1.5 h-6 bg-yellow-500"></div>
            <span className="text-white">FAUSTINO</span>
            <span className="text-yellow-500 italic text-lg">EVENTS</span>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden md:flex items-center">
                  <span className="text-xs font-bold text-gray-300">
                    {profileData ? `${profileData.first_name} ${profileData.last_name}` : user.email}
                  </span>
                </div>
                <button onClick={() => setIsProfileModalOpen(true)} className="profile-button px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-yellow-500 hover:text-black text-[10px] font-black uppercase transition-all" tabIndex={0} aria-label="Profile button">Profile</button>
                <button onClick={startVoice} className="mic-button p-2.5 rounded-full transition-all bg-white/10 backdrop-blur-sm text-yellow-500 hover:bg-yellow-500 hover:text-black" tabIndex={0} aria-label="Microphone button"><Mic size={18} /></button>
                <button onClick={handleLogout} className="p-2.5 bg-white/10 backdrop-blur-sm hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-full transition-all" tabIndex={0} aria-label="Logout button"><LogOut size={18} /></button>
              </>
            ) : (
              <button onClick={() => navigate("/")} className="text-[10px] font-black bg-yellow-500 text-black px-8 py-3 rounded-full uppercase tracking-widest hover:bg-yellow-400 transition-all" tabIndex={0} aria-label="Sign in button">Sign In</button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        <section className="mb-24">
          <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-16">
            <div>
              <div className="inline-flex items-center gap-2 bg-yellow-500/10 backdrop-blur-sm px-4 py-2 rounded-full border border-yellow-500/20 mb-4">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-yellow-500">Luxury Collection</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] text-white">
                Premium <br />
                <span className="bg-gradient-to-r from-yellow-500 to-yellow-400 bg-clip-text text-transparent">Packages</span>
              </h1>
              <p className="text-gray-400 text-sm mt-6 max-w-md">Experience the finest event planning with our exclusive collection of luxury packages tailored to your special day.</p>
            </div>
            <div className="relative w-full md:w-80">
              <input type="text" placeholder="Find an event..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-full py-4 pl-6 pr-6 text-sm text-white placeholder:text-gray-400 font-medium outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all" tabIndex={0} aria-label="Search events input" />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {eventPackages.length > 0 ? (
            eventPackages.filter((pkg) => pkg.title.toLowerCase().includes(searchQuery.toLowerCase())).map((pkg) => (
              <div key={pkg.id} className="package-card bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 flex flex-col shadow-lg cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-yellow-500/50 hover:shadow-xl hover:shadow-yellow-500/10" tabIndex={0} aria-label={pkg.ariaLabel} onClick={() => { setSelectedPackage(pkg); setCurrentImageIndex(0); setIsModalOpen(true); }} onKeyDown={(e) => { if (e.key === "Enter") { setSelectedPackage(pkg); setCurrentImageIndex(0); setIsModalOpen(true); } }}>
                <div className="h-64 w-full rounded-xl mb-6 bg-white/5 flex items-center justify-center overflow-hidden">
                  {pkg.image ? <img src={pkg.image} alt={pkg.title} className="h-full w-full object-cover" /> : <div className="text-center text-gray-400 text-[10px] font-bold uppercase p-4">📷 No Image Available</div>}
                </div>
                <h3 className="package-title text-xl font-black uppercase mb-3 text-white group-hover:text-yellow-500 transition-colors">{pkg.title}</h3>
                <p className="text-gray-400 text-[10px] font-medium uppercase mb-8 flex-1">{pkg.details}</p>
                <div className="flex items-center justify-between pt-6 border-t border-white/10">
                  <span className="package-price text-yellow-500 font-black text-xl">{pkg.price}</span>
                  <button onClick={() => { setSelectedPackage(pkg); setCurrentImageIndex(0); setIsModalOpen(true); }} className="p-3 bg-yellow-500 text-black rounded-full hover:bg-yellow-400 transition-all" aria-label={`View ${pkg.title} details`}><ArrowRight size={18} /></button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-20"><p className="text-gray-400 text-sm">No available packages at the moment.</p></div>
          )}
        </div>

        <section id="my-bookings-section" className="mt-32 scroll-mt-24">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 backdrop-blur-sm px-4 py-2 rounded-full border border-yellow-500/20 mb-4">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-yellow-500">Your Reservations</span>
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white">MY <span className="text-yellow-500">BOOKINGS</span></h2>
            <div className="w-20 h-0.5 bg-gradient-to-r from-yellow-500 to-transparent mt-4"></div>
          </div>

          {user && myBookings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myBookings.map((item) => {
                const isCancellable = item.booking_status !== "Cancelled" && item.booking_status !== "Completed";
                return (
                  <div key={item.booking_id} className="booking-card bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20 shadow-lg hover:shadow-xl hover:border-yellow-500/30 transition-all duration-300">
                    <div className={`booking-status px-5 py-2 text-[8px] font-black uppercase rounded-full inline-block mb-4 ${
                      item.booking_status === "Approved" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                      item.booking_status === "Cancelled" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                      item.booking_status === "Pending" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : "bg-orange-500/20 text-orange-400 border border-orange-500/30"}`}>
                      {item.booking_status || "PENDING"}
                    </div>
                    <h4 className="booking-date text-lg font-black uppercase text-white">{new Date(item.event_date).toLocaleDateString()}</h4>
                    <div className="flex items-center gap-4 mt-4"><Clock size={14} className="text-gray-400" /><span className="text-[10px] font-bold uppercase text-gray-300">Appt: {item.appointment_time} | Event: {item.start_time} - {item.end_time}</span></div>
                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                      <div><p className="text-[9px] text-gray-400">Total Amount</p><p className="font-black text-yellow-500">₱{item.amount?.toLocaleString() || 0}</p></div>
                      <div className="text-right"><p className="text-[9px] text-gray-400">Payment Status</p><p className={`font-bold text-xs ${item.payment_status === "Paid" ? "text-green-400" : item.payment_status === "Partial" ? "text-yellow-400" : item.payment_status === "Refund Pending" ? "text-orange-400" : item.payment_status === "Refunded" ? "text-blue-400" : "text-red-400"}`}>{item.payment_status || "Pending"}</p></div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button onClick={() => { setSelectedBooking(item); setShowReceiptModal(true); }} className="view-receipt-btn flex-1 bg-yellow-500 text-black py-2 rounded-full text-[9px] font-black uppercase tracking-wider hover:bg-yellow-400 transition-all flex items-center justify-center gap-1"><FileText size={12} /> View Receipt</button>
                      {item.payment_status !== "Paid" && item.payment_status !== "Refunded" && item.booking_status !== "Cancelled" && (<button onClick={() => setPaymentModal({ open: true, booking: item })} className="flex-1 bg-white/20 text-white py-2 rounded-full text-[9px] font-black uppercase tracking-wider hover:bg-yellow-500 hover:text-black transition-all">Pay Now</button>)}
                      {isCancellable && item.booking_status !== "Cancelled" && (<button onClick={() => handleCancelBooking(item)} className="cancel-booking-btn flex-1 bg-red-500/20 text-red-400 py-2 rounded-full text-[9px] font-black uppercase tracking-wider hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-1 border border-red-500/30"><Trash2 size={12} /> Cancel</button>)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-sm p-16 rounded-2xl border border-white/20 text-center"><p className="text-gray-400">No bookings yet. Start planning your dream event!</p></div>
          )}
        </section>
      </main>

      {isProfileModalOpen && (<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"><ClientProfile onClose={handleProfileClose} /></div>)}
      {showReceiptModal && selectedBooking && (<div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto"><BookingReceipt booking={selectedBooking} onClose={() => { setShowReceiptModal(false); setSelectedBooking(null); }} /></div>)}
      {isModalOpen && selectedPackage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => { setIsModalOpen(false); setCurrentImageIndex(0); }}></div>
          <div className="bg-[#1a1a2e]/90 backdrop-blur-xl rounded-2xl w-full max-w-4xl relative z-10 p-10 max-h-[90vh] overflow-y-auto border border-yellow-500/30 shadow-2xl">
            <button onClick={() => { setIsModalOpen(false); setCurrentImageIndex(0); }} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-yellow-500 hover:text-black transition-all z-20 text-gray-400"><X size={18} /></button>
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase text-yellow-500 mb-3">GALLERY</h3>
              {selectedPackage.all_images && selectedPackage.all_images.length > 0 ? (
                <div className="relative">
                  <div className="relative h-96 bg-black/30 rounded-xl overflow-hidden">
                    <img src={selectedPackage.all_images[currentImageIndex]?.image_url} alt={`${selectedPackage.title}`} className="w-full h-full object-contain" />
                    {selectedPackage.all_images.length > 1 && (<><button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-yellow-500 text-white hover:text-black p-2 rounded-full transition-all"><ChevronLeft size={24} /></button><button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-yellow-500 text-white hover:text-black p-2 rounded-full transition-all"><ChevronRight size={24} /></button></>)}
                  </div>
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-2 justify-center">{selectedPackage.all_images.map((img, idx) => (<button key={idx} onClick={() => setCurrentImageIndex(idx)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${currentImageIndex === idx ? 'border-yellow-500' : 'border-white/20 hover:border-white/40'}`}><img src={img.image_url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" /></button>))}</div>
                  <p className="text-[10px] text-gray-400 mt-2 text-center">{currentImageIndex + 1} of {selectedPackage.all_images.length} images</p>
                </div>
              ) : (<div className="h-96 bg-white/5 rounded-xl flex items-center justify-center"><div className="text-center text-gray-400 text-sm font-bold uppercase p-4">📷 No Images Available for this Package</div></div>)}
            </div>
            <h2 className="text-3xl font-black uppercase mb-4 text-white">{selectedPackage.title}</h2>
            <p className="text-gray-300 mb-6">{selectedPackage.details}</p>
            <div className="flex items-center justify-between mb-8 p-6 bg-white/5 rounded-xl border border-white/10">
              <div><p className="text-[10px] text-gray-400 uppercase font-bold">Price per Pax</p><p className="text-2xl font-black text-yellow-500">{selectedPackage.price}</p></div>
              <div className="text-right"><p className="text-[10px] text-gray-400 uppercase font-bold">Minimum Pax</p><p className="text-xl font-black text-white">50 Guests</p></div>
            </div>
            <button onClick={() => handleBooking(selectedPackage)} className="w-full bg-yellow-500 text-black py-4 rounded-full font-black uppercase tracking-wide hover:bg-yellow-400 transition-all">Reserve Package</button>
          </div>
        </div>
      )}
      {paymentModal.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setPaymentModal({ open: false, booking: null })}></div>
          <div className="relative z-10 w-full max-w-md bg-[#1a1a2e]/90 backdrop-blur-xl rounded-2xl p-6 border border-yellow-500/30 shadow-2xl">
            <ClientPayment bookingId={paymentModal.booking.booking_id} totalAmount={paymentModal.booking.amount} />
            <button onClick={() => setPaymentModal({ open: false, booking: null })} className="mt-4 w-full text-[10px] font-black uppercase text-gray-400 hover:text-white transition-colors">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;