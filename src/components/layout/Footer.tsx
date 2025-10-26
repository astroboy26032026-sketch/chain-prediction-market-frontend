import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer
      className="w-full border-t"
      style={{
        background: 'var(--navbar-bg)',
        borderColor: 'var(--navbar-border)',
        minHeight: '44px',
      }}
    />
  );
};

export default Footer;
