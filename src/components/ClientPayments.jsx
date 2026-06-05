import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Send, UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react';

const ClientPayment = ({ bookingId, totalAmount, onPaymentSuccess }) => {
  const [referenceNo, setReferenceNo] = useState('');
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
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
    setError('');
    
    if (!selectedMethod) {
      setError('Please select a payment method first');
      return;
    }
    
    if (!file) {
      setError('Please upload your proof of payment');
      return;
    }
    
    if (!referenceNo.trim()) {
      setError('Please enter your reference number');
      return;
    }

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
      const amountToPay = parseFloat(totalAmount);
      
      const { error: txError } = await supabase
        .from('transactions')
        .insert([
          {
            transaction_id: generatedTxId,
            booking_id: parseInt(bookingId, 10),
            transaction_date: new Date().toISOString(),
            amount_paid: amountToPay,
            payment_method: selectedMethod?.platform,
            payment_status: 'Pending',
            reference_no: referenceNo,
            proof_of_payment: filePath
          }
        ]);

      if (txError) throw txError;

      await supabase.from('notifications').insert([
        {
          booking_id: parseInt(bookingId, 10),
          is_read: false,
          message: `New Payment Submitted: ₱${amountToPay.toLocaleString()} via ${selectedMethod?.platform}. Waiting for verification.`,
        }
      ]);

      setSuccess(true);
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    } catch (error) {
      console.error(error);
      setError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-green-500/30 shadow-sm text-center">
        <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white">Payment Submitted</h3>
        <p className="text-xs text-gray-400 mt-2">Your proof of payment has been received. Please wait for admin verification.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleUploadAndSubmit} className="p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-sm">
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-xs font-medium">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Select Payment Method</label>
        <div className="grid grid-cols-2 gap-3">
          {paymentMethods.map((method) => (
            <button
              key={method.wallet_id}
              type="button"
              onClick={() => {
                setSelectedMethod(method);
                setError('');
              }}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedMethod?.wallet_id === method.wallet_id 
                  ? "border-yellow-500 bg-yellow-500/10 text-yellow-500" 
                  : "border-white/20 text-white hover:border-yellow-500/50"
              }`}
            >
              <span className="text-2xl mb-1 block">{getMethodIcon(method.platform)}</span>
              <p className="font-bold text-sm">{method.platform}</p>
              <p className="text-[8px] text-gray-500 mt-1 truncate">
                {method.platform === 'Bank Transfer' ? method.account_number?.substring(0, 15) : method.phone_number}
              </p>
            </button>
          ))}
        </div>
      </div>

      {selectedMethod && (
        <div className="mb-6 p-4 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 rounded-2xl border border-yellow-500/30 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase">Send payment to {selectedMethod.platform}:</p>
          <p className="text-xl font-black text-yellow-500 my-2 tracking-wider select-all">
            {getAccountDisplay(selectedMethod)}
          </p>
          <p className="text-[10px] font-bold text-gray-400 uppercase">Account Name: {selectedMethod.account_name}</p>
        </div>
      )}

      <div className="mb-4">
        <label className="text-xs font-bold text-gray-300 block mb-1">
          Reference Number
        </label>
        <input 
          type="text" 
          value={referenceNo}
          onChange={(e) => {
            setReferenceNo(e.target.value);
            setError('');
          }}
          className="w-full bg-white/10 border border-white/20 px-4 py-3 text-sm rounded-xl text-white placeholder:text-gray-500 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/10 font-medium transition-all" 
          placeholder="Enter your reference number"
          required
        />
      </div>

      <div className="mb-5">
        <label className="text-xs font-bold text-gray-300 block mb-1">Proof of Payment (Screenshot)</label>
        <div className="relative border-2 border-dashed border-white/20 hover:border-yellow-500 rounded-xl p-6 transition-all flex flex-col items-center justify-center bg-white/5 cursor-pointer">
          <UploadCloud size={32} className={`${file ? 'text-yellow-500' : 'text-gray-500'} mb-2 transition-all`} />
          <span className="text-xs text-gray-400 font-medium text-center break-all">
            {file ? file.name : 'Click or drag screenshot here'}
          </span>
          <span className="text-[9px] text-gray-500 mt-1">PNG, JPG, JPEG only</span>
          <input 
            type="file" 
            accept="image/png, image/jpeg, image/jpg"
            onChange={(e) => {
              setFile(e.target.files[0]);
              setError('');
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            required
          />
        </div>
      </div>

      <div className="mb-4 p-3 bg-white/5 rounded-xl flex justify-between items-center border border-white/10">
        <span className="text-xs font-bold text-gray-400">Amount to Pay:</span>
        <span className="text-lg font-black text-yellow-500">₱{parseFloat(totalAmount).toLocaleString()}.00</span>
      </div>

      <button 
        type="submit" 
        disabled={uploading}
        className="w-full bg-yellow-500 text-black hover:bg-yellow-400 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:bg-gray-500 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20"
      >
        {uploading ? (
          <>
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-black border-t-transparent"></div>
            Processing...
          </>
        ) : (
          <>
            <Send size={12} />
            Submit Payment
          </>
        )}
      </button>
    </form>
  );
};

export default ClientPayment;