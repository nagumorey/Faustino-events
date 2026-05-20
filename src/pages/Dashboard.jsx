import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { LogOut, ArrowRight, Search, X, Clock } from "lucide-react";
import ClientPayment from "../components/ClientPayments";
import { useVoice } from '../components/hooks/useVoice'

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
  const navigate = useNavigate();

  const eventPackages = [
    { id: 1, title: "Baptismal Package", price: "₱1,500.00", image: bapImg, details: "Exclusive use of venue with elegant thematic design and full dining set-up." },
    { id: 2, title: "Wedding Package", price: "₱1,500.00", image: wedImg, details: "Grand wedding celebration with premium styling and red carpet entrance." },
    { id: 3, title: "Venue Rental", price: "₱450.00", image: venImg, details: "Flexible venue use for various events with full air-conditioning system." }
  ];

  useEffect(() => {
    let isMounted = true;

    const verifyAndFetch = async () => {
      try {
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
            const { data: bookingData, error: bookingError } = await supabase
              .from('bookings')
              .select('*')
              .eq('user_id', session.user.id)
              .order('booking_id', { ascending: false });
            
            if (bookingError) {
              console.error(bookingError.message);
            } else {
              setMyBookings(bookingData || []);
            }
            setLoading(false);
          }
        }
      } catch (error) {
        if (isMounted) setLoading(false);
      }
    };

    verifyAndFetch();

    return () => { isMounted = false; };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  const handleBooking = (pkg) => {
    if (!user) {
      navigate("/"); 
    } else {
      navigate("/booking", { state: { selectedType: pkg.title, price: pkg.price } });
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
                <span className="text-[10px] font-black uppercase text-slate-500">{user.email}</span>
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

      <main className="max-w-7xl mx-auto px-6 py-20">
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
          <section className="mt-32">
            <h2 className="text-3xl font-black uppercase mb-12">My Bookings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myBookings.map((item) => (
                <div key={item.booking_id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative">
                  <div className={`absolute top-0 right-0 px-5 py-2 text-[8px] font-black uppercase ${item.booking_status === 'Approved' ? 'bg-green-500' : 'bg-orange-400'} text-white`}>
                    {item.booking_status}
                  </div>
                  <h4 className="text-lg font-black uppercase">
                    {new Date(item.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </h4>
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