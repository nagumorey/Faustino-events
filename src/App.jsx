import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; 
import Home from './pages/home'; 
import ClientDashboard from './pages/Dashboard'; 
import AdminDashboard from './pages/AdminDashboard'; 

function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const isRecoveryMode = useMemo(() => {
    const url = window.location.href;
    return url.includes('type=recovery') || url.includes('access_token=') || window.location.hash.includes('access_token');
  }, []);

  const fetchUserRole = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const { data: adminData, error } = await supabase
        .from('Admins') 
        .select('admin_id')
        .eq('admin_id', userId)
        .maybeSingle();

      if (error) throw error;
      setRole(adminData ? 'admin' : 'client');
    } catch (err) {
      console.error("Error fetching role:", err.message);
      setRole('client'); 
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // 1. Emergency timer para hindi ma-stuck sa loading screen
    const emergencyTimer = setTimeout(() => {
      if (mounted && loading) setLoading(false);
    }, 1500);

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (initialSession) {
          setSession(initialSession);
          fetchUserRole(initialSession.user.id);
        }
      } catch (error) {
        console.error("Auth error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) return;
      
      setSession(currentSession);

      if (event === 'SIGNED_IN' && currentSession) {
        if (!isRecoveryMode) fetchUserRole(currentSession.user.id);
        setLoading(false); 
      } 
      
      if (event === 'SIGNED_OUT') {
        setRole(null);
        setSession(null);
        setLoading(false);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(emergencyTimer);
    };
  }, [fetchUserRole, isRecoveryMode]); 

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-[#D4AF37] font-bold tracking-widest uppercase">
        <div className="animate-pulse italic">FAUSTINO'S...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home isRecovering={isRecoveryMode} />} />
        
        {/* CLIENT DASHBOARD: Pwedeng pasukin kahit walang session (Guest Mode) */}
        <Route 
          path="/ClientDashboard" 
          element={<ClientDashboard isGuest={!session} />} 
        />
        
        {/* ADMIN DASHBOARD: Strict access para sa Admin lang */}
        <Route 
          path="/AdminDashboard" 
          element={session && (role === 'admin' || role === null) ? <AdminDashboard /> : <Navigate to="/" replace />} 
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;