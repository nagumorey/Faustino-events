import React, { useRef } from 'react';
import { Download, XCircle, ArrowLeft } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const BookingReceipt = ({ booking, onClose }) => {
  const receiptRef = useRef(null);

  const downloadAsPDF = () => {
    const element = receiptRef.current;
    
    const opt = {
      margin: [0.3, 0.3, 0.3, 0.3],
      filename: `Receipt_${booking?.booking_id || 'booking'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, letterRendering: true, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return timeString.substring(0, 5);
  };

  const subtotal = parseFloat(booking?.amount || booking?.total_amount || 0);
  const amountPaid = parseFloat(booking?.amount_paid || booking?.paid_amount || 0);
  const downPayment = parseFloat(booking?.down_payment || amountPaid || 0);
  const remainingBalance = parseFloat(booking?.remaining_balance || (subtotal - amountPaid) || 0);
  const isFullyPaid = amountPaid >= subtotal && subtotal > 0;
  const isPartialPaid = amountPaid > 0 && amountPaid < subtotal;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-3xl w-full">
        <div className="flex justify-end gap-2 mb-4 no-print">
          <button onClick={downloadAsPDF} className="flex items-center gap-2 px-4 py-2 bg-[#B8860B] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#9a7009] transition-all shadow-md">
            <Download size={14} /> Download PDF
          </button>
          <button onClick={onClose} className="p-2 bg-white rounded-xl hover:bg-gray-100 transition-all shadow-md">
            <XCircle size={20} className="text-slate-500" />
          </button>
        </div>

        <div ref={receiptRef} style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
          <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '20px', textAlign: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(90deg, #B8860B, #DAA520, #B8860B)' }}></div>
            <h1 style={{ fontSize: '24px', fontFamily: 'Georgia, serif', fontWeight: 'bold', color: 'white', letterSpacing: '2px', margin: 0 }}>FAUSTINO'S</h1>
            <p style={{ color: '#DAA520', fontSize: '9px', fontWeight: 'bold', letterSpacing: '3px', marginTop: '4px' }}>Event Place</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '8px' }}>
              <span>📍 54 Tahimik St., Imus, Cavite</span>
              <span>✉️ info@faustinoevents.com</span>
              <span>📞 (046) 123-4567</span>
            </div>
          </div>

          <div style={{ padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px dashed #e5e7eb' }}>
              <div style={{ display: 'inline-block', background: 'rgba(184,134,11,0.1)', padding: '3px 10px', borderRadius: '20px', marginBottom: '8px' }}>
                <p style={{ fontSize: '8px', fontWeight: 'bold', color: '#B8860B', letterSpacing: '2px', margin: 0 }}>OFFICIAL RECEIPT</p>
              </div>
              <p style={{ fontSize: '9px', color: '#9ca3af', margin: '4px 0' }}>Receipt No: <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#4b5563' }}>{booking?.booking_id || 'N/A'}</span></p>
              <p style={{ fontSize: '9px', color: '#9ca3af', margin: 0 }}>Date Issued: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <div style={{ width: '28px', height: '28px', background: 'rgba(184,134,11,0.1)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', fontSize: '12px' }}>👤</div>
                <h3 style={{ fontSize: '8px', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '1px', marginBottom: '8px' }}>CLIENT INFORMATION</h3>
                <p style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '12px', margin: '0 0 3px 0' }}>{booking?.first_name || 'N/A'} {booking?.last_name || ''}</p>
                <p style={{ fontSize: '10px', color: '#6b7280', margin: '2px 0' }}>{booking?.email || 'No email'}</p>
                <p style={{ fontSize: '10px', color: '#6b7280', margin: 0 }}>{booking?.phone_number || 'No phone'}</p>
              </div>
              
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <div style={{ width: '28px', height: '28px', background: 'rgba(184,134,11,0.1)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', fontSize: '12px' }}>📋</div>
                <h3 style={{ fontSize: '8px', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '1px', marginBottom: '8px' }}>BOOKING DETAILS</h3>
                <p style={{ fontSize: '10px', color: '#6b7280', margin: '0 0 3px 0' }}>
                  Status: 
                  <span style={{ marginLeft: '6px', padding: '2px 6px', borderRadius: '20px', fontSize: '8px', fontWeight: 'bold', background: booking?.booking_status === "Approved" ? '#dcfce7' : '#fef3c7', color: booking?.booking_status === "Approved" ? '#166534' : '#92400e' }}>
                    {booking?.booking_status || 'Pending'}
                  </span>
                </p>
                <p style={{ fontSize: '10px', color: '#6b7280', margin: 0 }}>Transaction ID: <span style={{ fontFamily: 'monospace' }}>{booking?.transaction_id || 'N/A'}</span></p>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9', marginBottom: '16px' }}>
              <div style={{ width: '28px', height: '28px', background: 'rgba(184,134,11,0.1)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', fontSize: '12px' }}>🎉</div>
              <h3 style={{ fontSize: '8px', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '1px', marginBottom: '12px' }}>EVENT DETAILS</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div>
                  <p style={{ fontSize: '7px', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '1px', marginBottom: '3px' }}>EVENT TYPE</p>
                  <p style={{ fontWeight: 'bold', fontSize: '11px', color: '#1e293b', margin: 0 }}>{booking?.event_type || booking?.event_name || 'N/A'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '7px', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '1px', marginBottom: '3px' }}>EVENT DATE</p>
                  <p style={{ fontWeight: 'bold', fontSize: '11px', color: '#1e293b', margin: 0 }}>{formatDate(booking?.event_date)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '7px', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '1px', marginBottom: '3px' }}>TIME</p>
                  <p style={{ fontWeight: 'bold', fontSize: '11px', color: '#1e293b', margin: 0 }}>{formatTime(booking?.appointment_time)} - {formatTime(booking?.end_time)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '7px', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '1px', marginBottom: '3px' }}>TOTAL GUESTS</p>
                  <p style={{ fontWeight: 'bold', fontSize: '11px', color: '#1e293b', margin: 0 }}>{booking?.total_pax || booking?.pax || 0} Pax</p>
                </div>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, #fef3c7, #fffbeb)', padding: '16px', borderRadius: '12px', border: '1px solid #fde68a', marginBottom: '16px' }}>
              <div style={{ width: '28px', height: '28px', background: 'rgba(184,134,11,0.2)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', fontSize: '12px' }}>💰</div>
              <h3 style={{ fontSize: '8px', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '1px', marginBottom: '12px' }}>PAYMENT SUMMARY</h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #fde68a' }}>
                <span style={{ color: '#6b7280', fontSize: '11px' }}>Subtotal</span>
                <span style={{ fontWeight: 'bold', color: '#1e293b' }}>₱{subtotal.toLocaleString()}.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #fde68a' }}>
                <span style={{ color: '#6b7280', fontSize: '11px' }}>Down Payment</span>
                <span style={{ fontWeight: 'bold', color: '#B8860B' }}>₱{downPayment.toLocaleString()}.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0 0' }}>
                <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '12px' }}>Total Amount</span>
                <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#B8860B' }}>₱{subtotal.toLocaleString()}.00</span>
              </div>
            </div>

            <div style={{ 
              background: isFullyPaid ? '#dcfce7' : isPartialPaid ? '#dbeafe' : '#f3f4f6',
              border: `1px solid ${isFullyPaid ? '#bbf7d0' : isPartialPaid ? '#bfdbfe' : '#e5e7eb'}`,
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '8px', fontWeight: 'bold', color: '#9ca3af', letterSpacing: '1px', margin: '0 0 3px 0' }}>AMOUNT PAID</p>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>₱{amountPaid.toLocaleString()}.00</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '8px', fontWeight: 'bold', color: '#9ca3af', letterSpacing: '1px', margin: '0 0 3px 0' }}>PAYMENT STATUS</p>
                  <p style={{ fontSize: '11px', fontWeight: 'bold', color: isFullyPaid ? '#16a34a' : isPartialPaid ? '#2563eb' : '#dc2626', margin: 0 }}>
                    {isFullyPaid ? 'FULLY PAID' : isPartialPaid ? 'PARTIAL PAYMENT' : 'PENDING'}
                  </p>
                </div>
              </div>
              
              {!isFullyPaid && amountPaid > 0 && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #bfdbfe', display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '8px', fontWeight: 'bold', color: '#9ca3af', letterSpacing: '1px', margin: 0 }}>REMAINING BALANCE</p>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>₱{remainingBalance.toLocaleString()}.00</p>
                </div>
              )}
              
              {isFullyPaid && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #bbf7d0', textAlign: 'center' }}>
                  <p style={{ fontSize: '9px', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>✓ FULLY SETTLED</p>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'inline-block', border: '1px solid #e5e7eb', padding: '10px 20px', borderRadius: '10px' }}>
                <p style={{ fontSize: '8px', color: '#9ca3af', margin: '0 0 3px 0' }}>Thank you for choosing Faustino's Event Place!</p>
                <p style={{ fontSize: '7px', color: '#d1d5db', margin: 0 }}>This is a computer generated receipt. No signature required.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 no-print">
          <button
            onClick={onClose}
            className="w-full bg-white py-3 rounded-xl font-black uppercase text-[10px] tracking-wider hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-md border border-gray-200"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingReceipt;