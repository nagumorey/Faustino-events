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
        appointment_date,
        appointment_time,
        start_time,
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
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        booking_id,
        event_type,
        event_name,
        event_date,
        appointment_date,
        appointment_time,
        start_time,
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

  const handleToggleDropdown = () => {
    setIsNotifOpen(!isNotifOpen);
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

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.notification_id);
    if (unreadIds.length === 0) return;
    
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("notification_id", unreadIds);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const days = getDaysInMonth(currentMonth);

  const stats = [
    { label: "Bookings", value: counts.bookings.toString(), icon: <Calendar size={18} />, color: "bg-yellow-500", path: "/AdminBookings" },
    { label: "Events", value: counts.events.toString(), icon: <Star size={18} />, color: "bg-green-500", path: "/AdminEvents" },
    { label: "Registered Clients", value: counts.clients.toString(), icon: <Users size={18} />, color: "bg-blue-500", path: "/AdminUsers" },
    { label: "Total Revenue", value: `₱${counts.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, icon: <CreditCard size={18} />, color: "bg-[#1e293b]", path: "/AdminDashboard" },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate("/", { replace: true });
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-gray-400 text-[10px] font-bold tracking-[0.3em] uppercase">Loading Dashboard...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-black/40 backdrop-blur-xl p-6 flex flex-col shadow-xl border-r border-yellow-500/20 z-20">
        <div className="mb-10 px-2">
          <h2 className="font-black tracking-tighter text-xl bg-gradient-to-r from-yellow-500 to-yellow-400 bg-clip-text text-transparent">FAUSTINO'S</h2>
          <p className="text-[10px] text-gray-500 font-bold tracking-widest mt-1 uppercase">Admin Panel</p>
        </div>

        <nav className="space-y-2 flex-1">
          <button onClick={() => navigate("/AdminDashboard")} className="flex items-center gap-3 w-full p-3 rounded-lg bg-yellow-500/20 text-yellow-500 text-[11px] font-bold uppercase tracking-widest transition-all">
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button onClick={() => navigate("/AdminEvents")} className="flex items-center gap-3 w-full p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all">
            <Star size={16} /> Event
          </button>
          <button onClick={() => navigate("/AdminBookings")} className="flex items-center gap-3 w-full p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all">
            <Calendar size={16} /> Booking
          </button>
          <button onClick={() => navigate("/AdminUsers")} className="flex items-center gap-3 w-full p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all">
            <Users size={16} /> User
          </button>
        </nav>

        <div className="border-t border-white/10 pt-4 space-y-2">
          <button onClick={() => navigate("/AdminProfile")} className="flex items-center gap-3 w-full p-3 text-gray-400 hover:text-white text-[11px] font-bold uppercase tracking-widest transition-all">
            <User size={16} /> Profile
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 text-gray-500 hover:text-red-500 text-[11px] font-bold uppercase tracking-widest transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto relative">
        {/* Header */}
        <header className="flex justify-between items-center mb-10 bg-black/40 backdrop-blur-xl border border-yellow-500/20 p-4 rounded-xl shadow-lg relative z-10">
          <h2 className="text-xs font-bold tracking-[0.3em] uppercase text-gray-400 ml-4">EMS Dashboard</h2>
          <div className="mr-4 flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={handleToggleDropdown} 
                className="relative p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center"
              >
                <Bell size={18} className="text-gray-400 hover:text-yellow-500 transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-black/40">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown - Fixed z-index and position */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-96 max-h-96 overflow-y-auto bg-[#1a1a2e] backdrop-blur-xl text-white rounded-2xl border border-yellow-500/30 shadow-2xl z-[9999]">
                  <div className="sticky top-0 bg-[#1a1a2e] p-4 border-b border-yellow-500/20 flex justify-between items-center">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-yellow-500">Notifications</h4>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-[8px] text-yellow-500 hover:text-yellow-400 transition-colors"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-gray-400 text-xs py-4 text-center font-medium">No notifications yet.</p>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.notification_id} 
                          className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                            notif.is_read 
                              ? "bg-white/5 border-white/10 opacity-60" 
                              : "bg-yellow-500/10 border-yellow-500/30 shadow-sm"
                          }`}
                        >
                          <div className="space-y-1 flex-1">
                            <p className="text-xs font-bold text-white leading-snug break-words">{notif.message}</p>
                            <p className="text-[9px] font-medium text-gray-400">
                              {new Date(notif.created_at).toLocaleDateString()} at {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {!notif.is_read && (
                            <button 
                              onClick={() => markAsRead(notif.notification_id)}
                              className="p-1 bg-white/10 hover:bg-yellow-500 text-gray-400 hover:text-black rounded-md border border-white/20 transition-colors shrink-0"
                            >
                              <Check size={12} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">System Live</span>
            </div>
          </div>
        </header>

        {/* Welcome Section */}
        <div className="mb-10">
          <h1 className="text-4xl font-serif font-bold bg-gradient-to-r from-yellow-500 to-yellow-400 bg-clip-text text-transparent">Welcome Admin!</h1>
          <p className="text-gray-400 text-sm mt-1 font-medium italic">Manage your events, bookings, and analytics from this panel.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {stats.map((s, i) => (
            <div key={i} onClick={() => navigate(s.path)} className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20 flex flex-col justify-between hover:shadow-xl hover:border-yellow-500/50 transition-all group cursor-pointer hover:-translate-y-1">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-yellow-500 transition-colors">{s.label}</h3>
                <div className={`${s.color} p-2.5 rounded-xl text-white shadow-lg shadow-black/20 group-hover:scale-110 transition-transform`}>{s.icon}</div>
              </div>
              <div>
                <p className="text-3xl font-bold text-white tracking-tighter">{s.value}</p>
                <div className="w-full bg-white/10 h-1 rounded-full mt-4 overflow-hidden">
                  <div className={`${s.color} h-full opacity-30`} style={{width: '100%'}}></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Calendar Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden mb-10">
          <div className="bg-gradient-to-r from-black/40 to-black/20 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Calendar size={20} className="text-yellow-500" />
              <h3 className="text-white font-bold uppercase tracking-wider text-sm">Approved Schedules Calendar</h3>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronLeft size={20} className="text-gray-400 hover:text-yellow-500" />
              </button>
              <span className="text-white font-bold">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
              <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronRight size={20} className="text-gray-400 hover:text-yellow-500" />
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-7 gap-2 mb-4">
              {weekDays.map((day, idx) => (
                <div key={idx} className="text-center text-[10px] font-black uppercase text-gray-500 py-2">
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
                          ? 'bg-yellow-500/10 border-yellow-500/30 cursor-pointer hover:bg-yellow-500/20' 
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                        : 'bg-white/5 border-white/10 opacity-30'
                    }`}
                  >
                    {day && (
                      <>
                        <div className="flex justify-between items-start">
                          <span className={`text-xs font-bold ${hasBookings ? 'text-yellow-500' : 'text-gray-400'}`}>
                            {day}
                          </span>
                          {hasBookings && (
                            <span className="text-[8px] font-black bg-yellow-500 text-black px-1.5 py-0.5 rounded-full">
                              {bookingsOnDay.length}
                            </span>
                          )}
                        </div>
                        {hasBookings && (
                          <div className="mt-2 space-y-1">
                            {bookingsOnDay.slice(0, 2).map((booking, bIdx) => (
                              <div key={bIdx} className="text-[9px] font-medium text-gray-300 truncate" title={`${booking.client_first_name} ${booking.client_last_name} - ${booking.start_time || booking.appointment_time}`}>
                                {(booking.start_time || booking.appointment_time)?.substring(0,5)} {booking.client_first_name}
                              </div>
                            ))}
                            {bookingsOnDay.length > 2 && (
                              <div className="text-[8px] text-yellow-500 font-bold">
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
          
          <div className="border-t border-white/10 px-6 py-4 bg-white/5 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500/20 rounded border border-yellow-500/30"></div>
                <span className="text-[9px] text-gray-400">With Approved Bookings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white/5 rounded border border-white/20"></div>
                <span className="text-[9px] text-gray-400">No Bookings</span>
              </div>
            </div>
            <div className="text-[9px] text-gray-500">
              Total Upcoming: {approvedBookings.length} bookings
            </div>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center">
            <div className="flex items-center gap-2">
              {showArchived ? <History size={16} className="text-gray-400" /> : <Calendar size={16} className="text-gray-400" />}
              <h3 className="font-bold uppercase tracking-wider text-sm text-white">
                {showArchived ? "Event History / Archive" : "Upcoming Approved Events"}
              </h3>
            </div>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="text-[9px] font-bold text-yellow-500 hover:underline flex items-center gap-1"
            >
              {showArchived ? "← View Upcoming" : "View History →"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5">
                <tr className="text-[9px] font-black uppercase text-gray-400">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Event Type</th>
                  <th className="px-6 py-3">Pax</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {(showArchived ? completedBookings : approvedBookings).slice(0, 10).map((booking) => (
                  <tr key={booking.booking_id} className="hover:bg-white/5 transition-colors text-sm">
                    <td className="px-6 py-3 font-mono text-xs text-gray-300">{booking.event_date}</td>
                    <td className="px-6 py-3 text-xs text-gray-300">{(booking.start_time || booking.appointment_time)?.substring(0,5)} - {booking.end_time?.substring(0,5)}</td>
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium text-white">{booking.client_first_name} {booking.client_last_name}</p>
                        <p className="text-[9px] text-gray-400">{booking.client_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-300">{booking.event_type || booking.event_name}</td>
                    <td className="px-6 py-3 text-xs text-gray-300">{booking.total_pax} pax</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${
                        showArchived ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'
                      }`}>
                        {showArchived ? 'Completed' : 'Approved'}
                      </span>
                    </td>
                  </tr>
                ))}
                {(showArchived ? completedBookings : approvedBookings).length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500 text-xs uppercase">
                      {showArchived ? "No completed events yet" : "No approved bookings yet"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {(showArchived ? completedBookings : approvedBookings).length > 10 && (
            <div className="px-6 py-3 border-t border-white/20 text-right">
              <button onClick={() => navigate("/AdminBookings")} className="text-[9px] font-bold text-yellow-500 hover:underline">
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