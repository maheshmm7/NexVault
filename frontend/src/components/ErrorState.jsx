import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorState({ 
  title = 'Something went wrong', 
  message = 'We encountered an error loading this information.', 
  onRetry 
}) {
  return (
    <div className="card p-8 flex flex-col items-center justify-center text-center max-w-lg mx-auto my-12 border border-red-500/10 bg-red-500/[0.02]">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mb-5 border border-red-500/20">
        <AlertTriangle size={28} />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 mb-6 leading-relaxed max-w-sm">{message}</p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-secondary flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300 group"
        >
          <RefreshCw size={16} className="text-gray-400 group-hover:rotate-180 transition-transform duration-500" />
          <span>Retry Connection</span>
        </button>
      )}
    </div>
  );
}
