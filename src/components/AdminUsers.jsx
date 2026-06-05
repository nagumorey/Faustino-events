import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*');

      if (!error) setUsers(data);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
      <div className="text-xs font-black tracking-widest uppercase animate-pulse text-yellow-500">Loading Users...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] font-sans">
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-serif font-bold bg-gradient-to-r from-yellow-500 to-yellow-400 bg-clip-text text-transparent">Registered Clients</h1>
          <Link 
            to="/AdminDashboard" 
            className="px-4 py-2 bg-yellow-500 text-black text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/20"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 text-yellow-500 text-[10px] uppercase tracking-widest border-b border-yellow-500/20">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Status</th>
              
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/10">
              {users.map((u) => (
                <tr key={u.client_id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-bold text-white">{u.full_name || 'Anonymous User'}</td>
                  <td className="p-4 text-gray-400">{u.email}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-bold uppercase text-green-400">Verified</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;