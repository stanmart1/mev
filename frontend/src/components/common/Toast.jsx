import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const toastTypes = {
  success: { icon: CheckCircle, className: 'bg-green-50 border-green-200 text-green-800' },
  error: { icon: XCircle, className: 'bg-red-50 border-red-200 text-red-800' },
  warning: { icon: AlertCircle, className: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  info: { icon: Info, className: 'bg-blue-50 border-blue-200 text-blue-800' }
};

export default function Toast({ type = 'info', message, onClose, duration = 5000 }) {
  const [isVisible, setIsVisible] = useState(true);
  const { icon: Icon, className } = toastTypes[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 border rounded-lg shadow-lg transition-all duration-300 ${className}`}>
      <div className="flex items-center space-x-3">
        <Icon className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium">{message}</p>
        <button onClick={() => { setIsVisible(false); setTimeout(onClose, 300); }}>
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}