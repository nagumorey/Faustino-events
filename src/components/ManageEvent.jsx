import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { X } from 'lucide-react';

const ManageEvent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    event_name: '',
    venue: '',
    amount_per_pax: '',
    event_status: 'Available'
  });

  useEffect(() => {
    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('event_id', id)
        .single();
      
      if (data) {
        setFormData(data);
      } else {
        console.error(error);
      }
      setLoading(false);
    };
    fetchEvent();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('events')
      .update({
        event_name: formData.event_name,
        venue: formData.venue,
        amount_per_pax: parseFloat(formData.amount_per_pax),
        event_status: formData.event_status
      })
      .eq('event_id', id);

    if (error) {
      alert('Error updating: ' + error.message);
    } else {
      alert('Package Updated Successfully!');
      navigate('/AdminEvents');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
      <div className="text-xs font-black tracking-widest uppercase animate-pulse text-yellow-500">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-yellow-500/30 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black uppercase tracking-tight text-white">Manage Event</h2>
          <Link to="/AdminEvents" className="text-gray-400 hover:text-yellow-500 transition-colors">
            <X size={20} />
          </Link>
        </div>

        <form onSubmit={handleUpdate} className="space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Package Name</label>
            <input 
              type="text"
              value={formData.event_name}
              onChange={(e) => setFormData({...formData, event_name: e.target.value})}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-gray-500 outline-none focus:border-yellow-500 transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Venue Location</label>
            <input 
              type="text"
              value={formData.venue}
              onChange={(e) => setFormData({...formData, venue: e.target.value})}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-gray-500 outline-none focus:border-yellow-500 transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Price Per Pax (₱)</label>
            <input 
              type="number"
              value={formData.amount_per_pax}
              onChange={(e) => setFormData({...formData, amount_per_pax: e.target.value})}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-gray-500 outline-none focus:border-yellow-500 transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Status</label>
            <select
              value={formData.event_status}
              onChange={(e) => setFormData({...formData, event_status: e.target.value})}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-yellow-500 transition-all"
            >
              <option value="Available" className="bg-[#1a1a2e]">Available</option>
              <option value="Unavailable" className="bg-[#1a1a2e]">Unavailable</option>
            </select>
          </div>

          <button 
            type="submit"
            className="w-full bg-yellow-500 text-black py-4 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20"
          >
            Update Package
          </button>
        </form>
      </div>
    </div>
  );
};

export default ManageEvent;