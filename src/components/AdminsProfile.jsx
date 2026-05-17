import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { User, Lock, Eye, EyeOff, ShieldCheck, Mail } from 'lucide-react';

const AdminProfile = () => {
  const [adminInfo, setAdminInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) throw authError;

        if (user) {
          const { data: adminData, error: dbError } = await supabase
            .from('Admins')
            .select('*')
            .eq('admin_id', user.id)
            .single();

          if (dbError) {
            setAdminInfo({
              email: user.email,
              role: 'Administrator'
            });
          } else {
            setAdminInfo(adminData);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminProfile();
  }, []);

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      alert('Please fill out all password fields.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match. Please check and try again.');
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      alert('Password updated successfully!');
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error(err);
      alert('Error updating password: ' + err.message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
      <div className="text-xs font-black tracking-widest uppercase animate-pulse text-[#D4AF37]">
        Loading Admin Profile...
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-[#F8F9FA] min-h-screen font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-[#1e293b]">Admin Profile</h1>
        <p className="text-slate-500 text-xs mt-1 uppercase tracking-wider font-semibold">Manage your account information and security</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center text-white mb-4 shadow-md">
            <User size={40} className="text-[#D4AF37]" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">{adminInfo?.username || 'Faustino Admin'}</h2>
          <span className="mt-1 px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider rounded-full border border-amber-100">
            System Administrator
          </span>
          <div className="w-full border-t border-slate-100 my-6"></div>
          <div className="w-full flex items-center gap-3 text-left px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
            <Mail size={16} className="text-slate-400" />
            <div className="flex flex-col truncate">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Email Address</span>
              <span className="text-xs font-bold text-slate-700 truncate">{adminInfo?.email || 'No email linked'}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <Lock size={18} className="text-slate-800" />
            <h3 className="text-lg font-bold text-slate-800">Security & Credentials</h3>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-black transition-colors"
                  placeholder="Minimum 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-black transition-colors"
                  placeholder="Repeat your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={updatingPassword}
                className="w-full sm:w-auto px-6 py-3 bg-black hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShieldCheck size={16} />
                {updatingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default AdminProfile;