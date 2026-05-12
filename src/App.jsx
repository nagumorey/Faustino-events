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
    const hash = window.location.hash;
    const search = window.location.search;
    return hash.includes('type=recovery') || 
           hash.includes('access_token=') || 
           search.includes('type=recovery') ||
           hash.includes('error_description=Email+link+is+invalid');
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
      setRole('client'); 
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (initialSession) {
          setSession(initialSession);
          if (!isRecoveryMode) {
            fetchUserRole(initialSession.user.id);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (mounted) {
          setTimeout(() => setLoading(false), 600);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) return;
      
      if (event === 'PASSWORD_RECOVERY') {
        setSession(currentSession);
        return;
      }

      if (event === 'SIGNED_IN' && currentSession) {
        setSession(currentSession);
        if (!isRecoveryMode) {
          fetchUserRole(currentSession.user.id);
        }
      } 
      
      if (event === 'SIGNED_OUT') {
        setRole(null);
        setSession(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserRole, isRecoveryMode]); 

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-[#D4AF37] font-bold tracking-widest uppercase">
        <div className="animate-pulse italic text-center">
          FAUSTINO'S EVENT PLACE
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home isRecovering={isRecoveryMode} />} />
        
        <Route 
          path="/ClientDashboard" 
          element={isRecoveryMode ? <Navigate to="/" replace /> : <ClientDashboard isGuest={!session} />} 
        />
        
        <Route 
          path="/AdminDashboard" 
          element={!isRecoveryMode && session && role === 'admin' ? <AdminDashboard /> : <Navigate to="/" replace />} 
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;