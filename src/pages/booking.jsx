import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Calendar, Clock, Package, ChevronLeft, AlertTriangle, Users, CreditCard, Wallet, CheckCircle, Percent } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const BookNow = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedType, price, price_raw, event_id, party_package } = location.state || {};

  const [formData, setFormData] = useState({
    event_date: null,
    appointment_date: null,
    appointment_time: "",
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
  const [bookedEventDates, setBookedEventDates] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [hasExistingBooking, setHasExistingBooking] = useState(false);
  const [occupiedAppointmentSlots, setOccupiedAppointmentSlots] = useState({});
  const [fullAppointmentDates, setFullAppointmentDates] = useState([]);

  const numericPrice = price_raw || parseFloat(price?.replace(/[^\d.]/g, "") || 0);
  const defaultDownPayment = numericPrice * 0.2;
  const fullPaymentAmount = numericPrice;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const appointmentTimeOptions = [
    { value: "09:00", label: "9:00 AM - 11:00 AM", slot: 1 },
    { value: "11:00", label: "11:00 AM - 1:00 PM", slot: 2 },
    { value: "13:00", label: "1:00 PM - 3:00 PM", slot: 3 }
  ];

  const formatDateToYMD = useCallback((date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const isAppointmentDateInRange = (appointmentDate, eventDate) => {
    if (!appointmentDate || !eventDate) return false;
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const maxAppointmentDate = new Date(eventDate);
    maxAppointmentDate.setDate(maxAppointmentDate.getDate() - 3);
    maxAppointmentDate.setHours(0, 0, 0, 0);
    
    const appointmentDateTime = new Date(appointmentDate);
    appointmentDateTime.setHours(0, 0, 0, 0);
    
    return appointmentDateTime >= tomorrow && appointmentDateTime <= maxAppointmentDate;
  };

  const fetchData = useCallback(async () => {
    if (!event_id) return;
    
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    
    const { data, error } = await supabase
      .from("bookings")
      .select("event_date, booking_status, appointment_date, appointment_time")
      .neq("booking_status", "Cancelled")
      .neq("booking_status", "Completed");
    
    if (!error && data) {
      const dates = data.map(item => item.event_date).filter(d => d);
      setBookedEventDates(dates);
      
      const allBlockedDates = [];
      
      dates.forEach(dateStr => {
        if (!dateStr) return;
        const [year, month, day] = dateStr.split('-');
        const baseDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        baseDate.setHours(0, 0, 0, 0);
        
        for (let i = 0; i <= 6; i++) {
          const newDate = new Date(baseDate);
          newDate.setDate(baseDate.getDate() + i);
          const newDateStr = formatDateToYMD(newDate);
          if (newDateStr && !allBlockedDates.includes(newDateStr)) {
            allBlockedDates.push(newDateStr);
          }
        }
      });
      
      const uniqueBlocked = [...new Set(allBlockedDates)];
      setBlockedDates(uniqueBlocked);

      const occupied = {};
      const appointmentCount = {};
      
      data.forEach(booking => {
        if (booking.appointment_date && booking.appointment_time) {
          const key = `${booking.appointment_date}_${booking.appointment_time}`;
          occupied[key] = true;
          appointmentCount[booking.appointment_date] = (appointmentCount[booking.appointment_date] || 0) + 1;
        }
      });
      
      setOccupiedAppointmentSlots(occupied);
      
      const fullDates = [];
      Object.keys(appointmentCount).forEach(date => {
        if (appointmentCount[date] >= 3) {
          fullDates.push(date);
        }
      });
      setFullAppointmentDates(fullDates);
    }
    
    if (userId) {
      const { data: userBookings, error: userError } = await supabase
        .from("bookings")
        .select("booking_id, booking_status, event_date")
        .eq("user_id", userId)
        .neq("booking_status", "Cancelled")
        .neq("booking_status", "Completed");
      
      if (!userError && userBookings && userBookings.length > 0) {
        setHasExistingBooking(true);
      } else {
        setHasExistingBooking(false);
      }
    }
  }, [event_id, formatDateToYMD]);

  useEffect(() => {
    fetchData();
    
    const subscription = supabase
      .channel('bookings-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'bookings' }, 
        () => {
          fetchData();
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchData]);

  const isEventDateLocked = (date) => {
    if (!date) return false;
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    const minEventDate = new Date();
    minEventDate.setDate(todayDate.getDate() + 7);
    minEventDate.setHours(0, 0, 0, 0);
    
    const dateStr = formatDateToYMD(checkDate);
    
    if (checkDate < todayDate) return true;
    if (checkDate < minEventDate) return true;
    if (dateStr && bookedEventDates.includes(dateStr)) return true;
    
    return false;
  };

  const hasEventOnDate = (date) => {
    if (!date) return false;
    const dateStr = formatDateToYMD(date);
    return dateStr && bookedEventDates.includes(dateStr);
  };

  const isAppointmentSlotFull = (date, time) => {
    if (!date || !time) return false;
    const dateStr = formatDateToYMD(date);
    const key = `${dateStr}_${time}`;
    return occupiedAppointmentSlots[key] === true;
  };

  const isAppointmentTimePassed = (date, time) => {
    if (!date || !time) return false;
    const dateStr = formatDateToYMD(date);
    const appointmentDateTime = new Date(`${dateStr}T${time}:00`);
    const now = new Date();
    return appointmentDateTime < now;
  };

  const resetForm = () => {
    setFormData({
      event_date: null,
      appointment_date: null,
      appointment_time: "",
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

      if (hasExistingBooking) {
        setAlertMessage("You already have an active booking. You cannot book another event until your current booking is completed or cancelled.");
        setIsSubmitting(false);
        return;
      }

      if (!formData.event_date) {
        setAlertMessage("Please select an event date.");
        setIsSubmitting(false);
        return;
      }

      if (!formData.appointment_date) {
        setAlertMessage("Please select an appointment date.");
        setIsSubmitting(false);
        return;
      }

      if (!formData.appointment_time) {
        setAlertMessage("Please select an appointment time.");
        setIsSubmitting(false);
        return;
      }

      if (!formData.start_time || !formData.end_time) {
        setAlertMessage("Please select event start and end time.");
        setIsSubmitting(false);
        return;
      }

      const totalPax = parseInt(formData.total_pax);
      if (isNaN(totalPax) || totalPax < 50) {
        setAlertMessage("Total guests must be at least 50 Pax.");
        setIsSubmitting(false);
        return;
      }

      const eventDateStr = formatDateToYMD(formData.event_date);
      const appointmentDateStr = formatDateToYMD(formData.appointment_date);
      
      const appointmentDateTime = new Date(appointmentDateStr);
      appointmentDateTime.setHours(0, 0, 0, 0);
      const eventDateTime = new Date(eventDateStr);
      eventDateTime.setHours(0, 0, 0, 0);
      const todayDateTime = new Date();
      todayDateTime.setHours(0, 0, 0, 0);
      
      if (appointmentDateTime < todayDateTime) {
        setAlertMessage("Appointment date cannot be in the past.");
        setIsSubmitting(false);
        return;
      }
      
      if (eventDateTime < todayDateTime) {
        setAlertMessage("Event date cannot be in the past. Please select a future date.");
        setIsSubmitting(false);
        return;
      }
      
      if (appointmentDateTime >= eventDateTime) {
        setAlertMessage("Appointment date must be before the event date.");
        setIsSubmitting(false);
        return;
      }
      
      if (!isAppointmentDateInRange(formData.appointment_date, formData.event_date)) {
        setAlertMessage("Appointment date must be from TOMORROW up to 3 DAYS BEFORE the event date.");
        setIsSubmitting(false);
        return;
      }
      
      if (eventDateStr && blockedDates.includes(eventDateStr)) {
        setAlertMessage(`This date is within 7 days of an existing booking. Please select another date.`);
        setIsSubmitting(false);
        return;
      }
      
      if (eventDateStr && bookedEventDates.includes(eventDateStr)) {
        setAlertMessage(`This date is already booked. Please select another date.`);
        setIsSubmitting(false);
        return;
      }

      if (hasEventOnDate(formData.appointment_date)) {
        setAlertMessage("Cannot select appointment on a date with an existing event. Please choose another date.");
        setIsSubmitting(false);
        return;
      }

      if (isAppointmentTimePassed(formData.appointment_date, formData.appointment_time)) {
        setAlertMessage("Cannot select an appointment time that has already passed. Please choose a future time.");
        setIsSubmitting(false);
        return;
      }

      const { data: existingAppointments, error: checkError } = await supabase
        .from("bookings")
        .select("booking_id")
        .eq("appointment_date", appointmentDateStr)
        .eq("appointment_time", formData.appointment_time)
        .neq("booking_status", "Cancelled")
        .neq("booking_status", "Completed");

      if (checkError) throw checkError;

      if (existingAppointments && existingAppointments.length > 0) {
        setAlertMessage("This appointment time slot is already full. Please select another time.");
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
        .select("start_time, end_time, booking_status")
        .eq("event_date", eventDateStr)
        .neq("booking_status", "Cancelled")
        .neq("booking_status", "Completed");

      if (fetchError) throw fetchError;

      const hasOverlap = existingBookings?.some((booking) => {
        const existingStart = booking.start_time;
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
        event_date: eventDateStr,
        appointment_date: appointmentDateStr,
        appointment_time: formData.appointment_time,
        start_time: formattedStartTime,
        end_time: formattedEndTime,
        total_pax: totalPax,
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

      if (appointmentDateStr && formData.appointment_time) {
        const newKey = `${appointmentDateStr}_${formData.appointment_time}`;
        setOccupiedAppointmentSlots(prev => ({
          ...prev,
          [newKey]: true
        }));
      }

      await supabase.from("notifications").insert([
        {
          booking_id: createdBooking.booking_id,
          is_read: false,
          message: `New Booking Alert: ${firstName} ${lastName} booked ${selectedType} on ${eventDateStr} at ${formData.start_time}. Appointment: ${appointmentDateStr} at ${formData.appointment_time}. Status: Pending Payment.`,
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
          message: `Payment Received: ₱${amountToPay.toLocaleString()} paid for ${selectedType} on ${bookingData.event_date}. Payment type: ${paymentType === "downpayment" ? "Down Payment" : "Full Payment"}. Remaining balance: ₱${(numericPrice - amountToPay).toLocaleString()}.`,
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
      <style>{`
        .react-datepicker__day--locked {
          background-color: #fee2e2 !important;
          color: #dc2626 !important;
          text-decoration: line-through !important;
          cursor: not-allowed !important;
          opacity: 0.6 !important;
        }
        .react-datepicker__day--booked-event {
          background-color: #d4a373 !important;
          color: white !important;
          text-decoration: line-through !important;
          cursor: not-allowed !important;
          opacity: 0.7 !important;
          position: relative;
        }
        .react-datepicker__day--booked-event:hover::after {
          content: "⚠️ This date has an existing event!";
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #8B4513;
          color: white;
          font-size: 10px;
          padding: 4px 8px;
          border-radius: 6px;
          white-space: nowrap;
          z-index: 10;
          font-weight: normal;
        }
        .react-datepicker__day--blocked {
          background-color: #fed7aa !important;
          color: #9a3412 !important;
          text-decoration: line-through !important;
          cursor: not-allowed !important;
          opacity: 0.6 !important;
        }
        .react-datepicker__day--available {
          background-color: white !important;
          color: #1e293b !important;
        }
        .react-datepicker__day--available:hover {
          background-color: #B8860B !important;
          color: white !important;
        }
        .react-datepicker__day--has-event {
          background-color: #dbeafe !important;
          color: #1e40af !important;
          font-weight: bold !important;
          text-decoration: none !important;
          position: relative;
        }
        .react-datepicker__day--has-event:hover::after {
          content: "⚠️ There is an event on this date!";
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #1e40af;
          color: white;
          font-size: 10px;
          padding: 4px 8px;
          border-radius: 6px;
          white-space: nowrap;
          z-index: 10;
          font-weight: normal;
        }
        .react-datepicker__day--appointment-full {
          background-color: #d4a373 !important;
          color: white !important;
          text-decoration: line-through !important;
          cursor: not-allowed !important;
          opacity: 0.7 !important;
          position: relative;
        }
        .react-datepicker__day--appointment-full:hover::after {
          content: "⚠️ FULL SLOT! No available appointment time.";
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #8B4513;
          color: white;
          font-size: 10px;
          padding: 4px 8px;
          border-radius: 6px;
          white-space: nowrap;
          z-index: 10;
          font-weight: normal;
        }
        .react-datepicker__day--event-date-appointment {
          background-color: #d4a373 !important;
          color: white !important;
          text-decoration: line-through !important;
          cursor: not-allowed !important;
          opacity: 0.7 !important;
          position: relative;
        }
        .react-datepicker__day--event-date-appointment:hover::after {
          content: "⚠️ Cannot appoint on this date! There is an existing event.";
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #8B4513;
          color: white;
          font-size: 10px;
          padding: 4px 8px;
          border-radius: 6px;
          white-space: nowrap;
          z-index: 10;
          font-weight: normal;
        }
        .react-datepicker__day--time-passed {
          background-color: #f3f4f6 !important;
          color: #9ca3af !important;
          text-decoration: line-through !important;
          cursor: not-allowed !important;
          opacity: 0.6 !important;
        }
        .react-datepicker__day--out-of-range {
          background-color: #fee2e2 !important;
          color: #dc2626 !important;
          text-decoration: line-through !important;
          cursor: not-allowed !important;
          opacity: 0.6 !important;
        }
      `}</style>

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
              <p className="font-bold">{bookingData.event_type || selectedType}</p>
              <p className="text-sm text-gray-600">Event: {bookingData.event_date ? new Date(bookingData.event_date).toLocaleDateString() : formData.event_date?.toLocaleDateString()} | {bookingData.start_time || formData.start_time} - {bookingData.end_time || formData.end_time}</p>
              <p className="text-sm text-gray-600">Appointment: {bookingData.appointment_date ? new Date(bookingData.appointment_date).toLocaleDateString() : formData.appointment_date?.toLocaleDateString()} at {bookingData.appointment_time || formData.appointment_time}</p>
              <p className="text-sm text-gray-600">Guests: {bookingData.total_pax || formData.total_pax}</p>
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
                    <DatePicker
                      selected={formData.event_date}
                      onChange={(date) => {
                        setFormData({...formData, event_date: date});
                      }}
                      placeholderText="Select event date"
                      className="w-full bg-white border border-slate-200 pl-12 pr-4 py-4 rounded-xl text-sm font-bold focus:ring-4 focus:ring-[#B8860B]/5 focus:border-[#B8860B] outline-none transition-all"
                      dateFormat="MMMM d, yyyy"
                      required
                      filterDate={(date) => {
                        const isLocked = isEventDateLocked(date);
                        return !isLocked;
                      }}
                      dayClassName={(date) => {
                        const dateStr = formatDateToYMD(date);
                        if (dateStr && bookedEventDates.includes(dateStr)) return "react-datepicker__day--booked-event";
                        if (isEventDateLocked(date)) return "react-datepicker__day--locked";
                        return "react-datepicker__day--available";
                      }}
                    />
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  </div>
                  <p className="text-[8px] text-slate-400 mt-1">Brown: Already booked | Light Red: Past dates or less than 7 days from today</p>
                </div>

                <div className="relative">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Appointment Date</label>
                  <div className="relative">
                    <DatePicker
                      selected={formData.appointment_date}
                      onChange={(date) => {
                        setFormData({...formData, appointment_date: date});
                        if (date && formData.event_date && date >= formData.event_date) {
                          setAlertMessage("Warning: Appointment date should be BEFORE the event date. Please adjust your appointment.");
                          setTimeout(() => setAlertMessage(null), 3000);
                        }
                        if (date && formData.event_date && !isAppointmentDateInRange(date, formData.event_date)) {
                          setAlertMessage("Appointment date must be from TOMORROW up to 3 DAYS BEFORE the event date.");
                          setTimeout(() => setAlertMessage(null), 3000);
                        }
                      }}
                      placeholderText="Select appointment date"
                      className="w-full bg-white border border-slate-200 pl-12 pr-4 py-4 rounded-xl text-sm font-bold focus:ring-4 focus:ring-[#B8860B]/5 focus:border-[#B8860B] outline-none transition-all"
                      dateFormat="MMMM d, yyyy"
                      required
                      filterDate={(date) => {
                        if (hasEventOnDate(date)) return false;
                        if (!formData.event_date) return true;
                        return isAppointmentDateInRange(date, formData.event_date);
                      }}
                      dayClassName={(date) => {
                        const dateStr = formatDateToYMD(date);
                        if (hasEventOnDate(date)) return "react-datepicker__day--event-date-appointment";
                        if (fullAppointmentDates.includes(dateStr)) return "react-datepicker__day--appointment-full";
                        if (formData.event_date && !isAppointmentDateInRange(date, formData.event_date)) return "react-datepicker__day--out-of-range";
                        return "";
                      }}
                    />
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  </div>
                  <p className="text-[8px] text-slate-400 mt-1">Brown: Cannot appoint (event exists or full slots) | Light Red: Out of range (must be from TOMORROW to 3 DAYS BEFORE event)</p>
                  {formData.appointment_date && formData.event_date && formData.appointment_date >= formData.event_date && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-[10px] text-red-700 flex items-center gap-2">
                      <AlertTriangle size={12} />
                      ERROR: Appointment date must be BEFORE event date! Please fix this.
                    </div>
                  )}
                  {formData.appointment_date && hasEventOnDate(formData.appointment_date) && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-[10px] text-red-700 flex items-center gap-2">
                      <AlertTriangle size={12} />
                      ERROR: Cannot appoint on a date with an existing event! Please select another date.
                    </div>
                  )}
                  {formData.appointment_date && formData.event_date && !isAppointmentDateInRange(formData.appointment_date, formData.event_date) && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-[10px] text-red-700 flex items-center gap-2">
                      <AlertTriangle size={12} />
                      ERROR: Appointment date must be from TOMORROW up to 3 DAYS BEFORE the event date!
                    </div>
                  )}
                  {formData.appointment_date && fullAppointmentDates.includes(formatDateToYMD(formData.appointment_date)) && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-700 flex items-center gap-2">
                      <AlertTriangle size={12} />
                      ⚠️ This date has no available appointment slots (3/3 slots already booked).
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Appointment Time</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <select
                      required
                      value={formData.appointment_time}
                      onChange={(e) => setFormData({...formData, appointment_time: e.target.value})}
                      className="w-full bg-white border border-slate-200 pl-12 pr-4 py-4 rounded-xl text-sm font-bold focus:ring-4 focus:ring-[#B8860B]/5 focus:border-[#B8860B] outline-none transition-all appearance-none"
                    >
                      <option value="">Select appointment time</option>
                      {appointmentTimeOptions.map(option => {
                        const isFull = isAppointmentSlotFull(formData.appointment_date, option.value);
                        const isPassed = isAppointmentTimePassed(formData.appointment_date, option.value);
                        const isDisabled = isFull || isPassed;
                        let label = option.label;
                        if (isFull) label += " (FULL)";
                        if (isPassed) label += " (TIME PASSED)";
                        return (
                          <option 
                            key={option.value} 
                            value={option.value}
                            disabled={isDisabled}
                          >
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <p className="text-[8px] text-slate-400 mt-1">3 slots per day only: 9:00 AM - 11:00 AM, 11:00 AM - 1:00 PM, 1:00 PM - 3:00 PM</p>
                </div>

                <div className="relative">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Total Guests</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="number" 
                      min="50"
                      required
                      placeholder="50"
                      value={formData.total_pax}
                      onChange={(e) => setFormData({...formData, total_pax: e.target.value})}
                      className="w-full bg-white border border-slate-200 pl-12 pr-4 py-4 rounded-xl text-sm font-bold focus:ring-4 focus:ring-[#B8860B]/5 focus:border-[#B8860B] outline-none transition-all"
                    />
                  </div>
                  <p className="text-[8px] text-slate-400 mt-1">Minimum 50 Pax required</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Event Start Time</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <select
                      required
                      value={formData.start_time}
                      onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                      className="w-full bg-white border border-slate-200 pl-12 pr-4 py-4 rounded-xl text-sm font-bold focus:ring-4 focus:ring-[#B8860B]/5 focus:border-[#B8860B] outline-none transition-all appearance-none"
                    >
                      <option value="">Select start time</option>
                      <option value="09:00">9:00 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="13:00">1:00 PM</option>
                      <option value="14:00">2:00 PM</option>
                      <option value="15:00">3:00 PM</option>
                      <option value="16:00">4:00 PM</option>
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Event End Time</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <select
                      required
                      value={formData.end_time}
                      onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                      className="w-full bg-white border border-slate-200 pl-12 pr-4 py-4 rounded-xl text-sm font-bold focus:ring-4 focus:ring-[#B8860B]/5 focus:border-[#B8860B] outline-none transition-all appearance-none"
                    >
                      <option value="">Select end time</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="13:00">1:00 PM</option>
                      <option value="14:00">2:00 PM</option>
                      <option value="15:00">3:00 PM</option>
                      <option value="16:00">4:00 PM</option>
                      <option value="17:00">5:00 PM</option>
                    </select>
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