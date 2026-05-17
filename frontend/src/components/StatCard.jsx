import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ title, value, type, trend, icon: Icon }) {
  const isPositive = trend > 0;
  const isNegative = trend < 0;

  return (
    <div className="card p-6 flex flex-col justify-between hover:border-primary/30 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-white/5 rounded-xl border border-white/5">
          <Icon className={`w-5 h-5 ${type === 'income' ? 'text-secondary' : type === 'expense' ? 'text-danger' : 'text-primary'}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-sm font-medium ${isPositive ? 'text-secondary' : isNegative ? 'text-danger' : 'text-muted'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : isNegative ? <TrendingDown className="w-4 h-4 mr-1" /> : <Minus className="w-4 h-4 mr-1" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div>
        <h3 className="text-muted text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-bold text-main tracking-tight">{value}</p>
      </div>
    </div>
  );
}
