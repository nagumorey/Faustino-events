import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { LogOut, ArrowRight, Search, X, Calendar, Clock, CreditCard } from "lucide-react";

const ClientDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [myBookings, setMyBookings] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const navigate = useNavigate();

  const eventPackages = [
    { 
      id: 1, 
      title: "Baptismal Package", 
      price: "₱1,500.00", 
      priceContext: "per person",
      details: "Exclusive use of venue with elegant thematic design and full dining set-up.",
      fullDetails: ["4 Hours Exclusive Use of Venue", "Elegant Thematic Set-up", "Basic Sound System", "Full Air-conditioning", "Complimentary Parking"],
    },
    { 
      id: 2, 
      title: "Wedding Package", 
      price: "₱1,500.00", 
      priceContext: "per person",
      details: "Grand wedding celebration with premium styling and red carpet entrance.",
      fullDetails: ["4 Hours Use of Venue", "Red Carpet Entrance", "Couple's Table Decoration", "Professional Sound & Lights", "Bridal Suite Access"],
    },
    { 
      id: 3, 
      title: "Venue Rental", 
      price: "₱450.00", 
      priceContext: "per person",
      details: "Flexible venue use for various events with full air-conditioning system.",
      fullDetails: ["4 Hours Maximum Venue Use", "Standard Lighting", "Air-conditioning Included", "Clean Restrooms Access", "Security Service"],
    }
  ];

  useEffect(() => {
    let isMounted = true;

    const verifyAndFetch = async () => {
      try {
        if (window.location.hash.includes("type=recovery") || window.location.hash.includes("access_token=")) {
          if (isMounted) navigate("/", { replace: true });
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        const { data: adminData } = await supabase
          .from('Admins')
          .select('admin_id')
          .eq('admin_id', session.user.id)
          .maybeSingle();

        if (isMounted) {
          if (adminData) {
            navigate("/AdminDashboard", { replace: true });
          } else {
            setUser(session.user);
            const { data: bookingData } = await supabase
              .from('bookings')
              .select('*')
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: false });
            
            setMyBookings(bookingData || []);
            setLoading(false);
          }
        }
      } catch (error) {
        if (isMounted) setLoading(false);
      }
    };

    verifyAndFetch();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setUser(null);
          setMyBookings([]);
          setLoading(false);
        }
      } else {
        verifyAndFetch();
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate("/", { replace: true });
  };

  const handleBooking = (pkg) => {
    if (!user) {
      navigate("/"); 
    } else {
      navigate("/booking", { 
        state: { 
          selectedType: pkg.title,
          price: pkg.price 
        } 
      });
    }
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
    <div className="min-h-screen bg-[#fafafa] font-sans selection:bg-[#B8860B] selection:text-white">
      <nav className="bg-white/90 backdrop-blur-xl border-b border-slate-100 px-6 py-5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-xl font-black tracking-tighter flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-1.5 h-6 bg-[#B8860B]"></div>
            FAUSTINO <span className="text-[#B8860B] italic text-lg">EVENTS</span>
          </div>
          
          <div className="flex items-center gap-6">
            {user ? (
              <div className="flex items-center gap-5">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-[10px] font-black text-black uppercase">{user.email.split('@')[0]}</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Client Member</span>
                </div>
                <button onClick={handleLogout} className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button onClick={() => navigate("/")} className="text-[10px] font-black bg-black text-white px-8 py-3 rounded-xl hover:bg-[#B8860B] transition-all uppercase tracking-widest shadow-xl shadow-black/10">
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12 md:py-20">
        <section className="mb-24">
          <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-16">
            <div>
              <h1 className="text-5xl md:text-7xl font-black text-black uppercase tracking-tighter leading-[0.9]">
                Premium <br/><span className="text-[#B8860B]">Packages</span>
              </h1>
              <div className="h-1 w-20 bg-[#B8860B] mt-6"></div>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input 
                type="text" 
                placeholder="Find an event..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-[11px] font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-[#B8860B]/10 transition-all shadow-sm"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {eventPackages
              .filter((pkg) => pkg.title.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((pkg) => (
              <div key={pkg.id} className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 group flex flex-col hover:shadow-2xl hover:shadow-[#B8860B]/5 transition-all duration-500">
                <div className="h-64 bg-slate-200"></div>
                <div className="p-10 flex flex-col flex-1">
                  <h3 className="text-xl font-black text-black uppercase tracking-tight mb-3">{pkg.title}</h3>
                  <p className="text-slate-400 text-[10px] leading-relaxed font-bold uppercase tracking-wider mb-8 flex-1">{pkg.details}</p>
                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <span className="text-[#B8860B] font-black text-xl tracking-tighter">{pkg.price}</span>
                    <button onClick={() => { setSelectedPackage(pkg); setIsModalOpen(true); }} className="p-3 bg-black text-white rounded-xl hover:bg-[#B8860B] transition-all">
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {user && myBookings.length > 0 && (
          <section className="mt-32">
            <div className="mb-12">
              <h2 className="text-3xl font-black text-black uppercase tracking-tighter">My Bookings</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Track your current event status</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myBookings.map((item) => (
                <div key={item.booking_id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 relative overflow-hidden">
                  <div className={`absolute top-0 right-0 px-5 py-2 text-[8px] font-black uppercase tracking-widest ${item.booking_status === 'Approved' ? 'bg-green-500 text-white' : 'bg-orange-400 text-white'}`}>
                    {item.booking_status || 'Pending'}
                  </div>
                  <div className="w-full md:w-32 h-32 bg-slate-100 rounded-2xl flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="mb-4">
                      <p className="text-[9px] font-black text-[#B8860B] uppercase tracking-widest mb-1">Schedule</p>
                      <h4 className="text-lg font-black uppercase tracking-tight">{item.event_date}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock size={14} />
                        <span className="text-[10px] font-bold uppercase">{item.appointment_time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <CreditCard size={14} />
                        <span className="text-[10px] font-bold uppercase">{item.payment_status || 'Unpaid'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {isModalOpen && selectedPackage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl relative z-10 overflow-hidden flex flex-col md:flex-row animate-in zoom-in duration-300">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-[#B8860B] transition-colors z-20">
              <X size={18} />
            </button>
            <div className="w-full md:w-5/12 h-64 md:h-auto bg-slate-200"></div>
            <div className="p-10 md:p-14 md:w-7/12">
              <h2 className="text-3xl font-black text-black uppercase tracking-tighter mb-6">{selectedPackage.title}</h2>
              <ul className="space-y-4 mb-10">
                {selectedPackage.fullDetails.map((item, index) => (
                  <li key={index} className="text-[10px] font-bold text-slate-500 flex items-center gap-3 uppercase tracking-wider">
                    <div className="w-1.5 h-1.5 bg-[#B8860B] rounded-full"></div> {item}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between pt-8 border-t border-slate-100">
                <div>
                  <span className="text-2xl font-black text-black tracking-tighter">{selectedPackage.price}</span>
                  <p className="text-[8px] text-[#B8860B] uppercase font-black tracking-widest">Starts At</p>
                </div>
                <button onClick={() => handleBooking(selectedPackage)} className="bg-black text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#B8860B] transition-all">
                  Reserve Package
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