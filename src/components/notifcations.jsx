import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Bell, Check, Trash2 } from 'lucide-react';

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('notification_id', id);

      if (error) throw error;
      fetchNotifications();
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('notification_id', id);

      if (error) throw error;
      fetchNotifications();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
      <div className="text-xs font-black tracking-widest uppercase animate-pulse text-[#B8860B]">
        Loading Alerts...
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-[#F8F9FA] min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <Bell className="text-slate-700" size={28} />
          <h1 className="text-3xl font-serif font-bold text-[#1e293b]">Activity Notifications</h1>
        </div>
        <span className="bg-black text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider">
          {notifications.filter(n => !n.is_read).length} Unread
        </span>
      </div>

      <div className="max-w-4xl mx-auto space-y-4">
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <div 
              key={n.notification_id} 
              className={`p-5 rounded-2xl border transition-all flex items-center justify-between gap-6 ${
                n.is_read 
                  ? 'bg-white border-slate-100 opacity-75' 
                  : 'bg-white border-l-4 border-l-[#B8860B] border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex-1">
                <p className={`text-sm ${n.is_read ? 'text-slate-500 font-medium' : 'text-slate-800 font-bold'}`}>
                  {n.message}
                </p>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-2 block">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {!n.is_read && (
                  <button 
                    onClick={() => markAsRead(n.notification_id)}
                    className="p-2 bg-slate-50 hover:bg-green-50 text-slate-400 hover:text-green-600 rounded-xl transition-colors"
                  >
                    <Check size={16} />
                  </button>
                )}
                <button 
                  onClick={() => deleteNotification(n.notification_id)}
                  className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Inbox is completely empty</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotifications;