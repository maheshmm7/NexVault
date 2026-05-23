import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ title, value, type, trend, icon: Icon }) {
  const isPositive = trend > 0;
  const isNegative = trend < 0;

  // Type-specific colors and accent definitions
  let hoverBorderClass = 'hover:border-primary/30 hover:shadow-[0_12px_24px_rgba(59,130,246,0.04)]';
  let iconBgClass = 'bg-primary/5 border-primary/10 group-hover:bg-primary/10 group-hover:border-primary/25';
  let iconTextClass = 'text-primary';
  let leftAccentColor = 'bg-primary';

  if (type === 'income') {
    hoverBorderClass = 'hover:border-emerald-500/30 hover:shadow-[0_12px_24px_rgba(16,185,129,0.04)]';
    iconBgClass = 'bg-emerald-500/5 border-emerald-500/10 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/25';
    iconTextClass = 'text-emerald-400';
    leftAccentColor = 'bg-emerald-500';
  } else if (type === 'expense') {
    hoverBorderClass = 'hover:border-rose-500/30 hover:shadow-[0_12px_24px_rgba(239,68,68,0.04)]';
    iconBgClass = 'bg-rose-500/5 border-rose-500/10 group-hover:bg-rose-500/10 group-hover:border-rose-500/25';
    iconTextClass = 'text-rose-400';
    leftAccentColor = 'bg-rose-500';
  }

  return (
    <div className={`card p-5 sm:p-6 flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden border border-white/5 ${hoverBorderClass} select-none`}>
      {/* Dynamic left border highlight on hover */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full transition-all duration-300 opacity-0 group-hover:opacity-100 ${leftAccentColor}`} />

      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl border transition-all duration-300 ${iconBgClass}`}>
          <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${iconTextClass}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-xs sm:text-sm font-bold px-2 py-0.5 rounded-full bg-white/[0.02] border border-white/5 ${isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-muted'}`}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : isNegative ? <TrendingDown className="w-3.5 h-3.5 mr-1" /> : <Minus className="w-3.5 h-3.5 mr-1" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div>
        <h3 className="text-muted text-xs sm:text-sm font-semibold mb-1 truncate">{title}</h3>
        <p className="text-xl sm:text-2xl lg:text-3xl font-black text-main tracking-tight truncate tabular-nums" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}

