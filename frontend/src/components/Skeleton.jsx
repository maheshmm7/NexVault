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

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6 animate-pulse">
        <div className="space-y-2">
          <div className="w-32 h-8 bg-white/5 rounded-lg"></div>
          <div className="w-48 h-4 bg-white/5 rounded-md"></div>
        </div>
        <div className="w-40 h-10 bg-white/5 rounded-xl"></div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-5 animate-pulse flex flex-col justify-between min-h-[100px]">
            <div className="w-16 h-3 bg-white/5 rounded"></div>
            <div className="w-24 h-6 bg-white/10 rounded-lg mt-3"></div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-6 lg:col-span-2 flex flex-col min-h-[360px] animate-pulse">
          <div className="flex justify-between mb-6">
            <div className="w-36 h-5 bg-white/5 rounded"></div>
            <div className="w-24 h-5 bg-white/5 rounded"></div>
          </div>
          <div className="flex-1 bg-white/[0.02] rounded-xl"></div>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="card p-5 animate-pulse min-h-[160px] flex flex-col justify-between">
            <div className="w-28 h-4 bg-white/5 rounded"></div>
            <div className="w-full h-10 bg-white/5 rounded-xl"></div>
            <div className="w-full h-10 bg-white/5 rounded-xl"></div>
          </div>
          
          <div className="card p-5 animate-pulse min-h-[180px] flex flex-col justify-between">
            <div className="w-36 h-4 bg-white/5 rounded"></div>
            <div className="w-24 h-24 bg-white/5 rounded-full mx-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonLedger() {
  return (
    <div className="card p-6 animate-pulse space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="w-48 h-8 bg-white/5 rounded-lg"></div>
        <div className="flex gap-2">
          <div className="w-24 h-9 bg-white/5 rounded-lg"></div>
          <div className="w-24 h-9 bg-white/5 rounded-lg"></div>
        </div>
      </div>
      <div className="border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex justify-between items-center p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/5 rounded-full"></div>
              <div className="space-y-1.5">
                <div className="w-32 h-4 bg-white/10 rounded"></div>
                <div className="w-24 h-3 bg-white/5 rounded"></div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-4 bg-white/5 rounded"></div>
              <div className="w-20 h-5 bg-white/10 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonVault() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-4 animate-pulse min-h-[90px] flex flex-col justify-between">
            <div className="w-16 h-3 bg-white/5 rounded"></div>
            <div className="w-12 h-6 bg-white/10 rounded-lg mt-3"></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="card p-5 animate-pulse flex flex-col justify-between min-h-[180px]">
            <div className="flex justify-between">
              <div className="w-16 h-5 bg-white/5 rounded-full"></div>
              <div className="w-10 h-4 bg-white/5 rounded"></div>
            </div>
            <div className="space-y-2 mt-4">
              <div className="w-2/3 h-4 bg-white/10 rounded"></div>
              <div className="w-1/2 h-3 bg-white/5 rounded"></div>
            </div>
            <div className="w-full h-8 bg-white/5 rounded-lg mt-4"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
