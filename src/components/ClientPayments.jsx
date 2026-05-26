import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Send, UploadCloud, CheckCircle } from 'lucide-react';

const ClientPayment = ({ bookingId, totalAmount, onPaymentSuccess }) => {
  const [referenceNo, setReferenceNo] = useState('');
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [success, setSuccess] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);

  const fetchPaymentMethods = async () => {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('is_active', true);
    
    if (!error && data) {
      setPaymentMethods(data);
      if (data.length > 0) {
        setSelectedMethod(data[0]);
      }
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const getMethodIcon = (platform) => {
    switch(platform) {
      case 'GCash': return '📱';
      case 'PayMaya': return '💳';
      case 'Bank Transfer': return '🏦';
      case 'Credit Card': return '💎';
      default: return '💰';
    }
  };

  const getAccountDisplay = (method) => {
    if (!method) return '';
    if (method.platform === 'Bank Transfer') {
      return method.account_number;
    }
    return method.phone_number;
  };

  const handleUploadAndSubmit = async (e) => {
    e.preventDefault();
    if (!file || !referenceNo) return alert('Paki-fill up lahat ng fields, tol!');

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${bookingId}-${Date.now()}.${fileExt}`;
      const filePath = `online-payments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const generatedTxId = `TX-ONLINE-${Date.now()}`;
      const { error: txError } = await supabase
        .from('transactions')
        .insert([
          {
            transaction_id: generatedTxId,
            booking_id: parseInt(bookingId, 10),
            transaction_date: new Date().toISOString(),
            amount_paid: 0,
            payment_method: selectedMethod?.platform,
            payment_status: 'Pending',
            reference_no: referenceNo,
            proof_of_payment: filePath
          }
        ]);

      if (txError) throw txError;

      await supabase.from("notifications").insert([
        {
          booking_id: parseInt(bookingId, 10),
          is_read: false,
          message: `New Payment Submitted: ₱${parseFloat(totalAmount).toLocaleString()} via ${selectedMethod?.platform}. Waiting for verification.`,
        }
      ]);

      setSuccess(true);
      if (onPaymentSuccess) onPaymentSuccess();
    } catch (error) {
      console.error(error);
      alert('Error sa pag-submit: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-green-100 shadow-sm text-center">
        <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800">Payment Submitted!</h3>
        <p className="text-xs text-slate-500 mt-2">Nakatanggap na kami ng proof of payment. Antayin na lang ang verification ng Admin.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleUploadAndSubmit} className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="mb-6">
        <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Select Payment Method</label>
        <div className="grid grid-cols-2 gap-3">
          {paymentMethods.map((method) => (
            <button
              key={method.wallet_id}
              type="button"
              onClick={() => setSelectedMethod(method)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedMethod?.wallet_id === method.wallet_id 
                  ? "border-[#B8860B] bg-[#B8860B]/10" 
                  : "border-gray-200"
              }`}
            >
              <span className="text-2xl mb-1 block">{getMethodIcon(method.platform)}</span>
              <p className="font-bold text-sm">{method.platform}</p>
              <p className="text-[8px] text-gray-400 mt-1">
                {method.platform === 'Bank Transfer' ? method.account_number?.substring(0,15) : method.phone_number}
              </p>
            </button>
          ))}
        </div>
      </div>

      {selectedMethod && (
        <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-100 text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Send payment to {selectedMethod.platform}:</p>
          <p className="text-xl font-black text-[#B8860B] my-2 tracking-wider">
            {getAccountDisplay(selectedMethod)}
          </p>
          <p className="text-[10px] font-bold text-slate-500 uppercase">Account Name: {selectedMethod.account_name}</p>
        </div>
      )}

      <h3 className="text-base font-bold text-slate-800 mb-1">Submit Your Receipt</h3>
      <p className="text-xs text-slate-400 mb-4">Total Amount: ₱{parseFloat(totalAmount).toLocaleString()}.00</p>
      
      <div className="mb-4">
        <label className="text-xs font-bold text-slate-600 block mb-1">
          {selectedMethod?.platform === 'Bank Transfer' ? 'Transaction Reference Number' : 'Reference Number'}
        </label>
        <input 
          type="text" 
          value={referenceNo}
          onChange={(e) => setReferenceNo(e.target.value)}
          className="w-full border border-slate-200 px-3 py-2 text-sm rounded-xl outline-none focus:border-black font-semibold" 
          placeholder="I-paste ang reference number"
          required
        />
      </div>

      <div className="mb-5">
        <label className="text-xs font-bold text-slate-600 block mb-1">Proof of Payment</label>
        <div className="relative border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-6 transition-colors flex flex-col items-center justify-center bg-slate-50/50">
          <UploadCloud size={32} className="text-slate-400 mb-2" />
          <span className="text-xs text-slate-500 font-medium text-center">
            {file ? file.name : 'I-click o i-drag ang screenshot dito'}
          </span>
          <input 
            type="file" 
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0])}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            required
          />
        </div>
      </div>

      <button 
        type="submit" 
        disabled={uploading}
        className="w-full bg-black text-white hover:bg-slate-800 p-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:bg-slate-200"
      >
        <Send size={12} />
        {uploading ? 'Nag-a-upload...' : 'Submit Payment'}
      </button>
    </form>
  );
};

export default ClientPayment;