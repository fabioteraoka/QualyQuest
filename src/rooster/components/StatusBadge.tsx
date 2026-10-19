import React from 'react';
import { ItemStatus } from '../types';
import { getStatusColor } from '../utils/businessRules';

interface StatusBadgeProps {
  status: ItemStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
  showText = true,
}) => {
  const colors = getStatusColor(status);

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
    lg: 'text-sm px-3 py-1 font-semibold',
  };

  return (
    <span
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
      }}
      className={`inline-flex items-center font-medium rounded border whitespace-nowrap tabular-nums ${sizeClasses[size]} ${className}`}
    >
      {showText ? status : ''}
    </span>
  );
};
