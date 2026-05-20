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
    event_status: 'Available',
    featured_event: false
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
        event_status: formData.event_status,
        featured_event: formData.featured_event
      })
      .eq('event_id', id);

    if (error) {
      alert('Error updating: ' + error.message);
    } else {
      alert('Package Updated Successfully!');
      navigate('/AdminEvents');
    }
  };

  if (loading) return <div className="p-10">Loading...</div>;

  return (
    <div className="p-8 bg-[#F8F9FA] min-h-screen">
      <div className="max-w-md mx-auto bg-white rounded-[2rem] p-8 border border-slate-100 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Manage Event</h2>
          <Link to="/AdminEvents" className="text-slate-400 hover:text-black">
            <X size={20} />
          </Link>
        </div>

        <form onSubmit={handleUpdate} className="space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Package Name</label>
            <input 
              type="text"
              value={formData.event_name}
              onChange={(e) => setFormData({...formData, event_name: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-[#B8860B]"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Venue Location</label>
            <input 
              type="text"
              value={formData.venue}
              onChange={(e) => setFormData({...formData, venue: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-[#B8860B]"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Price Per Pax (₱)</label>
            <input 
              type="number"
              value={formData.amount_per_pax}
              onChange={(e) => setFormData({...formData, amount_per_pax: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-[#B8860B]"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Status</label>
            <select
              value={formData.event_status}
              onChange={(e) => setFormData({...formData, event_status: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-[#B8860B]"
            >
              <option value="Available">Available</option>
              <option value="Unavailable">Unavailable</option>
            </select>
          </div>

          <button 
            type="submit"
            className="w-full bg-black text-white py-4 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-[#B8860B] transition-all"
          >
            Update Package
          </button>
        </form>
      </div>
    </div>
  );
};

export default ManageEvent;