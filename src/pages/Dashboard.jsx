import React, { useEffect, useState } from "react";
import { supabase } from "../supabasecLient";
import { useNavigate } from "react-router-dom";
import { LogOut, ArrowRight, Search, X } from "lucide-react";

const ClientDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  // Static Data (Maari mong ilipat sa Supabase table balang araw para dynamic)
  const eventPackages = [
    { 
      id: 1, 
      title: "Baptismal Package", 
      price: "₱1,500.00", 
      priceContext: "per person",
      details: "Four (4) Hours Use of Venue Elegant Design & Dining Set-Up with Overlays...",
      fullDetails: ["4 Hours Exclusive Use of Venue", "Elegant Thematic Set-up", "Basic Sound System", "Full Air-conditioning", "Complimentary Parking for Guests"],
      img: "/assets/baptismal.jpg" 
    },
    { 
      id: 2, 
      title: "Wedding Package", 
      price: "₱1,500.00", 
      priceContext: "per person",
      details: "Four (4) Hours Use of Venue Elegant Design & Dining Set-Up with Overlays...",
      fullDetails: ["4 Hours Use of Venue with Elegant Set-up", "Red Carpet for Grand Entrance", "Couple's Table Decoration", "Professional Sound and Lights System", "Bridal Suite / Holding Area"],
      img: "/assets/wedding.jpg" 
    },
    { 
      id: 3, 
      title: "Venue Rental", 
      price: "₱450.00", 
      priceContext: "per person",
      details: "Use Of Venue For (4) Four Hours Air Conditioning System",
      fullDetails: ["4 Hours Maximum Venue Use", "Standard Lighting", "Air-conditioning System Included", "Clean Restrooms Access", "Security Guard on Duty"],
      img: "/assets/venue_rental.jpg" 
    }
  ];

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        // GUEST MODE: Hayaan lang sa dashboard
        if (!session) {
          setUser(null);
          setLoading(false);
          return;
        }

        // VERIFY ROLE: Baka admin ang pumasok sa client dashboard
        const { data: adminData } = await supabase
          .from('Admins')
          .select('admin_id')
          .eq('admin_id', session.user.id)
          .maybeSingle();

        if (adminData) {
          navigate("/AdminDashboard", { replace: true });
        } else {
          setUser(session.user);
        }
      } catch (error) {
        console.error("Auth error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen sa Auth Changes (Logout/Login)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        checkUser();
      }
    });

    return () => subscription?.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleBooking = (packageName) => {
    if (!user) {
      alert("Please login first to book a package.");
      navigate("/"); // Ibalik sa home para lumabas ang Sign In modal
    } else {
      navigate("/book-now", { state: { selectedType: packageName } });
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-[#B8860B] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-[#B8860B] font-black uppercase tracking-widest text-[10px]">Loading Packages...</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-[#B8860B] selection:text-white">
      {/* --- NAVBAR --- */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div 
            className="text-2xl font-black text-black tracking-tighter cursor-pointer flex items-center gap-2 group" 
            onClick={() => navigate("/")}
          >
            <div className="w-1 h-6 bg-[#B8860B] group-hover:h-8 transition-all"></div> 
            FAUSTINO <span className="text-[#B8860B] italic">EVENTS</span>
          </div>
          
          <div className="flex items-center gap-8">
            {user ? (
              <button 
                onClick={handleLogout} 
                className="text-[10px] font-black text-slate-400 hover:text-red-600 flex items-center gap-2 transition-all uppercase tracking-[0.2em]"
              >
                LOGOUT <LogOut size={14} />
              </button>
            ) : (
              <button 
                onClick={() => navigate("/")} 
                className="text-[10px] font-black bg-black text-white px-8 py-2.5 rounded-full hover:bg-[#B8860B] transition-all uppercase tracking-widest shadow-lg shadow-black/10"
              >
                LOGIN TO BOOK
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 md:p-16">
        {/* --- HEADER --- */}
        <header className="mb-20 flex flex-col md:flex-row justify-between items-end gap-10">
            <div>
               <h1 className="text-6xl md:text-8xl font-black text-black uppercase tracking-tighter leading-[0.85]">
                 OUR <br/><span className="text-[#B8860B]">PACKAGES</span>
               </h1>
               <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em] mt-8 flex items-center gap-3">
                 <span className="w-8 h-[1px] bg-slate-200"></span> Exclusivity in Every Detail
               </p>
            </div>

            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-5 top-4 text-slate-300 group-focus-within:text-[#B8860B] transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="SEARCH FOR EVENTS..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-14 pr-6 text-[11px] font-bold tracking-widest text-black focus:ring-2 focus:ring-[#B8860B]/20 transition-all placeholder:text-slate-300"
              />
            </div>
        </header>
        
        {/* --- GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {eventPackages
            .filter((pkg) => pkg.title.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((pkg) => (
            <div key={pkg.id} className="bg-white rounded-[2.5rem] overflow-hidden hover:shadow-3xl transition-all border border-slate-100 group flex flex-col hover:-translate-y-2 duration-500">
              <div className="h-72 bg-slate-100 relative overflow-hidden">
                 <img 
                    src={pkg.img} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                    alt={pkg.title} 
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=1000&auto=format&fit=crop'; }}
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              <div className="p-10 flex flex-col flex-1">
                <h3 className="text-2xl font-black text-black leading-tight uppercase tracking-tighter mb-4 group-hover:text-[#B8860B] transition-colors">{pkg.title}</h3>
                <p className="text-slate-400 text-[11px] leading-relaxed font-bold uppercase tracking-wider flex-1 mb-10 line-clamp-2">{pkg.details}</p>
                
                <div className="pt-8 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[#B8860B] font-black text-2xl tracking-tighter">{pkg.price}</span>
                        <span className="text-[9px] text-slate-300 uppercase font-black tracking-widest">{pkg.priceContext}</span>
                    </div>
                    <button 
                      onClick={() => { setSelectedPackage(pkg); setIsModalOpen(true); }} 
                      className="bg-black text-white hover:bg-[#B8860B] text-[10px] font-black uppercase tracking-widest px-8 py-4 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-black/5"
                    >
                      DETAILS <ArrowRight size={14} />
                    </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* --- MODAL SECTION --- */}
      {isModalOpen && selectedPackage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="bg-white rounded-[3rem] w-full max-w-4xl relative z-10 overflow-hidden shadow-[0_0_100px_-20px_rgba(0,0,0,0.5)] flex flex-col md:flex-row animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-8 right-8 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-[#B8860B] transition-colors z-20 shadow-xl"
            >
              <X size={20} />
            </button>

            <div className="w-full md:w-1/2 h-80 md:h-auto relative overflow-hidden">
              <img src={selectedPackage.img} className="w-full h-full object-cover" alt={selectedPackage.title} />
              <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent"></div>
            </div>

            <div className="p-12 md:w-1/2 flex flex-col bg-white">
              <div className="mb-8">
                <span className="text-[9px] font-black text-[#B8860B] tracking-[0.4em] uppercase inline-block mb-3 bg-yellow-50 px-3 py-1 rounded-full">Premium Selections</span>
                <h2 className="text-4xl font-black text-black uppercase tracking-tighter leading-none">{selectedPackage.title}</h2>
              </div>

              <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-6 italic underline decoration-[#B8860B]/30 underline-offset-4">Inclusions & Services</h4>
                <ul className="space-y-4 mb-10">
                  {selectedPackage.fullDetails.map((item, index) => (
                    <li key={index} className="text-[11px] font-bold text-slate-600 flex items-start gap-4">
                      <span className="w-5 h-5 bg-slate-50 text-[#B8860B] rounded-full flex items-center justify-center text-[8px] flex-shrink-0 border border-[#B8860B]/10">{index + 1}</span>
                      <span className="mt-0.5">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between pt-10 border-t border-slate-100">
                <div className="flex flex-col">
                  <span className="text-3xl font-black text-black tracking-tighter">{selectedPackage.price}</span>
                  <span className="text-[9px] text-[#B8860B] uppercase font-black tracking-widest">Starting Price</span>
                </div>
                <button 
                  onClick={() => handleBooking(selectedPackage.title)}
                  className="bg-black text-white px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-[#B8860B] hover:-translate-y-1 transition-all active:translate-y-0 shadow-2xl shadow-black/20"
                >
                  RESERVE NOW
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;