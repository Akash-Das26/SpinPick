import React from 'react';
import { AlertTriangle, RefreshCw } from '../lib/icons';

export function TabError({ tab }) {
  const handleGoHome = () => {
    window.location.hash = '#/studio'; // This will trigger the SPA router
    window.location.reload(); // Force reload for clean state
  };

  return (
    <div className="bg-dark text-primary grid grid-center p-24 min-h-[400px]">
      <div className="bg-surface border-medium p-32 text-center max-w-md mx-auto">
        <div className="rounded-md text-danger grid-center mx-auto mb-20 w-16 h-16">
          <AlertTriangle size={32} />
        </div>

        <h2 className="text-xl font-extrabold mb-8">
          Failed to Load {tab}
        </h2>

        <p className="text-base leading-normal mb-24 text-muted">
          SpinPick encountered an error loading the <strong>{tab}</strong> module. 
          Your decision history and wheel data are preserved in storage.
        </p>

        <div className="flex gap-8 justify-center">
          <button
            onClick={handleGoHome}
            className="btn btn-primary"
          >
            <RefreshCw size={16} />
            Reload & Go to Studio
          </button>
        </div>
      </div>
    </div>
  );
}