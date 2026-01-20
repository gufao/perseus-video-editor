import { useEffect } from 'react';
import clsx from 'clsx';
import { useProjectStore } from '../../stores/useProjectStore';

const Toast = () => {
  const { notification, setNotification } = useProjectStore();

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification, setNotification]);

  if (!notification) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
      <div 
        className={clsx(
          "px-4 py-3 rounded-lg shadow-2xl border flex items-center space-x-3 min-w-[300px]",
          notification.type === 'success' 
            ? "bg-bg-elevated border-accent text-text-primary" 
            : "bg-bg-elevated border-red-500 text-white"
        )}
      >
        <div className={clsx(
          "p-1 rounded-full",
          notification.type === 'success' ? "bg-accent/20" : "bg-red-500/20"
        )}>
          {notification.type === 'success' ? (
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          ) : (
             <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
             </svg>
          )}
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">{notification.message}</p>
        </div>
        <button 
          onClick={() => setNotification(null)}
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;
