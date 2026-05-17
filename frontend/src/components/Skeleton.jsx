export function SkeletonCard({ type = 'simple' }) {
  const minH = type === 'credit' ? 'min-h-[260px]' : 'min-h-[210px]';
  return (
    <div className={`card p-6 animate-pulse flex flex-col ${minH}`}>
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 bg-white/[0.04] rounded-xl"></div>
        <div className="w-20 h-6 bg-white/[0.03] rounded-lg"></div>
      </div>
      <div className="flex-1 space-y-4">
        <div className="w-1/2 h-4 bg-white/[0.03] rounded"></div>
        <div className="w-full h-10 bg-white/[0.06] rounded-xl"></div>
        <div className="space-y-2">
          <div className="w-full h-2 bg-white/[0.03] rounded-full"></div>
          <div className="w-2/3 h-2 bg-white/[0.03] rounded-full"></div>
        </div>
      </div>
      <div className="pt-6 border-t border-white/5 flex justify-between mt-auto">
        <div className="w-24 h-3 bg-white/[0.03] rounded"></div>
        <div className="w-16 h-3 bg-white/[0.03] rounded"></div>
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between p-4 border-b border-white/5 animate-pulse">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-white/5 rounded-full"></div>
        <div>
          <div className="w-32 h-4 bg-white/10 rounded mb-2"></div>
          <div className="w-24 h-3 bg-white/5 rounded"></div>
        </div>
      </div>
      <div className="w-20 h-5 bg-white/10 rounded"></div>
    </div>
  );
}
