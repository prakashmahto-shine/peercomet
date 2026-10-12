import React, { useState } from 'react';
import { 
  ArrowLeft, Calendar, ShieldCheck, Check, Building, Wallet, 
  Lock, Loader2, Shield, ArrowRight, CheckCircle2, QrCode, Smartphone, CreditCard, X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const PaymentView: React.FC = () => {
  const { bookingDraft, navigate, bookSession, selectedExpert, userProfile, setIsBookingModalOpen } = useApp();
  const expert = bookingDraft.expert || selectedExpert || {
    id: 'deepika-pm',
    name: 'Deepika Sen',
    role: 'Senior Technical Product Manager',
    company: 'Google',
    price: 1399,
    avatar: '/avatars/deepika.jpg'
  };

  const date = bookingDraft.date;
  const timeSlot = bookingDraft.timeSlot;
  const sessionType = bookingDraft.sessionType || 'Career Guidance & Strategy';
  const sessionDuration = bookingDraft.duration || '30 Mins';
  const payableAmount = bookingDraft.amount || expert.price || 1399;

  // Razorpay Modal simulation state
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState<boolean>(false);
  const [rzpMethod, setRzpMethod] = useState<'qr' | 'upi' | 'card' | 'netbanking'>('qr');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleOpenRazorpay = () => {
    if (!date || !timeSlot) {
      // No slot picked yet: send them to the booking calendar instead of booking a made-up time
      setIsBookingModalOpen(true);
      return;
    }
    setIsRazorpayModalOpen(true);
  };

  const handleCompletePayment = async () => {
    setIsProcessing(true);
    const booked = await bookSession(expert as any, date, timeSlot, sessionType);
    setIsProcessing(false);
    setIsRazorpayModalOpen(false);
    if (booked) {
      navigate('confirmed-view');
    } else {
      setIsBookingModalOpen(true);
    }
  };

  return (
    <div className="content-wrapper payment-layout-grid">
      
      {/* Left Card: Session Summary & Bill Breakup */}
      <div className="payment-left-card">
        <button className="btn-back-link" onClick={() => navigate('experts-view')}>
          <ArrowLeft size={16} /> Back to Experts
        </button>
        
        <h2 className="pay-sec-heading">Session Summary</h2>

        <div className="pay-expert-card">
          <img src={expert.avatar || '/avatars/deepika.jpg'} alt={expert.name} className="pay-avatar" />
          <div>
            <h4>{expert.name}</h4>
            <p>{expert.role} at {expert.company} • <strong className="text-blue-600">{sessionType}</strong></p>
            <div className="pay-chip"><Calendar size={13} /> {date && timeSlot ? `${date} • ${timeSlot}` : 'No slot selected yet'}</div>
          </div>
        </div>

        <div className="bill-breakup-card">
          <div className="bill-row">
            <span>{sessionType} ({sessionDuration})</span>
            <span>₹{payableAmount}</span>
          </div>
          <div className="bill-row">
            <span>Platform Fee & Trust Insurance</span>
            <span className="text-success"><del>₹199</del> FREE</span>
          </div>
          <div className="bill-row">
            <span>GST (18%)</span>
            <span>Included</span>
          </div>
          <div className="bill-divider"></div>
          <div className="bill-row total-row">
            <strong>Total Amount Payable</strong>
            <strong className="total-amt">₹{payableAmount}</strong>
          </div>
        </div>

        <div className="trust-guarantee-box">
          <ShieldCheck size={22} className="t-icon" />
          <p>
            <strong>Shine Trust Guarantee:</strong> 100% full refund if mentor is unavailable or if you are not satisfied with session quality.
          </p>
        </div>
      </div>

      {/* Right Card: Minimal, Trust-Focused Razorpay Checkout */}
      <div className="payment-right-card rzp-checkout-card">
        
        <div className="rzp-card-header">
          <div className="rzp-header-left">
            <h2 className="pay-sec-heading-clean">Secure Checkout</h2>
            <p className="rzp-sub-text">1-Click instant slot booking via Razorpay gateway</p>
          </div>
          <div className="rzp-partner-badge" title="Verified Razorpay Partner">
            <span className="rzp-powered-by">POWERED BY</span>
            <span className="rzp-brand-tag">Razorpay</span>
          </div>
        </div>

        {/* Order Details Brief Box */}
        <div className="rzp-order-brief-box">
          <div className="rzp-brief-row">
            <span className="rzp-brief-lbl">Session With</span>
            <span className="rzp-brief-val">{expert.name}</span>
          </div>
          <div className="rzp-brief-row">
            <span className="rzp-brief-lbl">Candidate</span>
            <span className="rzp-brief-val">{userProfile?.name || 'Prakash Kumar'}</span>
          </div>
          <div className="rzp-brief-row">
            <span className="rzp-brief-lbl">Invite Sent To</span>
            <span className="rzp-brief-val font-mono">{userProfile?.email || 'prakash.mahto@gmail.com'}</span>
          </div>
        </div>

        {/* Supported Modes Badge Strip */}
        <div className="rzp-supported-modes">
          <span className="rzp-sm-title">Accepted Payment Modes:</span>
          <div className="rzp-sm-pills">
            <span className="rzp-pill">⚡ UPI (GPay / PhonePe / Paytm)</span>
            <span className="rzp-pill">📱 Dynamic QR Code</span>
            <span className="rzp-pill">💳 Credit / Debit Cards</span>
            <span className="rzp-pill">🏦 Net Banking</span>
          </div>
        </div>

        {/* Instant Protection Pill */}
        <div className="rzp-guarantee-strip">
          <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
          <span>Encrypted 256-bit bank-grade payment processing</span>
        </div>

        {/* Action Button */}
        <div className="pay-action-block">
          <button 
            type="button" 
            className="btn-pay-checkout btn-rzp-cta" 
            onClick={handleOpenRazorpay}
          >
            <Lock size={16} />
            <span>Proceed to Pay ₹{payableAmount}</span>
            <ArrowRight size={16} />
          </button>
          
          <div className="rzp-compliance-footer">
            <Shield size={12} className="text-slate-400" />
            <span>RBI & PCI-DSS Compliant • <strong>Shine Gateway</strong></span>
          </div>
        </div>

      </div>

      {/* Realistic Razorpay Modal Popup */}
      {isRazorpayModalOpen && (
        <div className="rzp-modal-backdrop" onClick={() => !isProcessing && setIsRazorpayModalOpen(false)}>
          <div className="rzp-modal-surface" onClick={e => e.stopPropagation()}>
            
            {/* Razorpay Top Header */}
            <div className="rzp-m-header">
              <div className="rzp-m-brand">
                <div className="rzp-m-logo">
                  <strong>Shine</strong><span>.com</span>
                </div>
                <div className="rzp-m-sub">PeerPath Mentorship</div>
              </div>
              <div className="rzp-m-price-box">
                <span className="rzp-m-price-lbl">Payable Amount</span>
                <span className="rzp-m-price-val">₹{payableAmount}</span>
              </div>
              <button 
                type="button" 
                className="rzp-m-close"
                onClick={() => !isProcessing && setIsRazorpayModalOpen(false)}
                disabled={isProcessing}
              >
                <X size={18} />
              </button>
            </div>

            {/* Razorpay Body Grid (Left Tabs, Right Content) */}
            <div className="rzp-m-body">
              
              {/* Left Method Tabs */}
              <div className="rzp-m-tabs">
                <button 
                  type="button" 
                  className={`rzp-tab-btn ${rzpMethod === 'qr' ? 'active' : ''}`}
                  onClick={() => setRzpMethod('qr')}
                >
                  <QrCode size={16} />
                  <span>QR Code</span>
                  <span className="rzp-fast-tag">FAST</span>
                </button>

                <button 
                  type="button" 
                  className={`rzp-tab-btn ${rzpMethod === 'upi' ? 'active' : ''}`}
                  onClick={() => setRzpMethod('upi')}
                >
                  <Smartphone size={16} />
                  <span>UPI / QR</span>
                </button>

                <button 
                  type="button" 
                  className={`rzp-tab-btn ${rzpMethod === 'card' ? 'active' : ''}`}
                  onClick={() => setRzpMethod('card')}
                >
                  <CreditCard size={16} />
                  <span>Card</span>
                </button>

                <button 
                  type="button" 
                  className={`rzp-tab-btn ${rzpMethod === 'netbanking' ? 'active' : ''}`}
                  onClick={() => setRzpMethod('netbanking')}
                >
                  <Building size={16} />
                  <span>Netbanking</span>
                </button>
              </div>

              {/* Right Method Panel */}
              <div className="rzp-m-content">
                {rzpMethod === 'qr' && (
                  <div className="rzp-qr-pane">
                    <div className="rzp-qr-box">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=upi://pay?pa=shine.peerpath@razorpay&pn=Shine+PeerPath&am=${payableAmount}&cu=INR`} 
                        alt="Scan UPI QR Code" 
                        className="rzp-qr-img"
                      />
                    </div>
                    <div className="rzp-qr-text">
                      <strong>Scan and pay with any UPI App</strong>
                      <p>Google Pay • PhonePe • Paytm • CRED • BHIM</p>
                    </div>
                  </div>
                )}

                {rzpMethod === 'upi' && (
                  <div className="rzp-upi-pane">
                    <div className="rzp-upi-fast-apps">
                      <div className="rzp-app-item">
                        <span className="rzp-app-dot gpay"></span> Google Pay
                      </div>
                      <div className="rzp-app-item">
                        <span className="rzp-app-dot phonepe"></span> PhonePe
                      </div>
                      <div className="rzp-app-item">
                        <span className="rzp-app-dot paytm"></span> Paytm
                      </div>
                    </div>
                    <div className="rzp-upi-custom-input">
                      <input type="text" placeholder="Enter any UPI ID (e.g. yourname@upi)" />
                    </div>
                  </div>
                )}

                {rzpMethod === 'card' && (
                  <div className="rzp-card-pane">
                    <div className="rzp-card-input-group">
                      <label>Card Number</label>
                      <input type="text" placeholder="4111 2222 3333 4444" defaultValue="4532 8901 2345 6789" />
                    </div>
                    <div className="rzp-card-dual-grid">
                      <div>
                        <label>Expiry (MM/YY)</label>
                        <input type="text" placeholder="12/28" defaultValue="10/28" />
                      </div>
                      <div>
                        <label>CVV</label>
                        <input type="password" placeholder="•••" defaultValue="890" maxLength={4} />
                      </div>
                    </div>
                  </div>
                )}

                {rzpMethod === 'netbanking' && (
                  <div className="rzp-nb-pane">
                    <div className="rzp-nb-grid">
                      <span className="rzp-nb-pill active">HDFC Bank</span>
                      <span className="rzp-nb-pill">ICICI Bank</span>
                      <span className="rzp-nb-pill">SBI</span>
                      <span className="rzp-nb-pill">Axis Bank</span>
                      <span className="rzp-nb-pill">Kotak</span>
                      <span className="rzp-nb-pill">All Other Banks</span>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Razorpay Modal Footer */}
            <div className="rzp-m-footer">
              <div className="rzp-m-sec-brand">
                <ShieldCheck size={14} className="text-blue-600" />
                <span>Secured by <strong>Razorpay</strong></span>
              </div>
              
              <button 
                type="button" 
                className="btn-rzp-submit" 
                onClick={handleCompletePayment}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Verifying with Bank...</span>
                  </>
                ) : (
                  <>
                    <Lock size={15} />
                    <span>Pay ₹{payableAmount}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
