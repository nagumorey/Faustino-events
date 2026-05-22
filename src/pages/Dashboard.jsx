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
} from "lucide-react";

import ClientPayment from "../components/ClientPayments";
import ClientProfile from "../components/ClientProfile";

import bapImg from "../assets/BAP.jpg";
import wedImg from "../assets/WED.jpg";
import venImg from "../assets/VEN.jpg";

const ClientDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [profileData, setProfileData] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [myBookings, setMyBookings] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  const [paymentModal, setPaymentModal] = useState({
    open: false,
    booking: null,
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [focusedElement, setFocusedElement] = useState("");

  const recognitionRef = useRef(null);
  const navigate = useNavigate();

  const eventPackages = [
    {
      id: 1,
      title: "Baptismal Package",
      price: "₱1,500.00",
      image: bapImg,
      details:
        "Exclusive use of venue with elegant thematic design and full dining set-up.",
      ariaLabel: "Baptismal package, price 1500 pesos",
    },
    {
      id: 2,
      title: "Wedding Package",
      price: "₱1,500.00",
      image: wedImg,
      details:
        "Grand wedding celebration with premium styling and red carpet entrance.",
      ariaLabel: "Wedding package, price 1500 pesos",
    },
    {
      id: 3,
      title: "Venue Rental",
      price: "₱450.00",
      image: venImg,
      details:
        "Flexible venue use for various events with full air-conditioning system.",
      ariaLabel: "Venue rental, price 450 pesos",
    },
  ];

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
        textToRead = `Booking ${status}, date ${date}. Press Enter to pay.`;
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
    console.log("Command:", command);

    if (command === "mic" || command === "microphone") {
      startVoice();
    }
    else if (command === "profile") {
      setIsProfileModalOpen(true);
      speak("Profile opened");
    }
    else if (command === "close") {
      if (isProfileModalOpen) {
        setIsProfileModalOpen(false);
        speak("Profile closed");
      }
      else if (isModalOpen) {
        setIsModalOpen(false);
        speak("Package closed");
      }
      else if (paymentModal.open) {
        setPaymentModal({ open: false, booking: null });
        speak("Payment closed");
      }
      else {
        speak("Nothing to close");
      }
    }
    else if (command === "my bookings" || command === "bookings") {
      const element = document.getElementById("my-bookings-section");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        speak(`You have ${myBookings.length} bookings`);
      } else {
        speak("No bookings found");
      }
    }
    else if (command === "baptismal") {
      setSelectedPackage(eventPackages[0]);
      setIsModalOpen(true);
      speak(`${eventPackages[0].title}, ${eventPackages[0].price}`);
    }
    else if (command === "wedding") {
      setSelectedPackage(eventPackages[1]);
      setIsModalOpen(true);
      speak(`${eventPackages[1].title}, ${eventPackages[1].price}`);
    }
    else if (command === "venue") {
      setSelectedPackage(eventPackages[2]);
      setIsModalOpen(true);
      speak(`${eventPackages[2].title}, ${eventPackages[2].price}`);
    }
    else if (command === "pay now") {
      if (myBookings.length > 0) {
        setPaymentModal({ open: true, booking: myBookings[0] });
        speak("Payment opened");
      } else {
        speak("No bookings to pay");
      }
    }
    else if (command === "book this") {
      if (selectedPackage) {
        speak(`Booking ${selectedPackage.title}`);
        handleBooking(selectedPackage);
      } else {
        speak("Please select a package first");
      }
    }
    else if (command === "packages") {
      document.querySelector("section")?.scrollIntoView({ behavior: "smooth" });
      speak("Showing packages");
    }
    else if (command === "scroll up") {
      window.scrollBy({ top: -300, behavior: "smooth" });
      speak("Scrolling up");
    }
    else if (command === "scroll down") {
      window.scrollBy({ top: 300, behavior: "smooth" });
      speak("Scrolling down");
    }
    else if (command === "tab") {
      const focusable = document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      let currentIndex = Array.from(focusable).findIndex(el => el === document.activeElement);
      let nextIndex = (currentIndex + 1) % focusable.length;
      focusable[nextIndex].focus();
    }
    else if (command === "read") {
      readFocusedElement();
    }
    else if (command === "help") {
      speak("Commands: mic, profile, close, my bookings, baptismal, wedding, venue, pay now, book this, packages, scroll up, scroll down, tab, read, logout");
    }
    else if (command === "logout") {
      speak("Goodbye");
      setTimeout(() => {
        supabase.auth.signOut();
        navigate("/");
      }, 300);
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
      speak("Listening");
    };

    recognition.onresult = (event) => {
      const command = event.results[0][0].transcript.toLowerCase().trim();
      executeCommand(command);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B8860B] mb-4"></div>
        <p>Loading...</p>
        {error && <p className="text-red-500 text-sm mt-4">Error: {error}</p>}
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <p className="text-red-500 mb-4">Error: {error}</p>
        <button onClick={() => window.location.reload()} className="bg-[#B8860B] text-white px-4 py-2 rounded">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {focusedElement && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-4 py-2 rounded-full z-50 text-sm">
          <Volume2 size={14} className="inline mr-2" />
          {focusedElement}
        </div>
      )}

      {isListening && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#B8860B] text-white px-5 py-2 rounded-full z-50 flex items-center gap-2 shadow-lg">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <Mic size={14} />
          <span className="text-xs font-bold">Say a command...</span>
        </div>
      )}

      <div className="fixed top-20 right-4 bg-slate-800 text-white p-3 rounded-xl z-40 text-xs max-w-xs">
        <Keyboard size={14} className="inline mr-1" />
        <span className="font-bold">Accessibility:</span>
        <p className="mt-1">Press TAB to navigate, ENTER to select</p>
        <p>Press MIC button or say "mic" for voice commands</p>
        <p>Say "help" for all voice commands</p>
      </div>

      <nav className="bg-white/90 backdrop-blur-xl border-b border-slate-100 px-6 py-5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div
            className="text-xl font-black tracking-tighter flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
            tabIndex={0}
            aria-label="Faustino Events, home"
          >
            <div className="w-1.5 h-6 bg-[#B8860B]"></div>
            FAUSTINO{" "}
            <span className="text-[#B8860B] italic text-lg">
              EVENTS
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden md:flex items-center">
                  <span className="text-xs font-bold text-black">
                    {profileData ? `${profileData.first_name} ${profileData.last_name}` : user.email}
                  </span>
                </div>

                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="profile-button px-4 py-2 rounded-xl bg-slate-50 hover:bg-[#B8860B] hover:text-white text-[10px] font-black uppercase transition-all"
                  tabIndex={0}
                  aria-label={`${profileData ? profileData.first_name : ""} profile button. Press Enter to open your profile.`}
                >
                  Profile
                </button>

                <button
                  onClick={startVoice}
                  className="mic-button p-2.5 rounded-xl transition-all bg-slate-50 text-slate-400 hover:bg-[#B8860B] hover:text-white"
                  tabIndex={0}
                  aria-label="Microphone button. Press Enter to activate voice commands."
                >
                  <Mic size={18} />
                </button>

                <button
                  onClick={handleLogout}
                  className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"
                  tabIndex={0}
                  aria-label="Logout button. Press Enter to sign out."
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate("/")}
                className="text-[10px] font-black bg-black text-white px-8 py-3 rounded-xl uppercase tracking-widest hover:bg-[#B8860B]"
                tabIndex={0}
                aria-label="Sign in button"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <section className="mb-24">
          <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-16">
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9]">
              Premium <br />
              <span className="text-[#B8860B]">
                Packages
              </span>
            </h1>

            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Find an event..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-6 pr-6 text-[11px] font-bold shadow-sm outline-none"
                tabIndex={0}
                aria-label="Search events input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {eventPackages
              .filter((pkg) =>
                pkg.title
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase())
              )
              .map((pkg) => (
                <div
                  key={pkg.id}
                  className="package-card bg-white rounded-[2rem] border border-slate-100 p-8 flex flex-col shadow-sm cursor-pointer"
                  tabIndex={0}
                  aria-label={pkg.ariaLabel}
                  onClick={() => {
                    setSelectedPackage(pkg);
                    setIsModalOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSelectedPackage(pkg);
                      setIsModalOpen(true);
                    }
                  }}
                >
                  <img
                    src={pkg.image}
                    alt={pkg.title}
                    className="h-64 w-full object-cover rounded-2xl mb-6"
                  />

                  <h3 className="package-title text-xl font-black uppercase mb-3">
                    {pkg.title}
                  </h3>

                  <p className="text-slate-400 text-[10px] font-bold uppercase mb-8 flex-1">
                    {pkg.details}
                  </p>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <span className="package-price text-[#B8860B] font-black text-xl">
                      {pkg.price}
                    </span>

                    <button
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setIsModalOpen(true);
                      }}
                      className="p-3 bg-black text-white rounded-xl hover:bg-[#B8860B] transition-all"
                      aria-label={`View ${pkg.title} details`}
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>

        <section id="my-bookings-section" className="mt-32 scroll-mt-24">
          <h2 className="text-3xl font-black uppercase mb-12">
            MY BOOKINGS
          </h2>

          {user && myBookings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myBookings.map((item) => (
                <div
                  key={item.booking_id}
                  className="booking-card bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm"
                  tabIndex={0}
                  aria-label={`Booking ${item.booking_status}, date ${new Date(item.event_date).toLocaleDateString()}. Press Enter to pay.`}
                >
                  <div
                    className={`booking-status px-5 py-2 text-[8px] font-black uppercase ${
                      item.booking_status === "Approved"
                        ? "bg-green-500"
                        : "bg-orange-400"
                    } text-white inline-block mb-4`}
                  >
                    {item.booking_status || "PENDING"}
                  </div>

                  <h4 className="booking-date text-lg font-black uppercase">
                    {new Date(item.event_date).toLocaleDateString()}
                  </h4>

                  <div className="flex items-center gap-4 mt-4">
                    <Clock
                      size={14}
                      className="text-slate-400"
                    />
                    <span className="text-[10px] font-bold uppercase">
                      {item.appointment_time} - {item.end_time}
                    </span>
                  </div>

                  {item.payment_status === "Unpaid" && (
                    <button
                      onClick={() =>
                        setPaymentModal({
                          open: true,
                          booking: item,
                        })
                      }
                      className="mt-4 text-[9px] font-black text-[#B8860B] uppercase"
                      aria-label={`Pay for booking on ${new Date(item.event_date).toLocaleDateString()}`}
                    >
                      PAY NOW
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-[2rem] border border-slate-100 text-center">
              <p className="text-slate-400">No bookings yet</p>
            </div>
          )}
        </section>
      </main>

      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <ClientProfile 
            onClose={handleProfileClose}
          />
        </div>
      )}

      {isModalOpen && selectedPackage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>

          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl relative z-10 p-10">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full"
              tabIndex={0}
              aria-label="Close package"
            >
              <X size={18} />
            </button>

            <h2 className="text-3xl font-black uppercase mb-6">
              {selectedPackage.title}
            </h2>

            <p className="text-slate-500 mb-8">
              {selectedPackage.details}
            </p>

            <button
              onClick={() => handleBooking(selectedPackage)}
              className="bg-black text-white px-8 py-4 rounded-xl font-black uppercase hover:bg-[#B8860B]"
              tabIndex={0}
              aria-label="Reserve this package"
            >
              Reserve Package
            </button>
          </div>
        </div>
      )}

      {paymentModal.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() =>
              setPaymentModal({
                open: false,
                booking: null,
              })
            }
          ></div>

          <div className="relative z-10 w-full max-w-md bg-white rounded-3xl p-6">
            <ClientPayment
              bookingId={paymentModal.booking.booking_id}
              totalAmount={paymentModal.booking.amount}
            />

            <button
              onClick={() =>
                setPaymentModal({
                  open: false,
                  booking: null,
                })
              }
              className="mt-4 w-full text-[10px] font-black uppercase text-slate-400"
              tabIndex={0}
              aria-label="Close payment"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;