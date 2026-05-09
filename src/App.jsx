import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseclient'; 
import Home from './pages/home'; 
import ClientDashboard from './pages/Dashboard'; 
import AdminDashboard from './pages/AdminDashboard'; 

function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mas matalinong detection ng recovery mode
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      // 1. Kunin ang current session
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      
      if (!mounted) return;

      // 2. KUNG RECOVERY MODE: Patayin agad ang loading para lumitaw ang Home/Modal
      if (isRecoveryMode) {
        setSession(initialSession);
        setLoading(false);
        return; 
      }

      // 3. Kung normal login, i-set ang session at kunin ang role
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

      if (event === 'SIGNED_IN') {
        // Huwag mag-trigger ng role check kung nasa recovery process pa
        if (!isRecoveryMode && currentSession) {
          await fetchUserRole(currentSession.user.id);
        } else {
          setLoading(false);
        }
      } 
      else if (event === 'PASSWORD_RECOVERY') {
        setLoading(false); // Force show the recovery modal
      }
      else if (event === 'SIGNED_OUT') {
        setRole(null);
        setSession(null);
        setLoading(false);
      }
      else if (event === 'USER_UPDATED') {
        // Pagkatapos ng password reset, dito babagsak
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserRole, isRecoveryMode]);

  // Loading Screen
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
        {/* IsRecovering prop is critical for Home.js logic */}
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

        {/* Catch-all para iwas 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;