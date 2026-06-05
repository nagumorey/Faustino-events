import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
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
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
      <div className="text-xs font-black tracking-widest uppercase animate-pulse text-yellow-500">
        Loading Admin Profile...
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] font-sans">
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold bg-gradient-to-r from-yellow-500 to-yellow-400 bg-clip-text text-transparent">Admin Profile</h1>
            <p className="text-gray-400 text-xs mt-1 uppercase tracking-wider font-semibold">Manage your account information and security</p>
          </div>
          <Link 
            to="/AdminDashboard" 
            className="px-4 py-2 bg-yellow-500 text-black text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/20"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Profile Card */}
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4 shadow-md border border-yellow-500/30">
              <User size={40} className="text-yellow-500" />
            </div>
            <h2 className="text-xl font-bold text-white">{adminInfo?.username || 'Faustino Admin'}</h2>
            <span className="mt-1 px-3 py-1 bg-yellow-500/20 text-yellow-400 text-[10px] font-black uppercase tracking-wider rounded-full border border-yellow-500/30">
              System Administrator
            </span>
            <div className="w-full border-t border-white/10 my-6"></div>
            <div className="w-full flex items-center gap-3 text-left px-4 py-3 bg-white/5 rounded-xl border border-white/10">
              <Mail size={16} className="text-yellow-500" />
              <div className="flex flex-col truncate">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Email Address</span>
                <span className="text-xs font-bold text-white truncate">{adminInfo?.email || 'No email linked'}</span>
              </div>
            </div>
          </div>

          {/* Security Card */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20">
            <div className="flex items-center gap-2 mb-6 border-b border-white/20 pb-4">
              <Lock size={18} className="text-yellow-500" />
              <h3 className="text-lg font-bold text-white">Security & Credentials</h3>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full pl-4 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-sm font-semibold text-white placeholder:text-gray-500 outline-none focus:border-yellow-500 transition-all"
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-500 transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-2">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full pl-4 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-sm font-semibold text-white placeholder:text-gray-500 outline-none focus:border-yellow-500 transition-all"
                    placeholder="Repeat your new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-500 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="w-full sm:w-auto px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-yellow-500/20"
                >
                  <ShieldCheck size={16} />
                  {updatingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;