import React from 'react';
import { motion } from 'framer-motion';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  glass = true,
  hoverable = true,
  className = '',
  style,
  ...props
}) => {
  return (
    <motion.div
      whileHover={hoverable ? { y: -4, scale: 1.008 } : undefined}
      transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
      className={`glass-card p-6 ${className}`}
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
