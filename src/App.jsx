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
    if (!userId) {
      setLoading(false);
      return;
    }
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      
      if (!mounted) return;

      if (isRecoveryMode) {
        setSession(initialSession);
        setLoading(false);
        return; 
      }

      if (initialSession) {
        setSession(initialSession);
        await fetchUserRole(initialSession.user.id);
      } else {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;
      
      setSession(currentSession);

      // Ang fix: Siguradong mamamatay ang loading sa kahit anong event
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (currentSession && !isRecoveryMode) {
          await fetchUserRole(currentSession.user.id);
        } else {
          setLoading(false);
        }
      } 
      else if (event === 'SIGNED_OUT') {
        setRole(null);
        setSession(null);
        setLoading(false);
      }
      else {
        // Para sa PASSWORD_RECOVERY, USER_UPDATED, etc.
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserRole, isRecoveryMode]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-yellow-500 font-black tracking-widest uppercase">
        <div className="animate-pulse">Faustino Events...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home isRecovering={isRecoveryMode} />} />
        
        <Route 
          path="/ClientDashboard" 
          element={session ? <ClientDashboard /> : <Navigate to="/" replace />} 
        />
        
        <Route 
          path="/AdminDashboard" 
          element={
            session && role === 'admin' 
              ? <AdminDashboard /> 
              : <Navigate to="/" replace />
          } 
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;