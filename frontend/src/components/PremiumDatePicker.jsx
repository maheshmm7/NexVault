import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

const PremiumDatePicker = ({ value, onChange, placeholder, required, label, popperPlacement = "bottom-start", ...props }) => {
  const { dateTimePreferences } = useSettings();
  const weekStart = dateTimePreferences?.weekStart === 'Sunday' ? 0 : 1;
  const selectedDate = value ? new Date(value) : null;

  const popperClass = popperPlacement === "bottom-end" ? "premium-popper-end" : "premium-popper-start";

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-muted mb-1">
          {label}
        </label>
      )}
      <div className="relative w-full">
        <DatePicker
          selected={selectedDate}
          onChange={(date) => {
            if (!date) {
              onChange('');
              return;
            }
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            onChange(`${year}-${month}-${day}`);
          }}
          dateFormat="dd-MM-yyyy"
          className="input-field w-full pr-10 cursor-pointer"
          placeholderText={placeholder || 'DD-MM-YYYY'}
          required={required}
          showPopperArrow={false}
          calendarStartDay={weekStart}
          calendarClassName="premium-calendar"
          wrapperClassName="w-full"
          popperClassName={popperClass}
          {...props}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted z-10">
          <Calendar size={18} />
        </div>
      </div>
    </div>
  );
};

export default PremiumDatePicker;
