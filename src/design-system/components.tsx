import React from 'react';
import { DS, getStatusBadgeStyle, getRiskBadgeStyle } from './tokens';
import { X, Check, AlertTriangle, AlertCircle, Info, Sparkles } from 'lucide-react';

// ==========================================
// 1. PAGE HEADER
// ==========================================
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: 'default' | 'info' | 'success' | 'warning' | 'critical' | 'ai';
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  badgeVariant = 'default',
  actions,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200/80 mb-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className={DS.typography.pageTitle}>{title}</h1>
          {badge && (
            <span
              className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-[6px] border ${
                badgeVariant === 'info'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : badgeVariant === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : badgeVariant === 'warning'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : badgeVariant === 'critical'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : badgeVariant === 'ai'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className={DS.typography.pageSubtitle}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
};

// ==========================================
// 2. SECTION HEADER
// ==========================================
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between gap-3 mb-3.5 ${className}`}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-slate-500 flex-shrink-0">{icon}</span>}
        <div>
          <h2 className={DS.typography.sectionTitle}>{title}</h2>
          {subtitle && <p className={DS.typography.sectionSubtitle}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};

// ==========================================
// 3. CARD CONTAINER
// ==========================================
interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  header,
  footer,
  onClick,
  hoverable = false,
}) => {
  const paddingClass =
    padding === 'none'
      ? ''
      : padding === 'sm'
      ? 'p-3.5'
      : padding === 'lg'
      ? 'p-6'
      : 'p-5';

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200/90 rounded-[10px] shadow-[0_1px_3px_0_rgba(15,23,42,0.03)] transition-all ${
        hoverable ? 'hover:border-slate-300 hover:shadow-[0_2px_8px_0_rgba(15,23,42,0.06)] cursor-pointer' : ''
      } ${className}`}
    >
      {header && <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 rounded-t-[9px]">{header}</div>}
      <div className={paddingClass}>{children}</div>
      {footer && <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40 rounded-b-[9px] text-xs text-slate-500">{footer}</div>}
    </div>
  );
};

// ==========================================
// 4. STAT CARD (KPIS)
// ==========================================
interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  variant?: 'default' | 'critical' | 'warning' | 'success' | 'info';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon,
  trend,
  variant = 'default',
  onClick,
}) => {
  const variantStyles = {
    default: 'border-slate-200/90',
    critical: 'border-rose-200/90 bg-rose-50/20',
    warning: 'border-amber-200/90 bg-amber-50/20',
    success: 'border-emerald-200/90 bg-emerald-50/20',
    info: 'border-blue-200/90 bg-blue-50/20',
  };

  const textStyles = {
    default: 'text-slate-900',
    critical: 'text-rose-900',
    warning: 'text-amber-900',
    success: 'text-emerald-900',
    info: 'text-blue-900',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-[10px] p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] ${variantStyles[variant]} ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-md transition-all' : ''
      }`}
    >
      <div className="flex items-center justify-between text-slate-500 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${textStyles[variant]}`}>
          {value}
        </div>
        {trend && (
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              trend.isPositive
                ? 'text-emerald-700 bg-emerald-50'
                : trend.isNeutral
                ? 'text-slate-600 bg-slate-100'
                : 'text-rose-700 bg-rose-50'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>
      {subtext && <p className="text-xs text-slate-500 mt-1.5 leading-tight">{subtext}</p>}
    </div>
  );
};

// ==========================================
// 5. BADGES
// ==========================================
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'status' | 'risk' | 'neutral' | 'info' | 'success' | 'warning' | 'critical' | 'ai';
  value?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  value = '',
  size = 'md',
  className = '',
}) => {
  let style = 'bg-slate-100 text-slate-700 border-slate-200';

  if (variant === 'status') {
    style = getStatusBadgeStyle(value || String(children));
  } else if (variant === 'risk') {
    style = getRiskBadgeStyle(value || String(children));
  } else if (variant === 'success') {
    style = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  } else if (variant === 'warning') {
    style = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (variant === 'critical') {
    style = 'bg-rose-50 text-rose-800 border-rose-200';
  } else if (variant === 'info') {
    style = 'bg-blue-50 text-blue-800 border-blue-200';
  } else if (variant === 'ai') {
    style = 'bg-indigo-50 text-indigo-800 border-indigo-200';
  }

  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-[6px] border ${sizeClass} ${style} ${className}`}
    >
      {children}
    </span>
  );
};

// ==========================================
// 6. BUTTON
// ==========================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'ai';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium rounded-[8px] transition-all select-none focus:outline-none focus:ring-2 focus:ring-slate-400/40 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-sm gap-2',
    lg: 'px-4.5 py-2.5 text-base gap-2.5',
  };

  const variantClasses = {
    primary: 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs',
    outline: 'border border-slate-300 hover:bg-slate-50 text-slate-700',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    ai: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${base} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};

// ==========================================
// 7. MODAL BASE
// ==========================================
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  icon?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'xl',
  icon,
}) => {
  if (!isOpen) return null;

  const widthMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        className={`w-full ${widthMap[maxWidth]} bg-white rounded-[12px] border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-slate-50/50">
          <div className="flex items-center gap-3">
            {icon && <div className="p-2 rounded-[8px] bg-slate-100 text-slate-700">{icon}</div>}
            <div>
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-[6px] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/60">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
