import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

const AdminEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    event_name: '',
    venue: '',
    amount_per_pax: '',
    event_status: 'Available',
    featured_event: false
  });

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*');

      if (error) {
        console.error(error.message);
      } else {
        setEvents(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('events')
        .insert([
          {
            event_name: formData.event_name,
            venue: formData.venue,
            amount_per_pax: parseFloat(formData.amount_per_pax) || 0,
            event_status: formData.event_status,
            featured_event: formData.featured_event
          }
        ]);

      if (error) throw error;

      alert('Event Package Created Successfully!');
      setIsModalOpen(false);
      setFormData({
        event_name: '',
        venue: '',
        amount_per_pax: '',
        event_status: 'Available',
        featured_event: false
      });
      fetchEvents();
    } catch (err) {
      alert('Error inserting package: ' + err.message);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
      <div className="text-xs font-black tracking-widest uppercase animate-pulse text-[#D4AF37]">
        Loading Faustino's Packages...
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-[#F8F9FA] min-h-screen font-sans relative">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-serif font-bold text-[#1e293b]">Event Packages</h1>
        
        <div className="flex gap-3">
          <Link 
            to="/AdminDashboard" 
            className="px-4 py-2 bg-slate-800 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-black transition-colors"
          >
            Back to Dashboard
          </Link>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-black text-white px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all"
          >
            Add New Package
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.length > 0 ? (
          events.map((e) => (
            <div key={e.event_id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter ${
                    e.event_status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {e.event_status || 'Unavailable'}
                  </span>
                  {e.featured_event && (
                    <span className="text-[10px] text-[#D4AF37] font-bold uppercase italic">★ Featured</span>
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 mb-1">{e.event_name}</h3>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-4">
                  {e.venue || 'No Venue Set'}
                </p>
                
                <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Price per Pax</p>
                    <p className="text-lg font-black text-slate-900">₱{parseFloat(e.amount_per_pax || 0).toLocaleString()}</p>
                  </div>
                  <Link 
                    to={`/ManageEvent/${e.event_id}`} 
                    className="text-[10px] font-black uppercase text-blue-600 hover:underline"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full p-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">No events in database</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full rounded-[2rem] p-8 border border-slate-100 shadow-2xl relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute right-6 top-6 text-slate-400 hover:text-black transition-colors"
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Create New Package</h2>
              <div className="h-1 w-12 bg-[#B8860B] mt-2"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 block">Package Name</label>
                <input 
                  type="text"
                  name="event_name"
                  required
                  value={formData.event_name}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-[#B8860B] transition-all"
                  placeholder="e.g., Baptismal Package"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 block">Venue Location</label>
                <input 
                  type="text"
                  name="venue"
                  required
                  value={formData.venue}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-[#B8860B] transition-all"
                  placeholder="e.g., Manila Hotel Garden"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 block">Price Per Pax (₱)</label>
                <input 
                  type="number"
                  name="amount_per_pax"
                  required
                  value={formData.amount_per_pax}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-[#B8860B] transition-all"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 block">Availability Status</label>
                <select
                  name="event_status"
                  value={formData.event_status}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-[#B8860B] transition-all"
                >
                  <option value="Available">Available</option>
                  <option value="Unavailable">Unavailable</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox"
                  id="featured_event"
                  name="featured_event"
                  checked={formData.featured_event}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded text-[#B8860B] focus:ring-[#B8860B]"
                />
                <label htmlFor="featured_event" className="text-xs font-bold text-slate-600 uppercase tracking-wider select-none">
                  Mark as Featured Event
                </label>
              </div>

              <button 
                type="submit"
                className="w-full bg-black text-white py-4 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-[#B8860B] transition-all shadow-lg mt-4"
              >
                Save Package
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEvents;