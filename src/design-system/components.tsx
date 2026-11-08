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
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800 mb-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className={DS.typography.pageTitle}>{title}</h1>
          {badge && (
            <span
              className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-[6px] border ${
                badgeVariant === 'info'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  : badgeVariant === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : badgeVariant === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : badgeVariant === 'critical'
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : badgeVariant === 'ai'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
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
        {icon && <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">{icon}</span>}
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
      className={`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-[10px] shadow-[0_1px_3px_0_rgba(15,23,42,0.03)] dark:shadow-none transition-all ${
        hoverable ? 'hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-[0_2px_8px_0_rgba(15,23,42,0.06)] dark:hover:shadow-none cursor-pointer' : ''
      } ${className}`}
    >
      {header && <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 rounded-t-[9px]">{header}</div>}
      <div className={paddingClass}>{children}</div>
      {footer && <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 rounded-b-[9px] text-xs text-slate-500 dark:text-slate-400">{footer}</div>}
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
    default: 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900',
    critical: 'border-rose-200/90 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20',
    warning: 'border-amber-200/90 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/20',
    success: 'border-emerald-200/90 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20',
    info: 'border-blue-200/90 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/20',
  };

  const textStyles = {
    default: 'text-slate-900 dark:text-slate-100',
    critical: 'text-rose-900 dark:text-rose-300',
    warning: 'text-amber-900 dark:text-amber-300',
    success: 'text-emerald-900 dark:text-emerald-300',
    info: 'text-blue-900 dark:text-blue-300',
  };

  return (
    <div
      onClick={onClick}
      className={`border rounded-[10px] p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] dark:shadow-none transition-all ${variantStyles[variant]} ${
        onClick ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all' : ''
      }`}
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
        {icon && <div className="text-slate-400 dark:text-slate-400">{icon}</div>}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${textStyles[variant]}`}>
          {value}
        </div>
        {trend && (
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              trend.isPositive
                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60'
                : trend.isNeutral
                ? 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800'
                : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>
      {subtext && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-tight">{subtext}</p>}
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
  let style = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

  if (variant === 'status') {
    style = getStatusBadgeStyle(value || String(children));
  } else if (variant === 'risk') {
    style = getRiskBadgeStyle(value || String(children));
  } else if (variant === 'success') {
    style = 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80';
  } else if (variant === 'warning') {
    style = 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/80';
  } else if (variant === 'critical') {
    style = 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/80';
  } else if (variant === 'info') {
    style = 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/80';
  } else if (variant === 'ai') {
    style = 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/80';
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
    'inline-flex items-center justify-center font-medium rounded-[8px] transition-all select-none focus:outline-none focus:ring-2 focus:ring-slate-400/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-sm gap-2',
    lg: 'px-4.5 py-2.5 text-base gap-2.5',
  };

  const variantClasses = {
    primary: 'bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 hover:dark:bg-white text-white dark:text-slate-900 shadow-xs',
    secondary: 'bg-white dark:bg-slate-800 hover:bg-slate-50 hover:dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs',
    outline: 'border border-slate-300 dark:border-slate-700 hover:bg-slate-50 hover:dark:bg-slate-800 text-slate-700 dark:text-slate-200',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs',
    ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 hover:dark:bg-slate-800 hover:text-slate-900 hover:dark:text-white',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div
        className={`w-full ${widthMap[maxWidth]} bg-white dark:bg-slate-900 rounded-[12px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            {icon && <div className="p-2 rounded-[8px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">{icon}</div>}
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[6px] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
