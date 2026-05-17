import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Check, X, Calendar, Clock, Users, Save } from 'lucide-react';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingValues, setEditingValues] = useState({});

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('appointment_date', { ascending: false });

      if (error) {
        console.error("Fetch Error:", error.message);
      } else {
        setBookings(data || []);
        const initialInputs = {};
        data.forEach(b => {
          initialInputs[b.booking_id] = b.paid_amount || 0;
        });
        setEditingValues(initialInputs);
      }
    } catch (err) {
      console.error("Runtime Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleApproveBooking = async (bookingId) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ booking_status: 'Approved' }) 
        .eq('booking_id', bookingId);

      if (error) throw error;
      alert('Reservation Approved successfully!');
      fetchBookings();
    } catch (err) {
      console.error("Approve Error:", err);
      alert('Error approving booking: ' + err.message);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ booking_status: 'Cancelled' }) 
        .eq('booking_id', bookingId);

      if (error) throw error;
      alert('Reservation Cancelled.');
      fetchBookings();
    } catch (err) {
      console.error("Cancel Error:", err);
      alert('Error cancelling booking: ' + err.message);
    }
  };

  const handlePaidAmountChange = (bookingId, value) => {
    setEditingValues({
      ...editingValues,
      [bookingId]: value
    });
  };

  const savePaymentUpdate = async (bookingId, totalAmount) => {
    try {
      const newPaidAmount = parseFloat(editingValues[bookingId]) || 0;
      let newPaymentStatus = 'Unpaid';

      if (newPaidAmount >= totalAmount) {
        newPaymentStatus = 'Paid';
      } else if (newPaidAmount > 0 && newPaidAmount < totalAmount) {
        newPaymentStatus = 'Downpayment';
      }

      const { error } = await supabase
        .from('bookings')
        .update({
          paid_amount: newPaidAmount,
          payment_status: newPaymentStatus
        })
        .eq('booking_id', bookingId);

      if (error) throw error;
      alert('Payment details updated successfully!');
      fetchBookings();
    } catch (err) {
      console.error("Payment Save Error:", err);
      alert('Error saving payment: ' + err.message);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
      <div className="text-xs font-black tracking-widest uppercase animate-pulse text-[#D4AF37]">
        Fetching Faustino's Records...
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-[#F8F9FA] min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1e293b]">Reservations Manager</h1>
          <p className="text-slate-500 text-xs mt-1 uppercase tracking-wider font-semibold">Real-time Booking Updates</p>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black text-white text-[10px] uppercase tracking-[0.2em]">
                <th className="p-5">Booking ID</th>
                <th className="p-5">Event Details</th>
                <th className="p-5">Schedule</th>
                <th className="p-5">Financials</th>
                <th className="p-5">Status</th>
                <th className="p-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bookings.length > 0 ? (
                bookings.map((b) => (
                  <tr key={b.booking_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 font-bold text-slate-800 text-sm">#{b.booking_id}</td>
                    
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-bold text-sm">{b.event_type || 'Wedding Package'}</span>
                        <div className="flex items-center gap-1.5 text-slate-500 mt-1">
                          <Users size={12} className="text-slate-400" />
                          <span className="text-xs font-semibold">{b.total_pax !== null && b.total_pax !== undefined ? b.total_pax : 0} Pax</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono mt-1 max-w-[120px] truncate">{b.user_id}</span>
                      </div>
                    </td>

                    <td className="p-5">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
                          <Calendar size={14} className="text-slate-400" />
                          {b.appointment_date}
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                          <Clock size={14} className="text-slate-400" />
                          <span>
                            {b.appointment_time ? b.appointment_time.substring(0, 5) : '00:00'} 
                            {b.end_time ? ` - ${b.end_time.substring(0, 5)}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-5">
                      <div className="flex flex-col gap-2 max-w-[160px]">
                        <div className="text-xs text-slate-500 font-bold">Total: ₱{parseFloat(b.amount || 0).toLocaleString()}</div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-400">₱</span>
                          <input 
                            type="number"
                            value={editingValues[b.booking_id] !== undefined ? editingValues[b.booking_id] : (b.paid_amount || 0)}
                            onChange={(e) => handlePaidAmountChange(b.booking_id, e.target.value)}
                            className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold outline-none focus:border-black"
                          />
                          <button
                            onClick={() => savePaymentUpdate(b.booking_id, b.amount)}
                            className="p-1.5 bg-black text-white hover:bg-slate-800 rounded-md transition-colors"
                            title="Save Payment Amount"
                          >
                            <Save size={12} />
                          </button>
                        </div>
                      </div>
                    </td>

                    <td className="p-5">
                      <div className="flex flex-col gap-2">
                        <span className={`w-fit px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          b.booking_status === 'Approved' || b.booking_status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                          b.booking_status === 'Cancelled' || b.booking_status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {b.booking_status || 'Pending'}
                        </span>
                        <span className={`w-fit px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          b.payment_status === 'Paid' || b.payment_status === 'PAID' ? 'bg-green-100 text-green-700' :
                          b.payment_status === 'Downpayment' || b.payment_status === 'DOWNPAYMENT' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {b.payment_status || 'Unpaid'}
                        </span>
                      </div>
                    </td>

                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {b.booking_status !== 'Approved' && b.booking_status !== 'APPROVED' && b.booking_status !== 'Cancelled' && b.booking_status !== 'CANCELLED' && (
                          <>
                            <button
                              onClick={() => handleApproveBooking(b.booking_id)}
                              className="p-2 bg-slate-50 hover:bg-green-50 text-slate-400 hover:text-green-600 rounded-xl transition-colors"
                              title="Approve Booking"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => handleCancelBooking(b.booking_id)}
                              className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors"
                              title="Cancel Booking"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                        {(b.booking_status === 'Approved' || b.booking_status === 'APPROVED') && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">Completed</span>
                        )}
                        {(b.booking_status === 'Cancelled' || b.booking_status === 'CANCELLED') && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 px-2">Rejected</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-slate-400 text-xs uppercase font-bold tracking-widest">
                    No reservations found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminBookings;