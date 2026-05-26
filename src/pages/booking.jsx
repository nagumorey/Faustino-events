import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Calendar, Clock, Package, ChevronLeft, AlertTriangle, Users, CreditCard, Wallet, CheckCircle, Percent } from "lucide-react";

const BookNow = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedType, price, price_raw, event_id, party_package } = location.state || {};

  const [formData, setFormData] = useState({
    event_date: "",
    start_time: "",
    end_time: "",
    total_pax: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [paymentType, setPaymentType] = useState("downpayment");
  const [customDownPayment, setCustomDownPayment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const numericPrice = price_raw || parseFloat(price?.replace(/[^\d.]/g, "") || 0);
  const defaultDownPayment = numericPrice * 0.2;
  const fullPaymentAmount = numericPrice;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const resetForm = () => {
    setFormData({
      event_date: "",
      start_time: "",
      end_time: "",
      total_pax: "",
    });
    setSelectedPaymentMethod("");
    setPaymentType("downpayment");
    setCustomDownPayment("");
    setBookingData(null);
    setShowPaymentModal(false);
    setPaymentSuccess(false);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedPaymentMethod("");
    setPaymentType("downpayment");
    setCustomDownPayment("");
    setBookingData(null);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setAlertMessage("Please sign in to continue.");
        setTimeout(() => navigate("/"), 2000);
        return;
      }

      const selectedDate = new Date(formData.event_date);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        setAlertMessage("Invalid Date: You cannot book an event on a past date. Please select today or a future date.");
        setIsSubmitting(false);
        return;
      }

      const { data: clientData } = await supabase
        .from("clients")
        .select("first_name, last_name, phone_number, email")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const { data: eventData } = await supabase
        .from("events")
        .select("event_id, event_name, amount_per_pax, venue")
        .eq("event_id", event_id)
        .maybeSingle();

      const finalEventId = event_id || eventData?.event_id || null;
      const finalEventPrice = eventData?.amount_per_pax || numericPrice;
      const eventVenue = eventData?.venue || "Faustino's Events Place";
      const finalEventName = eventData?.event_name || selectedType;
      const finalPartyPackage = party_package || selectedType;

      const formattedStartTime = `${formData.start_time}:00`;
      const formattedEndTime = `${formData.end_time}:00`;

      if (formattedStartTime >= formattedEndTime) {
        setAlertMessage("Invalid Time: The end time must be later than the start time.");
        setIsSubmitting(false);
        return;
      }

      const { data: existingBookings, error: fetchError } = await supabase
        .from("bookings")
        .select("appointment_time, end_time, booking_status")
        .eq("appointment_date", formData.event_date)
        .neq("booking_status", "Cancelled");

      if (fetchError) throw fetchError;

      const hasOverlap = existingBookings?.some((booking) => {
        const existingStart = booking.appointment_time;
        const existingEnd = booking.end_time;
        return formattedStartTime < existingEnd && formattedEndTime > existingStart;
      });

      if (hasOverlap) {
        setAlertMessage("Slot Not Available: The selected time range overlaps with an existing reservation on this day.");
        setIsSubmitting(false);
        return;
      }

      let firstName = '';
      let lastName = '';
      let email = '';
      let phoneNumber = '';

      if (clientData && clientData.first_name) {
        firstName = clientData.first_name;
        lastName = clientData.last_name || '';
        email = clientData.email || session.user.email;
        phoneNumber = clientData.phone_number || '';
      } else {
        const { data: userData } = await supabase.auth.getUser();
        firstName = userData?.user?.user_metadata?.first_name || session.user.email?.split('@')[0] || 'User';
        lastName = userData?.user?.user_metadata?.last_name || '';
        email = session.user.email;
      }

      const insertData = {
        user_id: session.user.id,
        event_type: selectedType,
        event_name: finalEventName,
        party_package: finalPartyPackage,
        event_date: formData.event_date,
        appointment_date: formData.event_date,
        appointment_time: formattedStartTime,
        end_time: formattedEndTime,
        total_pax: parseInt(formData.total_pax) || 0,
        amount: finalEventPrice,
        total_amount: finalEventPrice,
        price: finalEventPrice,
        payment_status: "Pending",
        booking_status: "Pending",
        down_payment: 0,
        amount_paid: 0,
        remaining_balance: finalEventPrice,
        venue: eventVenue,
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone_number: phoneNumber
      };

      if (finalEventId) {
        insertData.event_id = finalEventId;
      }

      const { data: newBooking, error: insertError } = await supabase
        .from("bookings")
        .insert([insertData])
        .select();

      if (insertError) throw insertError;

      const createdBooking = newBooking[0];
      setBookingData(createdBooking);

      await supabase.from("notifications").insert([
        {
          booking_id: createdBooking.booking_id,
          is_read: false,
          message: `New Booking Alert: ${firstName} ${lastName} booked ${selectedType} on ${formData.event_date} at ${formData.start_time}. Status: Pending Payment.`,
        },
      ]);

      setShowPaymentModal(true);
      setIsSubmitting(false);

    } catch (error) {
      console.error("Booking error:", error);
      setAlertMessage("Error: " + error.message);
      setIsSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedPaymentMethod) {
      alert("Please select a payment method");
      return;
    }

    let amountToPay;
    if (paymentType === "downpayment") {
      if (customDownPayment && customDownPayment > 0) {
        if (customDownPayment > numericPrice) {
          alert("Down payment cannot exceed total amount");
          return;
        }
        amountToPay = parseFloat(customDownPayment);
      } else {
        amountToPay = defaultDownPayment;
      }
    } else {
      amountToPay = fullPaymentAmount;
    }

    setProcessing(true);
    
    const transactionId = `F-${Date.now()}`;

    const updateData = {
      payment_status: paymentType === "downpayment" ? "Partial" : "Paid",
      payment_method: selectedPaymentMethod,
      transaction_id: transactionId,
      payment_date: new Date().toISOString(),
      amount_paid: amountToPay,
      down_payment: paymentType === "downpayment" ? amountToPay : 0,
      remaining_balance: numericPrice - amountToPay,
    };

    const { error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("booking_id", bookingData.booking_id);

    if (!error) {
      await supabase.from("notifications").insert([
        {
          booking_id: bookingData.booking_id,
          is_read: false,
          message: `Payment Received: ₱${amountToPay.toLocaleString()} paid for ${selectedType} on ${formData.event_date}. Payment type: ${paymentType === "downpayment" ? "Down Payment" : "Full Payment"}. Remaining balance: ₱${(numericPrice - amountToPay).toLocaleString()}.`,
        },
      ]);

      setPaymentSuccess(true);
      setShowPaymentModal(false);
      
      setTimeout(() => {
        resetForm();
        navigate("/ClientDashboard");
      }, 2000);
    }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 relative">
      {alertMessage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full rounded-[2rem] p-8 border border-red-100 shadow-2xl text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-2">Reservation Conflict</h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">{alertMessage}</p>
            <button 
              onClick={() => {
                setAlertMessage(null);
                resetForm();
              }}
              className="w-full bg-black text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-colors shadow-lg"
            >
              Okay, I'll Change It
            </button>
          </div>
        </div>
      )}

      {paymentSuccess && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full rounded-[2rem] p-8 text-center">
            <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-black uppercase mb-2">Booking Successful!</h3>
            <p className="text-gray-500 mb-6">Your booking has been confirmed. {paymentType === "downpayment" && `Remaining balance of ₱${(numericPrice - (customDownPayment || defaultDownPayment)).toLocaleString()} is payable before the event.`}</p>
            <button 
              onClick={() => {
                resetForm();
                navigate("/ClientDashboard");
              }}
              className="w-full bg-[#B8860B] text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px]"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      {showPaymentModal && bookingData && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black uppercase">Payment</h3>
              <button onClick={handleClosePaymentModal} className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl mb-6">
              <p className="text-[10px] font-black uppercase text-gray-400">Booking Summary</p>
              <p className="font-bold">{selectedType}</p>
              <p className="text-sm text-gray-600">{formData.event_date} | {formData.start_time} - {formData.end_time}</p>
              <p className="text-sm text-gray-600">Guests: {formData.total_pax}</p>
            </div>

            <div className="mb-6">
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Payment Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setPaymentType("downpayment");
                    setCustomDownPayment("");
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentType === "downpayment" ? "border-[#B8860B] bg-[#B8860B]/10" : "border-gray-200"
                  }`}
                >
                  <Percent size={24} className="mx-auto mb-2" />
                  <p className="font-bold text-sm">Down Payment</p>
                  <p className="text-xs text-gray-500">Min: ₱{defaultDownPayment.toLocaleString()}</p>
                </button>
                <button
                  onClick={() => setPaymentType("full")}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentType === "full" ? "border-[#B8860B] bg-[#B8860B]/10" : "border-gray-200"
                  }`}
                >
                  <CreditCard size={24} className="mx-auto mb-2" />
                  <p className="font-bold text-sm">Full Payment</p>
                  <p className="text-xs text-gray-500">₱{fullPaymentAmount.toLocaleString()}.00</p>
                </button>
              </div>
            </div>

            {paymentType === "downpayment" && (
              <div className="mb-6">
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Enter Down Payment Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₱</span>
                  <input
                    type="number"
                    min={defaultDownPayment}
                    max={numericPrice}
                    step="100"
                    value={customDownPayment}
                    onChange={(e) => setCustomDownPayment(e.target.value)}
                    placeholder={`Minimum: ₱${defaultDownPayment.toLocaleString()}`}
                    className="w-full bg-white border border-gray-200 pl-8 pr-4 py-3 rounded-xl text-sm font-bold focus:ring-4 focus:ring-[#B8860B]/5 focus:border-[#B8860B] outline-none transition-all"
                  />
                </div>
                <p className="text-[8px] text-gray-400 mt-1">Minimum down payment is 20% of total amount</p>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedPaymentMethod("GCash")}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    selectedPaymentMethod === "GCash" ? "border-[#B8860B] bg-[#B8860B]/10" : "border-gray-200"
                  }`}
                >
                  <span className="text-xl mb-1 block">📱</span>
                  <p className="text-xs font-bold">GCash</p>
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod("PayMaya")}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    selectedPaymentMethod === "PayMaya" ? "border-[#B8860B] bg-[#B8860B]/10" : "border-gray-200"
                  }`}
                >
                  <span className="text-xl mb-1 block">💳</span>
                  <p className="text-xs font-bold">PayMaya</p>
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod("Bank Transfer")}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    selectedPaymentMethod === "Bank Transfer" ? "border-[#B8860B] bg-[#B8860B]/10" : "border-gray-200"
                  }`}
                >
                  <span className="text-xl mb-1 block">🏦</span>
                  <p className="text-xs font-bold">Bank Transfer</p>
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod("Credit Card")}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    selectedPaymentMethod === "Credit Card" ? "border-[#B8860B] bg-[#B8860B]/10" : "border-gray-200"
                  }`}
                >
                  <CreditCard size={24} className="mx-auto mb-1" />
                  <p className="text-xs font-bold">Credit Card</p>
                </button>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-bold text-xl text-[#B8860B]">₱{numericPrice.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                <span className="text-gray-600">Amount to Pay:</span>
                <span className="font-bold text-xl text-[#B8860B]">
                  ₱{paymentType === "downpayment" ? (customDownPayment ? parseFloat(customDownPayment).toLocaleString() : defaultDownPayment.toLocaleString()) : fullPaymentAmount.toLocaleString()}.00
                </span>
              </div>
              {paymentType === "downpayment" && (
                <p className="text-[10px] text-gray-400 mt-2">* Remaining balance of ₱{(numericPrice - (customDownPayment ? parseFloat(customDownPayment) : defaultDownPayment)).toLocaleString()}.00 to be paid before the event</p>
              )}
            </div>

            <button
              onClick={handlePayment}
              disabled={processing || !selectedPaymentMethod}
              className="w-full bg-[#B8860B] text-white py-4 rounded-xl font-black uppercase tracking-wider disabled:opacity-50 transition-all"
            >
              {processing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Processing...
                </div>
              ) : (
                `Pay ₱${paymentType === "downpayment" ? (customDownPayment ? parseFloat(customDownPayment).toLocaleString() : defaultDownPayment.toLocaleString()) : fullPaymentAmount.toLocaleString()}`
              )}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-lg w-full bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[2.5rem] overflow-hidden border border-slate-50">
        <div className="p-8 md:p-12">
          <button 
            onClick={() => {
              resetForm();
              navigate(-1);
            }}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-colors mb-10"
          >
            <ChevronLeft size={14} /> Back
          </button>

          <div className="mb-10">
            <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">Confirm Reservation</h2>
            <div className="h-1 w-12 bg-[#B8860B]"></div>
          </div>

          <div className="bg-slate-50/50 p-6 rounded-2xl mb-10 border border-slate-100 flex items-center gap-5">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-[#B8860B]">
              <Package size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Selected Package</p>
              <p className="font-black text-lg uppercase tracking-tight leading-none mb-1">{selectedType || "No Package"}</p>
              <p className="text-[#B8860B] font-bold text-sm tracking-tight">{price}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Event Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="date" 
                      required
                      min={todayStr}
                      value={formData.event_date}
                      onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                      className="w-full bg-white border border-slate-200 pl-12 pr-4 py-4 rounded-xl text-sm font-bold focus:ring-4 focus:ring-[#B8860B]/5 focus:border-[#B8860B] outline-none transition-all"
                    />
                  </div>
                  <p className="text-[8px] text-slate-400 mt-1">Cannot book past dates</p>
                </div>

                <div className="relative">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Total Guests</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="number" 
                      min="1"
                      required
                      placeholder="0"
                      value={formData.total_pax}
                      onChange={(e) => setFormData({...formData, total_pax: e.target.value})}
                      className="w-full bg-white border border-slate-200 pl-12 pr-4 py-4 rounded-xl text-sm font-bold focus:ring-4 focus:ring-[#B8860B]/5 focus:border-[#B8860B] outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Start Time</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="time" 
                      required
                      value={formData.start_time}
                      onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                      className="w-full bg-white border border-slate-200 pl-12 pr-4 py-4 rounded-xl text-sm font-bold focus:ring-4 focus:ring-[#B8860B]/5 focus:border-[#B8860B] outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">End Time</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="time" 
                      required
                      value={formData.end_time}
                      onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                      className="w-full bg-white border border-slate-200 pl-12 pr-4 py-4 rounded-xl text-sm font-bold focus:ring-4 focus:ring-[#B8860B]/5 focus:border-[#B8860B] outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:bg-[#B8860B] active:scale-[0.98] transition-all shadow-xl shadow-black/10 disabled:opacity-50"
            >
              {isSubmitting ? "Processing..." : "Proceed to Payment"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookNow;