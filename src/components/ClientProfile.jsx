import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { User, Save, X, Edit2 } from 'lucide-react';

const ClientProfile = ({ onClick }) => {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ first_name: "", last_name: "", phone_number: "" });

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('clients')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();
        setProfile(data);
        setFormData({ 
          first_name: data?.first_name || "", 
          last_name: data?.last_name || "", 
          phone_number: data?.phone_number || "" 
        });
      }
    };
    fetchProfile();
  }, []);

  const handleUpdate = async () => {
    const { error } = await supabase
      .from('clients')
      .update(formData)
      .eq('email', profile.email);
    
    if (!error) {
      setProfile({ ...profile, ...formData });
      setIsEditing(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="flex flex-col gap-4">
      <div 
        onClick={onClick} 
        className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-200 transition-all"
      >
        <User size={20} className="text-slate-600" />
      </div>

      {isEditing ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xl absolute top-20 right-6 w-80 z-50">
          <h3 className="font-black uppercase text-sm mb-4">Edit Profile</h3>
          <input className="w-full bg-slate-50 p-2 rounded mb-2 text-sm" placeholder="First Name" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
          <input className="w-full bg-slate-50 p-2 rounded mb-2 text-sm" placeholder="Last Name" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
          <input className="w-full bg-slate-50 p-2 rounded mb-4 text-sm" placeholder="Phone Number" value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} />
          <div className="flex gap-2">
            <button onClick={handleUpdate} className="flex-1 bg-black text-white py-2 rounded text-[10px] font-black uppercase">Save</button>
            <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-100 py-2 rounded text-[10px] font-black uppercase">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="hidden">
          <p>{profile.first_name} {profile.last_name}</p>
          <p>{profile.email}</p>
          <p>{profile.phone_number}</p>
          <button onClick={() => setIsEditing(true)}><Edit2 size={16} /></button>
        </div>
      )}
    </div>
  );
};

export default ClientProfile;