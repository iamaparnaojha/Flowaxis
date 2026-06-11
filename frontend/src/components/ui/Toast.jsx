'use client';

import { useEffect, useRef } from 'react';
import styles from './Toast.module.css';

const ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'i',
};

const Toast = ({ toast, onRemove }) => {
  const progressRef = useRef(null);

  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.style.animation = 'toast-progress 4s linear forwards';
    }
  }, []);

  return (
    <div className={`${styles.toast} ${styles[toast.type]}`} role="alert">
      <span className={styles.icon}>{ICONS[toast.type]}</span>
      <span className={styles.message}>{toast.message}</span>
      <button className={styles.close} onClick={() => onRemove(toast.id)} aria-label="Dismiss">✕</button>
      <div className={styles.progress} ref={progressRef} />
    </div>
  );
};

export const ToastContainer = ({ toasts, removeToast }) => (
  <div className="toast-container">
    {toasts.map((t) => (
      <Toast key={t.id} toast={t} onRemove={removeToast} />
    ))}
  </div>
);

export default Toast;
