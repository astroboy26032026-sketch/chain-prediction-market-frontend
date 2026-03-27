import React from 'react';
import { toast, ToastOptions } from 'react-toastify';
import CustomToast from '@/components/notifications/CustomToast';

const baseOptions: ToastOptions = {
  position: 'top-center',
  autoClose: 4000,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: false,
  className: 'Toastify__toast--custom-card',
  bodyClassName: 'custom-toast-body',
};

export function toastSuccess(message: string, title = 'Success') {
  toast(
    ({ closeToast }) => (
      <CustomToast type="success" title={title} message={message} closeToast={closeToast} />
    ),
    { ...baseOptions, toastId: 'success-toast' }
  );
}

export function toastError(message: string, title = 'Error') {
  if (toast.isActive('error-toast')) return;
  toast(
    ({ closeToast }) => (
      <CustomToast type="error" title={title} message={message} closeToast={closeToast} />
    ),
    { ...baseOptions, autoClose: 6000, toastId: 'error-toast' }
  );
}
