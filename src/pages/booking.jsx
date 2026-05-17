import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Calendar, Clock, Package, ChevronLeft, AlertTriangle, Users } from "lucide-react";

const BookNow = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedType, price } = location.state || {};

  const [formData, setFormData] = useState({
    event_date: "",
    start_time: "",
    end_time: "",
    total_pax: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

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

      const hasOverlap = existingBookings.some((booking) => {
        const existingStart = booking.appointment_time;
        const existingEnd = booking.end_time || calculateDefaultEndTime(booking.appointment_time);

        return formattedStartTime < existingEnd && formattedEndTime > existingStart;
      });

      if (hasOverlap) {
        setAlertMessage("Slot Not Available: The selected time range overlaps with an existing reservation on this day. Please choose a different time.");
        setIsSubmitting(false);
        return;
      }

      const numericPrice = parseFloat(price.replace(/[^\d.]/g, ""));

      const { data: newBooking, error: insertError } = await supabase
        .from("bookings")
        .insert([
          {
            user_id: session.user.id,
            event_type: selectedType,
            event_date: formData.event_date,
            appointment_date: formData.event_date,
            appointment_time: formattedStartTime,
            end_time: formattedEndTime,
            total_pax: parseInt(formData.total_pax) || 0,
            amount: numericPrice,
            payment_status: "Unpaid",
            booking_status: "Pending",
            paid_amount: 0,
            down_payment: 0,
            discount: 0,
          },
        ])
        .select();

      if (insertError) throw insertError;

      const createdBookingId = newBooking[0]?.booking_id;

      if (createdBookingId) {
        await supabase.from("notifications").insert([
          {
            booking_id: createdBookingId,
            is_read: false,
            message: `New booking registration for ${selectedType} on ${formData.event_date}.`,
          },
        ]);
      }

      alert("Booking Successful!");
      navigate("/ClientDashboard");
    } catch (error) {
      setAlertMessage("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateDefaultEndTime = (startTimeStr) => {
    if (!startTimeStr) return "";
    const [hours, minutes] = startTimeStr.split(":").map(Number);
    const endHour = (hours + 6).toString().padStart(2, "0");
    const endMinute = minutes.toString().padStart(2, "0");
    return `${endHour}:${endMinute}:00`;
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 relative">
      {alertMessage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white max-w-md w-full rounded-[2rem] p-8 border border-red-100 shadow-2xl text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-2">Reservation Conflict</h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">{alertMessage}</p>
            <button 
              onClick={() => setAlertMessage(null)}
              className="w-full bg-black text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-colors shadow-lg"
            >
              Okay, I'll Change It
            </button>
          </div>
        </div>
      )}

      <div className="max-w-lg w-full bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[2.5rem] overflow-hidden border border-slate-50">
        <div className="p-8 md:p-12">
          <button 
            onClick={() => navigate(-1)}
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
                      value={formData.event_date}
                      onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                      className="w-full bg-white border border-slate-200 pl-12 pr-4 py-4 rounded-xl text-sm font-bold focus:ring-4 focus:ring-[#B8860B]/5 focus:border-[#B8860B] outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Total Pax</label>
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
              {isSubmitting ? "Processing..." : "Confirm Booking"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookNow;