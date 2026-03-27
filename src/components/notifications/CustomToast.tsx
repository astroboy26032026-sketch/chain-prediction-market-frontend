import React, { useEffect, useState } from 'react';

type ToastType = 'success' | 'error';

interface CustomToastProps {
  type: ToastType;
  title: string;
  message: string;
  closeToast?: () => void;
}

const CustomToast: React.FC<CustomToastProps> = ({ type, title, message, closeToast }) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(t);
  }, []);

  const isSuccess = type === 'success';

  return (
    <div className="custom-toast-card">
      {/* Icon */}
      <div className={`custom-toast-icon-wrap ${animate ? 'pop-in' : ''}`}>
        {/* Decorative dots */}
        <span className={`toast-dot dot-1 ${isSuccess ? 'dot-green' : 'dot-pink'}`} />
        <span className={`toast-dot dot-2 ${isSuccess ? 'dot-green' : 'dot-pink'}`} />
        <span className={`toast-dot dot-3 ${isSuccess ? 'dot-green' : 'dot-pink'}`} />
        <span className={`toast-dot dot-4 ${isSuccess ? 'dot-green' : 'dot-pink'}`} />

        <div className={`custom-toast-icon ${isSuccess ? 'icon-success' : 'icon-error'}`}>
          {isSuccess ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path className="toast-check-path" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path className="toast-x-path" d="M18 6L6 18M6 6l12 12" />
            </svg>
          )}
        </div>
      </div>

      {/* Text */}
      <div className="custom-toast-title">{title}</div>
      <div className="custom-toast-message">{message}</div>

      {/* Button */}
      <button
        className={`custom-toast-btn ${isSuccess ? 'btn-success' : 'btn-error'}`}
        onClick={closeToast}
      >
        {isSuccess ? 'Ok' : 'Try again'}
      </button>
    </div>
  );
};

export default CustomToast;
