import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LayoutDashboard, Users, Calendar, User, LogOut, Star, CreditCard, Bell, Check } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [counts, setCounts] = useState({
    bookings: 0,
    events: 0,
    clients: 0,
    revenue: 0
  });

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeDashboard = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          if (isMounted) navigate("/", { replace: true });
          return;
        }

        const { data: adminData } = await supabase
          .from('Admins')
          .select('admin_id')
          .eq('admin_id', session.user.id)
          .maybeSingle();

        if (!adminData) {
          if (isMounted) navigate("/ClientDashboard", { replace: true });
          return;
        }

        await fetchNotifications();

        const [bookingsRes, eventsRes, clientsRes, revenueRes] = await Promise.all([
          supabase.from('bookings').select('*', { count: 'exact', head: true }),
          supabase.from('events').select('*', { count: 'exact', head: true }),
          supabase.from('clients').select('*', { count: 'exact', head: true }),
          supabase.from('bookings').select('paid_amount')
        ]);

        let totalRevenue = 0;
        if (revenueRes.data) {
          totalRevenue = revenueRes.data.reduce((sum, item) => {
            const price = parseFloat(item.paid_amount) || 0;
            return sum + price;
          }, 0);
        }

        if (isMounted) {
          setCounts({
            bookings: bookingsRes.count || 0,
            events: eventsRes.count || 0,
            clients: clientsRes.count || 0,
            revenue: totalRevenue
          });
          setLoading(false);
        }
      } catch (error) {
        if (isMounted) setLoading(false);
      }
    };

    initializeDashboard();

    const channel = supabase
      .channel("admin-dashboard-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const handleToggleDropdown = async () => {
    const nextState = !isNotifOpen;
    setIsNotifOpen(nextState);

    if (nextState) {
      const unreadNotifications = notifications.filter((n) => !n.is_read);
      
      if (unreadNotifications.length > 0) {
        const unreadIds = unreadNotifications.map((n) => n.notification_id);

        const { error } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .in("notification_id", unreadIds);

        if (!error) {
          setNotifications((prev) =>
            prev.map((n) => (unreadIds.includes(n.notification_id) ? { ...n, is_read: true } : n))
          );
        }
      }
    }
  };

  const markAsRead = async (id) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("notification_id", id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const stats = [
    { label: "Bookings", value: counts.bookings.toString(), icon: <Calendar size={18} />, color: "bg-red-500", path: "/AdminBookings" },
    { label: "Events", value: counts.events.toString(), icon: <Star size={18} />, color: "bg-green-500", path: "/AdminEvents" },
    { label: "Registered Clients", value: counts.clients.toString(), icon: <Users size={18} />, color: "bg-yellow-500", path: "/AdminUsers" },
    { label: "Total Revenue", value: `₱${counts.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, icon: <CreditCard size={18} />, color: "bg-[#1e293b]", path: "/AdminDashboard" },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate("/", { replace: true });
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-white text-[10px] font-bold tracking-[0.3em] uppercase opacity-50">Loading Dashboard...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans text-slate-800">
      <aside className="w-64 bg-black p-6 flex flex-col shadow-xl">
        <div className="mb-10 px-2 text-white italic">
          <h2 className="font-black tracking-tighter text-xl">FAUSTINO'S</h2>
          <p className="text-[10px] text-slate-500 font-bold tracking-widest mt-1 uppercase">Admin Panel</p>
        </div>

        <nav className="space-y-2 flex-1">
          <button onClick={() => navigate("/AdminDashboard")} className="flex items-center gap-3 w-full p-3 rounded-lg bg-white/10 text-white text-[11px] font-bold uppercase tracking-widest transition-all">
            <LayoutDashboard size={16} className="text-yellow-500" /> Dashboard
          </button>
          <button onClick={() => navigate("/AdminEvents")} className="flex items-center gap-3 w-full p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all">
            <Star size={16} /> Event
          </button>
          <button onClick={() => navigate("/AdminBookings")} className="flex items-center gap-3 w-full p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all">
            <Calendar size={16} /> Booking
          </button>
          <button onClick={() => navigate("/AdminUsers")} className="flex items-center gap-3 w-full p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all">
            <Users size={16} /> User
          </button>
        </nav>

        <div className="border-t border-slate-800 pt-4 space-y-2">
          <button onClick={() => navigate("/AdminProfile")} className="flex items-center gap-3 w-full p-3 text-slate-400 hover:text-white text-[11px] font-bold uppercase tracking-widest transition-all">
            <User size={16} /> Profile
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 text-slate-500 hover:text-red-500 text-[11px] font-bold uppercase tracking-widest transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10 bg-black text-white p-4 rounded-xl shadow-lg relative">
          <h2 className="text-xs font-bold tracking-[0.3em] uppercase ml-4">EMS Dashboard</h2>
          <div className="mr-4 flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={handleToggleDropdown} 
                className="relative p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center"
              >
                <Bell size={18} className="text-slate-300 hover:text-white transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-black">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-4 w-80 max-h-96 overflow-y-auto bg-white text-slate-800 rounded-2xl border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-4 space-y-3 z-50">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Notifications</h4>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-slate-400 text-xs py-4 text-center font-medium">No notifications yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map((notif) => (
                        <div 
                          key={notif.notification_id} 
                          className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                            notif.is_read 
                              ? "bg-slate-50/50 border-slate-100 opacity-60" 
                              : "bg-amber-50/30 border-amber-100 shadow-sm"
                          }`}
                        >
                          <div className="space-y-1 flex-1">
                            <p className="text-xs font-bold text-slate-800 leading-snug">{notif.message}</p>
                            <p className="text-[9px] font-medium text-slate-400">
                              {new Date(notif.created_at).toLocaleDateString()} at {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {!notif.is_read && (
                            <button 
                              onClick={() => markAsRead(notif.notification_id)}
                              className="p-1 bg-white hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-md border border-slate-200 transition-colors shrink-0"
                            >
                              <Check size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System Live</span>
            </div>
          </div>
        </header>

        <div className="mb-10">
          <h1 className="text-4xl font-serif font-bold text-[#1e293b]">Welcome Admin!</h1>
          <p className="text-slate-400 text-sm mt-1 font-medium italic">Manage your events, bookings, and analytics from this panel.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {stats.map((s, i) => (
            <div key={i} onClick={() => navigate(s.path)} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all group cursor-pointer hover:-translate-y-1">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-black transition-colors">{s.label}</h3>
                <div className={`${s.color} p-2.5 rounded-xl text-white shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform`}>{s.icon}</div>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-800 tracking-tighter">{s.value}</p>
                <div className="w-full bg-slate-100 h-1 rounded-full mt-4 overflow-hidden">
                  <div className={`${s.color} h-full opacity-20`} style={{width: '100%'}}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;