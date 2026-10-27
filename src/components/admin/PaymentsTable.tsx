import React, { useState } from 'react';
import { 
  Search, Banknote, CalendarCheck, TrendingUp, 
  Sparkles, SlidersHorizontal, X 
} from 'lucide-react';
import { AdminBookingData, AdminOverviewStats } from '../../types';
import { BRAND } from '../../config/brand';

interface PaymentsTableProps {
  bookings: AdminBookingData[];
  overview: AdminOverviewStats | null;
}

export const PaymentsTable: React.FC<PaymentsTableProps> = ({
  bookings,
  overview,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const totalGmv = overview?.totalGmv ?? bookings.reduce((sum, b) => sum + (b.price || 0), 0);
  const platformRevenue = overview?.platformEarnings ?? Math.round(totalGmv * 0.15);
  const mentorEarnings = totalGmv - platformRevenue;

  const filtered = bookings.filter(b => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !query ||
      (b.candidateName || '').toLowerCase().includes(query) ||
      (b.candidateEmail || '').toLowerCase().includes(query) ||
      (b.expertName || '').toLowerCase().includes(query) ||
      (b.expertCompany || '').toLowerCase().includes(query) ||
      (b.id || '').toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (statusFilter !== 'all') {
      return (b.status || '').toLowerCase() === statusFilter.toLowerCase();
    }
    return true;
  });

  return (
    <div className="crm-content-section animate-fade-in">
      {/* Section Header */}
      <div className="crm-section-header">
        <div>
          <h2>Payments, Bookings &amp; GMV Clearing</h2>
          <p>
            Track 1:1 mentorship bookings, escrow settlements, 15% {BRAND.name} platform commission, and mentor payouts.
          </p>
        </div>
      </div>

      {/* Financial Metrics Cards Strip */}
      <div className="crm-financial-kpi-grid">
        <div className="crm-fin-card">
          <div className="crm-fin-icon indigo">
            <Banknote size={22} />
          </div>
          <div>
            <span className="crm-fin-label">Total Platform GMV</span>
            <strong className="crm-fin-value">₹{totalGmv.toLocaleString('en-IN')}</strong>
            <span className="crm-fin-sub">Gross booking volume</span>
          </div>
        </div>

        <div className="crm-fin-card">
          <div className="crm-fin-icon emerald">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="crm-fin-label">{BRAND.name} Commission (15%)</span>
            <strong className="crm-fin-value text-emerald-600">₹{platformRevenue.toLocaleString('en-IN')}</strong>
            <span className="crm-fin-sub">Platform net revenue</span>
          </div>
        </div>

        <div className="crm-fin-card">
          <div className="crm-fin-icon purple">
            <Sparkles size={22} />
          </div>
          <div>
            <span className="crm-fin-label">Mentor Payouts (85%)</span>
            <strong className="crm-fin-value">₹{mentorEarnings.toLocaleString('en-IN')}</strong>
            <span className="crm-fin-sub">Disbursed to mentors</span>
          </div>
        </div>

        <div className="crm-fin-card">
          <div className="crm-fin-icon blue">
            <CalendarCheck size={22} />
          </div>
          <div>
            <span className="crm-fin-label">Total 1:1 Sessions</span>
            <strong className="crm-fin-value">{bookings.length}</strong>
            <span className="crm-fin-sub">Scheduled calls</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-crm-toolbar">
        <div className="admin-crm-search-box">
          <Search size={15} className="admin-search-icon" />
          <input
            type="text"
            className="admin-crm-search-input"
            placeholder="Search bookings by candidate, mentor, company, reference ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="admin-search-clear"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="admin-crm-filters">
          <SlidersHorizontal size={14} className="text-slate-400" />
          <select
            className="admin-crm-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Session Statuses ({bookings.length})</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <span className="admin-records-count">
            Showing <strong>{filtered.length}</strong> of {bookings.length}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="admin-crm-table-container">
        <table className="admin-crm-table">
          <thead>
            <tr>
              <th>Booking Ref</th>
              <th>Candidate (Mentee)</th>
              <th>Verified Mentor</th>
              <th>Date &amp; Time Slot</th>
              <th>Gross Fee</th>
              <th>{BRAND.name} Take (15%)</th>
              <th>Mentor Share (85%)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-table-empty">
                  <Banknote size={32} />
                  <p>No payment or booking records found matching current criteria.</p>
                </td>
              </tr>
            ) : (
              filtered.map(b => {
                const price = b.price || 0;
                const platformCut = b.platformCut || Math.round(price * 0.15);
                const mentorShare = b.mentorEarnings || (price - platformCut);

                return (
                  <tr key={b.id} className="admin-crm-row">
                    <td>
                      <code className="crm-booking-id">#{b.id.slice(0, 8)}</code>
                    </td>
                    <td>
                      <div className="font-semibold">{b.candidateName || 'Candidate'}</div>
                      <div className="text-xs text-slate-500">{b.candidateEmail || b.candidateId}</div>
                    </td>
                    <td>
                      <div className="font-semibold">{b.expertName || 'Mentor'}</div>
                      <div className="text-xs text-slate-500">🏢 {b.expertCompany || `${BRAND.name} Mentor`}</div>
                    </td>
                    <td>
                      <div className="font-medium text-slate-800">📅 {b.date || 'TBD'}</div>
                      <div className="text-xs text-slate-500">⏰ {b.timeSlot || 'Pending Slot'}</div>
                    </td>
                    <td>
                      <strong className="text-slate-900">₹{price}</strong>
                    </td>
                    <td>
                      <span className="font-semibold text-emerald-600">₹{platformCut}</span>
                    </td>
                    <td>
                      <span className="font-semibold text-indigo-600">₹{mentorShare}</span>
                    </td>
                    <td>
                      <span className={`crm-status-badge status-${b.status || 'confirmed'}`}>
                        {(b.status || 'confirmed').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
