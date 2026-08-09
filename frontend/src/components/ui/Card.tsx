import React from 'react';
import { motion } from 'framer-motion';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hoverable?: boolean;
  scrollable?: boolean; // set true for cards that contain a scrollable table
}

export const Card: React.FC<CardProps> = ({
  children,
  glass = true,
  hoverable = true,
  scrollable = false,
  className = '',
  style,
  ...props
}) => {
  return (
    <motion.div
      whileHover={hoverable ? { y: -4, scale: 1.008 } : undefined}
      transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
      className={`glass-card ${scrollable ? 'glass-card-table' : ''} p-6 ${className}`}
      style={style}
      {...(props as any)}
    >
      {/* Top curved specular sheen highlight */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '35%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </motion.div>
  );
};

export default Card;
