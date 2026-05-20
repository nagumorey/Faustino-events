import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Wallet, Info } from 'lucide-react';
import { useVoice } from './hooks/useVoice';

const OnlinePaymentModal = () => {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveWallet = async () => {
      try {
        const { data, error } = await supabase
          .from('wallets')
          .select('*')
          .eq('platform', 'GCash')
          .maybeSingle();

        if (error) throw error;
        setWallet(data);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveWallet();
  }, []);

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-12 bg-slate-100 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <Wallet size={18} />
        </div>
        <h3 className="text-base font-bold text-slate-800">Payment Channel Details</h3>
      </div>
      
      <div className="bg-gradient-to-br from-blue-50/60 to-indigo-50/30 border border-blue-100/70 p-5 rounded-xl mb-4">
        <div className="mb-3">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Platform</span>
          <span className="text-sm font-black text-blue-700 font-sans uppercase tracking-wide">
            {wallet?.platform || 'GCash Official'}
          </span>
        </div>

        <div className="mb-3">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Account Name</span>
          <span className="text-sm font-bold text-slate-800">
            {wallet?.account_name || 'Faustino Events Management'}
          </span>
        </div>
        
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Phone Number</span>
          <span className="text-lg font-mono font-black text-slate-900 tracking-normal">
            {wallet?.phone_number || 'No Registered Number'}
          </span>
        </div>
      </div>

      <div className="flex gap-2 items-start bg-amber-50/60 border border-amber-100 p-3 rounded-lg text-amber-800">
        <Info size={14} className="mt-0.5 shrink-0" />
        <p className="text-[11px] font-medium leading-relaxed">
          Paki-send po ang downpayment o buong halaga sa account na nasa itaas bago i-submit ang inyong reference number at screenshot sa katabing form.
        </p>
      </div>
    </div>
  );
};

export default OnlinePaymentModal;