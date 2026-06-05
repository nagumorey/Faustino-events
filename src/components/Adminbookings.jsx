import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { Check, X, Calendar, Clock, Users, FileImage, User, Search, Percent, CreditCard, Trash2, PlusCircle, RefreshCw } from 'lucide-react';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [additionalPayment, setAdditionalPayment] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          transactions (
            proof_of_payment
          )
        `)
        .order('booking_id', { ascending: false });

      if (bookingsError) throw bookingsError;
      
      if (!bookingsData || bookingsData.length === 0) {
        setBookings([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(bookingsData.map(b => b.user_id).filter(id => id))];
      const eventIds = [...new Set(bookingsData.map(b => b.event_id).filter(id => id && id !== null))];

      const [clientsResult, eventsResult] = await Promise.all([
        userIds.length > 0 
          ? supabase.from('clients').select('user_id, first_name, last_name, email').in('user_id', userIds)
          : { data: [] },
        eventIds.length > 0 
          ? supabase.from('events').select('event_id, event_name').in('event_id', eventIds)
          : { data: [] }
      ]);

      const clientsMap = {};
      if (clientsResult.data) {
        clientsResult.data.forEach(client => {
          clientsMap[client.user_id] = {
            name: `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown',
            email: client.email || 'No email'
          };
        });
      }

      const eventsMap = {};
      if (eventsResult.data) {
        eventsResult.data.forEach(event => {
          eventsMap[event.event_id] = event.event_name;
        });
      }

      const enrichedBookings = bookingsData.map(b => {
        let finalEventName = 'Unknown Event';
        
        if (b.party_package && b.party_package !== 'NULL' && b.party_package !== null && b.party_package !== 'null') {
          finalEventName = b.party_package;
        }
        else if (b.event_id && eventsMap[b.event_id]) {
          finalEventName = eventsMap[b.event_id];
        }
        else if (b.event_type && b.event_type !== 'NULL' && b.event_type !== null && b.event_type !== 'null') {
          finalEventName = b.event_type;
        }
        else if (b.event_name && b.event_name !== 'NULL' && b.event_name !== null && b.event_name !== 'null') {
          finalEventName = b.event_name;
        }
        
        const totalAmount = parseFloat(b.total_amount || b.amount || 0);
        const paidAmt = parseFloat(b.amount_paid || 0);
        const downAmt = parseFloat(b.down_payment || 0);
        const remainingBal = parseFloat(b.remaining_balance || (totalAmount - paidAmt) || 0);
        
        let clientName = 'Guest User';
        let clientEmail = 'No email';
        
        const clientFromMap = clientsMap[b.user_id];
        if (clientFromMap && clientFromMap.name !== 'Unknown') {
          clientName = clientFromMap.name;
          clientEmail = clientFromMap.email;
        } else if (b.first_name && b.first_name !== 'NULL' && b.first_name !== null && b.first_name !== 'Guest') {
          clientName = `${b.first_name} ${b.last_name || ''}`.trim();
          clientEmail = b.email || 'No email';
        } else if (b.email && b.email !== 'NULL') {
          clientName = b.email.split('@')[0];
          clientEmail = b.email;
        }
        
        return {
          ...b,
          client_info: { name: clientName, email: clientEmail },
          event_name: finalEventName,
          total_amount_display: totalAmount,
          amount_paid_display: paidAmt,
          down_payment_display: downAmt,
          remaining_balance_display: remainingBal > 0 ? remainingBal : 0
        };
      });
      
      setBookings(enrichedBookings);
      
      const initialPayments = {};
      enrichedBookings.forEach(b => {
        initialPayments[b.booking_id] = '';
      });
      setAdditionalPayment(initialPayments);
      
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleApproveBooking = async (bookingId) => {
    try {
      const numericBookingId = parseInt(bookingId, 10);
      const { error } = await supabase
        .from('bookings')
        .update({ booking_status: 'Approved' })
        .eq('booking_id', numericBookingId);

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
        .eq('booking_id', parseInt(bookingId, 10));

      if (error) throw error;
      alert('Reservation Cancelled.');
      fetchBookings();
    } catch (err) {
      console.error("Cancel Error:", err);
      alert('Error cancelling booking: ' + err.message);
    }
  };

  const handleMarkAsRefunded = async (booking) => {
    const refundAmount = booking.amount_paid_display || booking.amount_paid || 0;
    
    if (refundAmount <= 0) {
      alert('No payment to refund for this booking.');
      return;
    }
    
    if (!window.confirm(`Process refund for booking #${booking.booking_id}? Amount: ₱${refundAmount.toLocaleString()}\n\nMake sure you have already sent the money back to the client via ${booking.payment_method || 'their payment method'}.`)) {
      return;
    }
    
    try {
      const numericBookingId = parseInt(booking.booking_id, 10);
      
      const updateData = {
        payment_status: 'Refunded',
        refund_date: new Date().toISOString(),
        refund_amount: refundAmount,
        amount_paid: 0,
        remaining_balance: booking.total_amount_display
      };
      
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('booking_id', numericBookingId);

      if (error) throw error;
      
      await supabase.from('notifications').insert([
        {
          booking_id: numericBookingId,
          is_read: false,
          message: `✅ REFUND COMPLETED: Booking #${booking.booking_id}. Amount: ₱${refundAmount.toLocaleString()} has been refunded to the client.`,
        }
      ]);
      
      alert(`Refund marked as completed for Booking #${booking.booking_id}!`);
      fetchBookings();
    } catch (err) {
      console.error("Refund Error:", err);
      alert('Error processing refund: ' + err.message);
    }
  };

  const handleAdditionalPaymentChange = (bookingId, value) => {
    const newValue = value === '' ? '' : parseFloat(value);
    setAdditionalPayment(prev => ({
      ...prev,
      [bookingId]: isNaN(newValue) ? '' : newValue
    }));
  };

  const addPayment = async (bookingId, totalAmount, currentPaidAmount, currentDownPayment) => {
    try {
      const numericBookingId = parseInt(bookingId, 10);
      const addAmount = parseFloat(additionalPayment[bookingId]);
      
      if (isNaN(addAmount) || addAmount <= 0) {
        alert('Please enter a valid payment amount');
        return;
      }
      
      const parsedTotal = parseFloat(totalAmount) || 0;
      const newPaidAmount = currentPaidAmount + addAmount;
      
      let newPaymentStatus = 'Downpayment';
      let newDownPayment = currentDownPayment;
      let newRemainingBalance = parsedTotal - newPaidAmount;
      
      if (newPaidAmount >= parsedTotal) {
        newPaymentStatus = 'Paid';
        newRemainingBalance = 0;
      }
      
      if (newDownPayment === 0 && addAmount > 0 && newPaidAmount < parsedTotal) {
        newDownPayment = addAmount;
      }

      const updateData = {
        amount_paid: newPaidAmount,
        payment_status: newPaymentStatus,
        down_payment: newDownPayment,
        remaining_balance: newRemainingBalance > 0 ? newRemainingBalance : 0
      };

      const { error: bookingErr } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('booking_id', numericBookingId);

      if (bookingErr) throw bookingErr;

      setAdditionalPayment(prev => ({
        ...prev,
        [bookingId]: ''
      }));

      alert(`Success! Added ₱${addAmount.toLocaleString()} to Booking #${numericBookingId}`);
      fetchBookings();
    } catch (err) {
      console.error("Payment Add Error:", err);
      alert('Error adding payment: ' + err.message);
    }
  };

  const clearPayment = async (bookingId, totalAmount) => {
    if (!window.confirm('Are you sure you want to clear all payments? This cannot be undone.')) return;
    
    try {
      const numericBookingId = parseInt(bookingId, 10);
      
      const updateData = {
        amount_paid: 0,
        payment_status: 'Unpaid',
        down_payment: 0,
        remaining_balance: parseFloat(totalAmount) || 0
      };

      const { error: bookingErr } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('booking_id', numericBookingId);

      if (bookingErr) throw bookingErr;

      setAdditionalPayment(prev => ({
        ...prev,
        [bookingId]: ''
      }));

      alert(`Payment cleared for Booking #${numericBookingId}`);
      fetchBookings();
    } catch (err) {
      console.error("Clear Payment Error:", err);
      alert('Error clearing payment: ' + err.message);
    }
  };

  const openReceipt = (path) => {
    if (!path) return;
    const cleanPath = path.includes('receipts/') ? path.split('receipts/').pop() : path;
    const { data } = supabase.storage.from('receipts').getPublicUrl(cleanPath);
    window.open(data.publicUrl, '_blank');
  };

  const getBookingStatusClass = (status) => {
    if (status === 'Approved' || status === 'APPROVED') {
      return 'bg-green-500/20 text-green-400 border border-green-500/30';
    }
    if (status === 'Cancelled' || status === 'CANCELLED') {
      return 'bg-red-500/20 text-red-400 border border-red-500/30';
    }
    return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
  };

  const getPaymentStatusClass = (status) => {
    if (status === 'Paid' || status === 'PAID') {
      return 'bg-green-500/20 text-green-400 border border-green-500/30';
    }
    if (status === 'Downpayment' || status === 'DOWNPAYMENT') {
      return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    }
    if (status === 'Refund Pending' || status === 'REFUND PENDING') {
      return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    }
    if (status === 'Refunded' || status === 'REFUNDED') {
      return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
    }
    return 'bg-red-500/20 text-red-400 border border-red-500/30';
  };

  const filteredBookings = bookings.filter(booking => {
    const searchLower = searchTerm.toLowerCase();
    const clientName = booking.client_info?.name?.toLowerCase() || '';
    const clientEmail = booking.client_info?.email?.toLowerCase() || '';
    const eventName = booking.event_name?.toLowerCase() || '';
    const bookingIdStr = booking.booking_id?.toString() || '';
    
    return clientName.includes(searchLower) ||
      clientEmail.includes(searchLower) ||
      eventName.includes(searchLower) ||
      bookingIdStr.includes(searchLower);
  });

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
      <div className="text-xs font-black tracking-widest uppercase animate-pulse text-yellow-500">Loading bookings...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] font-sans">
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold bg-gradient-to-r from-yellow-500 to-yellow-400 bg-clip-text text-transparent">Reservations Manager</h1>
            <p className="text-gray-400 text-xs mt-1 uppercase tracking-wider font-semibold">Real-time Booking Updates</p>
          </div>
          <Link to="/AdminDashboard" className="px-4 py-2 bg-yellow-500 text-black text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/20">Back to Dashboard</Link>
        </div>
        
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input type="text" placeholder="Search by client name, email, event, or booking ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-sm font-medium text-white placeholder:text-gray-500 outline-none focus:border-yellow-500 transition-all" />
          </div>
          <div className="text-xs text-gray-500 self-center">Total: {filteredBookings.length} bookings</div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/40 text-yellow-500 text-[10px] uppercase tracking-[0.2em] border-b border-yellow-500/20">
                  <th className="p-5">Client Info</th>
                  <th className="p-5">Event Details</th>
                  <th className="p-5">Schedule</th>
                  <th className="p-5">Financials</th>
                  <th className="p-5">Payment Details</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 text-right">Actions</th>
                  </tr>
                袱
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredBookings.map((b) => (
                  <tr key={b.booking_id} className="hover:bg-white/5 transition-colors">
                    <td className="p-5 align-top">
                      <User size={14} className="text-gray-500 inline mr-2" />
                      <span className="font-bold text-white text-sm">{b.client_info?.name || 'Unknown'}</span>
                      <div className="text-[10px] text-gray-400 font-mono mt-1">{b.client_info?.email || 'No email'}</div>
                      <div className="text-[9px] text-gray-600 mt-1">ID: #{b.booking_id}</div>
                     </td>
                    <td className="p-5 align-top">
                      <div className="text-white font-bold text-sm">{b.event_name}</div>
                      <div className="flex items-center gap-1.5 text-gray-400 mt-1">
                        <Users size={12} />
                        <span className="text-xs font-semibold">{b.total_pax || b.pax || 0} Pax</span>
                      </div>
                      {b.party_package && b.party_package !== 'NULL' && b.party_package !== null && b.party_package !== 'null' && (
                        <div className="text-[9px] text-gray-500 font-mono mt-1">Package: {b.party_package}</div>
                      )}
                     </td>
                    <td className="p-5 align-top">
                      <div className="flex items-center gap-2 text-gray-300 text-xs font-semibold">
                        <Calendar size={14} className="text-gray-500" />
                        Event: {b.event_date || 'TBD'}
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mt-1">
                        <Clock size={14} className="text-gray-500" />
                        Time: {b.start_time ? b.start_time.substring(0, 5) : '00:00'} - {b.end_time ? b.end_time.substring(0, 5) : '00:00'}
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mt-1">
                        <Calendar size={12} className="text-gray-500" />
                        Appt: {b.appointment_date || 'Not set'} {b.appointment_time ? `at ${b.appointment_time.substring(0, 5)}` : ''}
                      </div>
                     </td>
                    <td className="p-5 align-top">
                      <div className="text-xs font-bold">
                        <span className="text-gray-400">Total: </span>
                        <span className="text-white">₱{b.total_amount_display.toLocaleString()}</span>
                      </div>
                      <div className="text-xs mt-1">
                        <span className="text-gray-400">Paid: </span>
                        <span className={`font-bold ${b.payment_status === 'Refunded' ? 'text-purple-400' : 'text-green-400'}`}>
                          ₱{b.amount_paid_display.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[10px] text-gray-500">₱</span>
                          <input type="number" value={additionalPayment[b.booking_id] === '' ? '' : additionalPayment[b.booking_id]} onChange={(e) => handleAdditionalPaymentChange(b.booking_id, e.target.value)} placeholder="Add payment" className="w-full pl-5 pr-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-white placeholder:text-gray-500 outline-none focus:border-yellow-500" disabled={b.payment_status === 'Refunded' || b.payment_status === 'Refund Pending'} />
                        </div>
                        <button onClick={() => addPayment(b.booking_id, b.total_amount_display, b.amount_paid_display, b.down_payment_display)} className="p-1.5 bg-yellow-500 text-black hover:bg-yellow-400 rounded-lg transition-colors" title="Add Payment" disabled={b.payment_status === 'Refunded' || b.payment_status === 'Refund Pending'}>
                          <PlusCircle size={14} />
                        </button>
                        {b.amount_paid_display > 0 && b.payment_status !== 'Refunded' && b.payment_status !== 'Refund Pending' && (
                          <button onClick={() => clearPayment(b.booking_id, b.total_amount_display)} className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors" title="Clear All Payments">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                     </td>
                    <td className="p-5 align-top">
                      {b.down_payment_display > 0 && (
                        <div className="flex items-center gap-2">
                          <Percent size={12} className="text-yellow-500" />
                          <span className="text-[10px] font-bold text-gray-400">Downpayment:</span>
                          <span className="text-xs font-black text-yellow-500">₱{b.down_payment_display.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-gray-500">Balance:</span>
                        <span className={`text-xs font-bold ${b.remaining_balance_display > 0 ? 'text-red-400' : b.payment_status === 'Refunded' ? 'text-purple-400' : 'text-green-400'}`}>
                          ₱{b.remaining_balance_display.toLocaleString()}
                        </span>
                      </div>
                      {b.refund_amount > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <RefreshCw size={10} className="text-purple-400" />
                          <span className="text-[8px] text-purple-400">Refunded: ₱{b.refund_amount.toLocaleString()}</span>
                        </div>
                      )}
                      {b.payment_method && b.payment_method !== 'NULL' && b.payment_method !== null && (
                        <div className="flex items-center gap-1 mt-1">
                          <CreditCard size={10} className="text-gray-500" />
                          <span className="text-[9px] text-gray-400">{b.payment_method}</span>
                        </div>
                      )}
                      {b.payment_date && <div className="text-[8px] text-gray-600 mt-1">Paid: {new Date(b.payment_date).toLocaleDateString()}</div>}
                      {b.refund_date && <div className="text-[8px] text-purple-500 mt-1">Refunded: {new Date(b.refund_date).toLocaleDateString()}</div>}
                     </td>
                    <td className="p-5 align-top">
                      <span className={`w-fit px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getBookingStatusClass(b.booking_status)}`}>
                        {b.booking_status || 'Pending'}
                      </span>
                      <div className="mt-1">
                        <span className={`w-fit px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getPaymentStatusClass(b.payment_status)}`}>
                          {b.payment_status === 'Paid' ? 'PAID' : b.payment_status === 'Downpayment' ? 'DOWNPAYMENT' : b.payment_status === 'Refund Pending' ? 'REFUND PENDING' : b.payment_status === 'Refunded' ? 'REFUNDED' : 'UNPAID'}
                        </span>
                      </div>
                      {b.transactions?.[0]?.proof_of_payment && (
                        <button onClick={() => openReceipt(b.transactions[0].proof_of_payment)} className="flex items-center gap-1 text-[9px] font-bold text-blue-400 hover:text-blue-300 uppercase underline mt-2">
                          <FileImage size={10} /> View Receipt
                        </button>
                      )}
                     </td>
                    <td className="p-5 text-right align-top">
                      <div className="flex flex-wrap justify-end gap-2">
                        {b.booking_status !== 'Approved' && b.booking_status !== 'APPROVED' && b.booking_status !== 'Cancelled' && b.booking_status !== 'CANCELLED' && (
                          <>
                            <button onClick={() => handleApproveBooking(b.booking_id)} className="p-2 bg-white/5 hover:bg-green-500/20 text-gray-400 hover:text-green-400 rounded-xl transition-colors" title="Approve Booking">
                              <Check size={16} />
                            </button>
                            <button onClick={() => handleCancelBooking(b.booking_id)} className="p-2 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-xl transition-colors" title="Cancel Booking">
                              <X size={16} />
                            </button>
                          </>
                        )}
                        {(b.booking_status === 'Approved' || b.booking_status === 'APPROVED') && <span className="text-[9px] text-green-400 font-bold uppercase">Approved</span>}
                        {(b.booking_status === 'Cancelled' || b.booking_status === 'CANCELLED') && <span className="text-[9px] text-red-400 font-bold uppercase">Cancelled</span>}
                      </div>
                      {b.payment_status === 'Refund Pending' && (
                        <button onClick={() => handleMarkAsRefunded(b)} className="mt-2 px-3 py-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-purple-500 hover:text-white transition-all flex items-center gap-1">
                          <RefreshCw size={12} /> Mark as Refunded
                        </button>
                      )}
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBookings;