import { ReactNode } from 'react';

interface MarqueeProps {
  children: ReactNode;
  speed?: number;
  height?: number;
  pauseOnHover?: boolean;
  fade?: boolean;
  className?: string;
}

const Marquee: React.FC<MarqueeProps> = ({
  children,
  speed = 22,
  height = 84,
  pauseOnHover = true,
  fade = true,
  className = '',
}) => {
  return (
    <div
      className={`marquee-container ${pauseOnHover ? 'marquee-pause' : ''} ${className}`}
      style={{ height }}
    >
      {fade && <div className="marquee-fade" />}
      <div
        className="marquee-track"
        style={{ animationDuration: `${speed}s` }}
      >
        {children}
        {children}
      </div>
    </div>
  );
};

export default Marquee;
