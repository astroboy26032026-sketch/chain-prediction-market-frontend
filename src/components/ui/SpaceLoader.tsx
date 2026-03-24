import React from 'react';

interface SpaceLoaderProps {
  /** 'overlay' = full-screen dark backdrop, 'inline' = centered inside parent */
  variant?: 'overlay' | 'inline';
  size?: 'small' | 'medium' | 'large';
  label?: string;
}

const SIZES = {
  small:  { outer: 60,  inner: 44,  rocket: 20 },
  medium: { outer: 90,  inner: 66,  rocket: 28 },
  large:  { outer: 120, inner: 88,  rocket: 36 },
};

const SpaceLoader: React.FC<SpaceLoaderProps> = ({
  variant = 'inline',
  size = 'medium',
  label,
}) => {
  const { outer, inner, rocket } = SIZES[size];

  const core = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center"
        style={{ width: outer, height: outer }}
      >
        {/* Outer ring */}
        <div
          className="absolute rounded-full border-2 border-transparent"
          style={{
            width: outer,
            height: outer,
            borderTopColor: 'var(--primary)',
            borderRightColor: 'var(--primary)',
            animation: 'space-spin 1.2s linear infinite',
          }}
        />
        {/* Inner ring (reverse) */}
        <div
          className="absolute rounded-full border-2 border-transparent"
          style={{
            width: inner,
            height: inner,
            borderBottomColor: 'var(--accent)',
            borderLeftColor: 'var(--accent)',
            animation: 'space-spin 0.8s linear infinite reverse',
          }}
        />
        {/* Rocket center */}
        <span style={{ fontSize: rocket, lineHeight: 1 }}>🚀</span>
      </div>

      {label !== '' && (
        <p
          className="font-semibold tracking-widest uppercase"
          style={{
            fontSize: size === 'small' ? 10 : size === 'medium' ? 12 : 13,
            color: 'var(--primary)',
            letterSpacing: '0.15em',
          }}
        >
          {label ?? 'Launching…'}
        </p>
      )}

      <style>{`
        @keyframes space-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );

  if (variant === 'overlay') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(13,16,32,0.97) 0%, rgba(5,8,20,0.99) 100%)',
        }}
      >
        {core}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full h-full">
      {core}
    </div>
  );
};

export default SpaceLoader;
