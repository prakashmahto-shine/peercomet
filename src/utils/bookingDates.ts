// Booking date strings are shared with the backend's slot validation ("Mon, 12 Oct 2026").
// Keep this format in sync with booking_service._validate_slot.
export const formatBookingDate = (d: Date): string => {
  const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${dayOfWeek}, ${d.getDate()} ${month} ${d.getFullYear()}`;
};

// Next `count` dates (from today) that fall on one of the mentor's available weekdays
export const upcomingBookableDates = (availableDays: string[] | undefined, count = 7, horizonDays = 21): string[] => {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < horizonDays && dates.length < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });
    if (!availableDays?.length || availableDays.includes(dayOfWeek)) {
      dates.push(formatBookingDate(d));
    }
  }
  return dates;
};
