import React, { useEffect } from 'react';
import Image from 'next/image';

interface LoadingBarProps {
  /** giữ cho tương thích, nhưng mặc định sẽ ignore để tránh blur */
  size?: 'small' | 'medium' | 'large';
  color?: string;
  open?: boolean;                 // bật/tắt overlay
  overlayBg?: string;             // nền overlay
  zIndex?: number;                // z-index overlay
  hideLabel?: boolean;            // ẩn chữ Loading...
  /** kích thước GIF gốc (px) để hiển thị 1:1, tránh nhoè */
  nativeWidth?: number;
  nativeHeight?: number;
  /** nếu vẫn muốn ép kích thước, bật cờ này (có thể làm giảm độ nét) */
  allowResize?: boolean;
}

const LoadingBar: React.FC<LoadingBarProps> = ({
  size = 'medium',
  color = 'var(--primary)',
  open = true,
  overlayBg = 'rgba(0,0,0,0.45)',
  zIndex = 9999,
  hideLabel = false,
  nativeWidth = 150,   // 👉 chỉnh đúng theo GIF của bạn (ví dụ: 150x150)
  nativeHeight = 150,
  allowResize = false, // ❗ mặc định KHÔNG resize để tránh nhoè
}) => {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  // Nếu THẬT SỰ muốn dùng size tùy ý, bật allowResize = true
  const sizePx = {
    small: 96,
    medium: 150,
    large: 256,
  }[size];

  const w = allowResize ? sizePx : nativeWidth;
  const h = allowResize ? Math.round((nativeHeight / nativeWidth) * w) : nativeHeight;

  return (
    <div
      className="fixed inset-0 grid place-items-center"
      style={{ background: overlayBg, zIndex, backdropFilter: 'blur(2px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Loading overlay"
    >
      <div className="flex flex-col items-center justify-center gap-3" aria-busy="true">
        {/* Đặt file vào public/tree-loader.gif */}
        <Image
          src="/tree-loader.gif"
          alt="Growing tree loader"
          width={w}
          height={h}
          unoptimized        // 🔥 giữ GIF gốc, không convert/resize => không nhoè
          priority
          draggable={false}
          style={{
            objectFit: 'contain',
            // Nếu vẫn resize, giữ nét tối đa:
            imageRendering: allowResize ? 'crisp-edges' as any : undefined,
          }}
        />
      </div>
    </div>
  );
};

export default LoadingBar;
