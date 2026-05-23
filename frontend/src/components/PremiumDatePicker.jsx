import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import CustomSelect from './CustomSelect';

const monthsOptions = [
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' },
];

const currentYear = new Date().getFullYear();
const yearsOptions = Array.from({ length: currentYear - 2015 + 1 }, (_, i) => {
  const y = 2015 + i;
  return { value: y, label: String(y) };
}).reverse();

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
          renderCustomHeader={({
            date,
            changeYear,
            changeMonth,
            decreaseMonth,
            increaseMonth,
            prevMonthButtonDisabled,
            nextMonthButtonDisabled,
          }) => (
            <div className="flex items-center justify-between px-1.5 py-1 gap-2">
              <button
                type="button"
                onClick={decreaseMonth}
                disabled={prevMonthButtonDisabled}
                className="p-1 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center shrink-0"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-muted hover:text-main" />
              </button>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <CustomSelect
                  value={date.getMonth()}
                  onChange={(val) => changeMonth(Number(val))}
                  options={monthsOptions}
                  className="flex-1 min-w-0"
                  buttonClassName="px-2 text-xs font-semibold rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-main flex items-center justify-between"
                  buttonStyle={{ height: '28px', padding: '0 8px', borderRadius: '8px' }}
                  dropdownClassName="w-32"
                />
                <CustomSelect
                  value={date.getFullYear()}
                  onChange={(val) => changeYear(Number(val))}
                  options={yearsOptions}
                  className="w-[74px] shrink-0"
                  buttonClassName="px-2 text-xs font-semibold rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-main flex items-center justify-between"
                  buttonStyle={{ height: '28px', padding: '0 8px', borderRadius: '8px' }}
                  dropdownClassName="w-24"
                />
              </div>
              <button
                type="button"
                onClick={increaseMonth}
                disabled={nextMonthButtonDisabled}
                className="p-1 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center shrink-0"
              >
                <ChevronRight className="w-3.5 h-3.5 text-muted hover:text-main" />
              </button>
            </div>
          )}
          {...props}
          type="text"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted z-10">
          <Calendar size={18} />
        </div>
      </div>
    </div>
  );
};

export default PremiumDatePicker;
