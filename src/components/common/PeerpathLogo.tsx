import React from 'react';
import { BRAND } from '../../config/brand';

interface PeerpathLogoProps {
  size?: number;
  showText?: boolean;
  textColor?: string;
  subTextColor?: string;
  className?: string;
  variant?: 'svg' | 'image';
  theme?: 'light' | 'dark';
}

export const PeerpathSymbolSvg: React.FC<{ 
  size?: number; 
  className?: string;
  theme?: 'light' | 'dark';
}> = ({ 
  size = 32, 
  className = '',
  theme = 'light'
}) => {
  const isDark = theme === 'dark';
  const mainColor = isDark ? '#FFFFFF' : '#0C3B6E';
  const leadArrowColor = isDark ? '#38BDF8' : '#0C3B6E';
  const tealColor = isDark ? '#2DD4BF' : '#228B96';
  const starColor = isDark ? '#FFD700' : '#228B96';

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`peerpath-svg-symbol ${isDark ? 'dark-theme' : 'light-theme'} ${className}`}
      style={{ display: 'block', flexShrink: 0, overflow: 'visible' }}
      aria-label={`${BRAND.name} Logo`}
    >
      {/* 5-Pointed Star at Top-Right Gap - Animated on hover */}
      <polygon 
        className="star-element peerpath-star-element"
        points="75,10 78,21 89,21 80,28 83,39 75,32 67,39 70,28 61,21 72,21" 
        fill={starColor} 
      />

      {/* Outer 'P' Upper Arch */}
      <path 
        className="peerpath-arch-element"
        d="M 22,48 C 22,25 38,14 58,14 C 64,14 69,15 73,17" 
        stroke={mainColor} 
        strokeWidth="7.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Outer 'P' Lower Loop */}
      <path 
        className="peerpath-arch-element"
        d="M 78,28 C 83,35 83,48 78,57 C 72,67 61,72 48,72" 
        stroke={mainColor} 
        strokeWidth="7.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Left Outer Vertical Stem of P */}
      <path 
        className="peerpath-stem-element"
        d="M 22,48 L 22,92" 
        stroke={mainColor} 
        strokeWidth="7.5" 
        strokeLinecap="round" 
      />

      {/* 1. Left Diagonal Arrow */}
      <g className="peerpath-arrow-left">
        <path 
          d="M 24,58 L 38,44" 
          stroke={mainColor} 
          strokeWidth="6" 
          strokeLinecap="round" 
        />
        <polygon 
          points="34,36 49,41 44,53" 
          fill={mainColor} 
        />
      </g>

      {/* 2. Middle Main Soaring Arrow */}
      <g className="peerpath-arrow-lead">
        <path 
          d="M 25,90 C 25,75 30,62 46,45 L 53,38" 
          stroke={leadArrowColor} 
          strokeWidth="6.5" 
          strokeLinecap="round" 
        />
        <polygon 
          points="48,30 65,36 58,50" 
          fill={leadArrowColor} 
        />
      </g>

      {/* 3. Right Inner Curved Arrow */}
      <g className="peerpath-arrow-teal">
        <path 
          d="M 37,90 C 37,78 41,70 50,60" 
          stroke={tealColor} 
          strokeWidth="6" 
          strokeLinecap="round" 
        />
        <polygon 
          points="46,52 61,56 55,68" 
          fill={tealColor} 
        />
      </g>
    </svg>
  );
};

export const PeerpathLogo: React.FC<PeerpathLogoProps> = ({
  size = 36,
  showText = true,
  textColor = '#0F172A',
  subTextColor = '#64748B',
  className = '',
  variant = 'svg',
  theme
}) => {
  const isDark = theme === 'dark' || textColor === '#FFFFFF' || textColor?.toLowerCase().includes('fff');
  const activeTheme = isDark ? 'dark' : (theme || 'light');

  return (
    <div className={`peerpath-brand-logo-wrap ${isDark ? 'theme-dark-wrap' : 'theme-light-wrap'} ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '9px' }}>
      <div 
        className="peerpath-brand-symbol-new" 
        style={{ 
          width: `${size}px`, 
          height: `${size}px`, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        {variant === 'image' && !isDark ? (
          <img 
            src="/brand/android-chrome-512x512.png" 
            alt={`${BRAND.name} Logo`} 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
          />
        ) : (
          <PeerpathSymbolSvg size={size} theme={activeTheme} />
        )}
      </div>

      {showText && (
        <div className="peerpath-brand-text-col" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, flexShrink: 0, whiteSpace: 'nowrap' }}>
          <span 
            className="peerpath-brand-title" 
            style={{ 
              fontSize: size >= 36 ? '17px' : '15px', 
              fontWeight: 900, 
              letterSpacing: '0.6px', 
              color: textColor,
              whiteSpace: 'nowrap',
              fontFamily: "'Plus Jakarta Sans', 'Outfit', 'Inter', sans-serif"
            }}
          >
            {BRAND.name.toUpperCase()}
          </span>
          <span 
            className="peerpath-brand-sub" 
            style={{ 
              fontSize: '11px', 
              color: subTextColor, 
              fontWeight: 600,
              marginTop: '1px',
              whiteSpace: 'nowrap'
            }}
          >
            by <strong className="shine-mark" style={{ color: isDark ? '#FCD34D' : '#0C3B6E', fontWeight: 800 }}>{BRAND.parentDomain}</strong>
          </span>
        </div>
      )}
    </div>
  );
};

export default PeerpathLogo;
