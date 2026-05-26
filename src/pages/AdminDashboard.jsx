import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LayoutDashboard, Users, Calendar, User, LogOut, Star, CreditCard, Bell, Check, ChevronLeft, ChevronRight, History } from 'lucide-react';

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
  const [approvedBookings, setApprovedBookings] = useState([]);
  const [completedBookings, setCompletedBookings] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
  };

  const updateCompletedStatus = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('bookings')
      .update({ booking_status: 'Completed' })
      .lt('event_date', todayStr)
      .eq('booking_status', 'Approved');
    
    if (error) console.error("Error updating completed status:", error);
  };

  const fetchApprovedBookings = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        booking_id,
        event_type,
        event_name,
        event_date,
        appointment_time,
        end_time,
        total_pax,
        booking_status,
        user_id,
        first_name,
        last_name,
        email
      `)
      .eq("booking_status", "Approved")
      .gte("event_date", todayStr)
      .order("event_date", { ascending: true });

    if (!error && data) {
      const bookingsWithNames = await Promise.all(
        data.map(async (booking) => {
          let clientName = booking.first_name || '';
          let clientLastName = booking.last_name || '';
          let clientEmail = booking.email || '';
          
          if ((!clientName || !clientLastName) && booking.user_id) {
            const { data: clientData } = await supabase
              .from("clients")
              .select("first_name, last_name, email")
              .eq("user_id", booking.user_id)
              .maybeSingle();
            
            if (clientData) {
              clientName = clientData.first_name || clientName;
              clientLastName = clientData.last_name || clientLastName;
              clientEmail = clientData.email || clientEmail;
            }
          }
          
          return {
            ...booking,
            client_first_name: clientName || 'Guest',
            client_last_name: clientLastName || '',
            client_email: clientEmail || 'No email'
          };
        })
      );
      
      setApprovedBookings(bookingsWithNames);
    }
  };

  const fetchCompletedBookings = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        booking_id,
        event_type,
        event_name,
        event_date,
        appointment_time,
        end_time,
        total_pax,
        booking_status,
        user_id,
        first_name,
        last_name,
        email
      `)
      .eq("booking_status", "Completed")
      .order("event_date", { ascending: false });

    if (!error && data) {
      const bookingsWithNames = await Promise.all(
        data.map(async (booking) => {
          let clientName = booking.first_name || '';
          let clientLastName = booking.last_name || '';
          let clientEmail = booking.email || '';
          
          if ((!clientName || !clientLastName) && booking.user_id) {
            const { data: clientData } = await supabase
              .from("clients")
              .select("first_name, last_name, email")
              .eq("user_id", booking.user_id)
              .maybeSingle();
            
            if (clientData) {
              clientName = clientData.first_name || clientName;
              clientLastName = clientData.last_name || clientLastName;
              clientEmail = clientData.email || clientEmail;
            }
          }
          
          return {
            ...booking,
            client_first_name: clientName || 'Guest',
            client_last_name: clientLastName || '',
            client_email: clientEmail || 'No email'
          };
        })
      );
      
      setCompletedBookings(bookingsWithNames);
    }
  };

  const fetchRevenue = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('amount_paid, down_payment, payment_status');

      if (error) {
        console.error("Revenue fetch error:", error);
        return 0;
      }

      if (!data || data.length === 0) {
        return 0;
      }

      let total = 0;
      data.forEach(booking => {
        if (booking.payment_status === 'Paid' || booking.payment_status === 'Partial' || booking.payment_status === 'Downpayment') {
          let amount = 0;
          if (booking.amount_paid && booking.amount_paid > 0) {
            amount = parseFloat(booking.amount_paid);
          } else if (booking.down_payment && booking.down_payment > 0) {
            amount = parseFloat(booking.down_payment);
          }
          total += amount;
        }
      });
      
      return total;
    } catch (err) {
      console.error("Revenue calculation error:", err);
      return 0;
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getBookingsForDate = (date) => {
    if (!date) return [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    return approvedBookings.filter(booking => booking.event_date === dateStr);
  };

  const changeMonth = (increment) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + increment, 1));
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

        await updateCompletedStatus();
        await Promise.all([
          fetchNotifications(),
          fetchApprovedBookings(),
          fetchCompletedBookings()
        ]);

        const [bookingsRes, eventsRes, clientsRes] = await Promise.all([
          supabase.from('bookings').select('*', { count: 'exact', head: true }),
          supabase.from('events').select('*', { count: 'exact', head: true }),
          supabase.from('clients').select('*', { count: 'exact', head: true })
        ]);

        const totalRevenue = await fetchRevenue();

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
        console.error("Dashboard error:", error);
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
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings" },
        () => {
          fetchRevenue().then(newRevenue => {
            if (isMounted) {
              setCounts(prev => ({ ...prev, revenue: newRevenue }));
            }
          });
          fetchNotifications();
          fetchApprovedBookings();
          fetchCompletedBookings();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings" },
        () => {
          fetchApprovedBookings();
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
  const days = getDaysInMonth(currentMonth);

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

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-10">
          <div className="bg-gradient-to-r from-[#1e293b] to-[#0f172a] px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Calendar size={20} className="text-[#DAA520]" />
              <h3 className="text-white font-bold uppercase tracking-wider text-sm">Approved Schedules Calendar</h3>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronLeft size={20} className="text-white" />
              </button>
              <span className="text-white font-bold">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
              <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronRight size={20} className="text-white" />
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-7 gap-2 mb-4">
              {weekDays.map((day, idx) => (
                <div key={idx} className="text-center text-[10px] font-black uppercase text-slate-400 py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, idx) => {
                const bookingsOnDay = day ? getBookingsForDate(day) : [];
                const hasBookings = bookingsOnDay.length > 0;
                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] p-2 rounded-xl border transition-all ${
                      day 
                        ? hasBookings 
                          ? 'bg-[#B8860B]/10 border-[#B8860B]/30 cursor-pointer hover:bg-[#B8860B]/20' 
                          : 'bg-white border-slate-100 hover:border-slate-200'
                        : 'bg-slate-50/30 border-slate-50'
                    }`}
                  >
                    {day && (
                      <>
                        <div className="flex justify-between items-start">
                          <span className={`text-xs font-bold ${hasBookings ? 'text-[#B8860B]' : 'text-slate-500'}`}>
                            {day}
                          </span>
                          {hasBookings && (
                            <span className="text-[8px] font-black bg-[#B8860B] text-white px-1.5 py-0.5 rounded-full">
                              {bookingsOnDay.length}
                            </span>
                          )}
                        </div>
                        {hasBookings && (
                          <div className="mt-2 space-y-1">
                            {bookingsOnDay.slice(0, 2).map((booking, bIdx) => (
                              <div key={bIdx} className="text-[9px] font-medium text-slate-600 truncate" title={`${booking.client_first_name} ${booking.client_last_name} - ${booking.appointment_time}`}>
                                {booking.appointment_time?.substring(0,5)} {booking.client_first_name}
                              </div>
                            ))}
                            {bookingsOnDay.length > 2 && (
                              <div className="text-[8px] text-[#B8860B] font-bold">
                                +{bookingsOnDay.length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/30 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#B8860B]/20 rounded border border-[#B8860B]/30"></div>
                <span className="text-[9px] text-slate-500">With Approved Bookings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white rounded border border-slate-200"></div>
                <span className="text-[9px] text-slate-500">No Bookings</span>
              </div>
            </div>
            <div className="text-[9px] text-slate-400">
              Total Upcoming: {approvedBookings.length} bookings
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              {showArchived ? <History size={16} className="text-slate-500" /> : <Calendar size={16} className="text-slate-500" />}
              <h3 className="font-bold uppercase tracking-wider text-sm text-slate-700">
                {showArchived ? "Event History / Archive" : "Upcoming Approved Events"}
              </h3>
            </div>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="text-[9px] font-bold text-[#B8860B] hover:underline flex items-center gap-1"
            >
              {showArchived ? "← View Upcoming" : "View History →"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr className="text-[9px] font-black uppercase text-slate-400">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Event Type</th>
                  <th className="px-6 py-3">Pax</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(showArchived ? completedBookings : approvedBookings).slice(0, 10).map((booking) => (
                  <tr key={booking.booking_id} className="hover:bg-slate-50/50 transition-colors text-sm">
                    <td className="px-6 py-3 font-mono text-xs">{booking.event_date}</td>
                    <td className="px-6 py-3 text-xs">{booking.appointment_time?.substring(0,5)} - {booking.end_time?.substring(0,5)}</td>
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium text-slate-800">{booking.client_first_name} {booking.client_last_name}</p>
                        <p className="text-[9px] text-slate-400">{booking.client_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-xs">{booking.event_type || booking.event_name}</td>
                    <td className="px-6 py-3 text-xs">{booking.total_pax} pax</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${
                        showArchived ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'
                      }`}>
                        {showArchived ? 'Completed' : 'Approved'}
                      </span>
                    </td>
                  </tr>
                ))}
                {(showArchived ? completedBookings : approvedBookings).length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-slate-400 text-xs uppercase">
                      {showArchived ? "No completed events yet" : "No approved bookings yet"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {(showArchived ? completedBookings : approvedBookings).length > 10 && (
            <div className="px-6 py-3 border-t border-slate-100 text-right">
              <button onClick={() => navigate("/AdminBookings")} className="text-[9px] font-bold text-[#B8860B] hover:underline">
                View all {(showArchived ? completedBookings : approvedBookings).length} {(showArchived ? "completed" : "approved")} bookings →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;