import React from 'react';
import { OrganizationRecord } from '../types';
import { ImpactoLogo, getImpactoLogoSVGString } from './ImpactoLogo';

interface OrganizationBrandLogoProps {
  organization?: OrganizationRecord | null;
  className?: string;
  width?: number | string;
  height?: number | string;
  variant?: 'full' | 'compact' | 'badge';
}

/**
 * Dynamic Organization Brand Logo Component
 * - If tenant is Impacto Aviation: displays official Impacto Aviation MRO logo (preserves existing certified identity)
 * - If tenant has a custom logoUrl: displays the customer's uploaded logo
 * - If tenant is any other organization: generates an elegant aviation insignia with the organization's name & initials
 */
export const OrganizationBrandLogo: React.FC<OrganizationBrandLogoProps> = ({
  organization,
  className = 'h-12 w-auto',
  width = 220,
  height = 60,
  variant = 'full',
}) => {
  const isImpacto = Boolean(
    organization && (
      organization.id === 'org_impacto_aviation' || 
      (organization.name && organization.name.toLowerCase().includes('impacto'))
    )
  );

  // 1. If Impacto Aviation, render the Impacto logo
  if (isImpacto) {
    return <ImpactoLogo className={className} width={width} height={height} />;
  }

  // 2. If organization has custom logoUrl (e.g. image uploaded or provided via URL)
  if (organization?.logoUrl) {
    return (
      <img
        src={organization.logoUrl}
        alt={organization.name || 'Logotipo da Organização'}
        className={className}
        style={{ width, height, objectFit: 'contain' }}
        referrerPolicy="no-referrer"
      />
    );
  }

  // 3. Dynamic Aeronautical Vector Insignia for New Organizations or neutral fallback
  const sigla = organization?.configuration?.identidadeVisual?.siglaAeronautica || 
                (organization?.name ? organization.name.substring(0, 3).toUpperCase() : 'SGQ');
  const primaryColor = organization?.configuration?.identidadeVisual?.corPrimaria || '#1e3a8a';
  const orgName = organization?.name || 'QualiGest SGQ';
  const legalName = organization?.legalName || 'Gestão da Qualidade Aeronáutica';

  return (
    <div 
      className={`flex items-center gap-3 select-none ${className}`}
      style={{ width: typeof width === 'number' ? `${width}px` : width }}
    >
      {/* Aviation Shield / Wings Crest */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        className="h-10 w-10 shrink-0"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`grad-${organization.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primaryColor} />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        {/* Shield background */}
        <path
          d="M 50 5 L 88 20 C 88 65, 50 92, 50 95 C 50 92, 12 65, 12 20 Z"
          fill={`url(#grad-${organization.id})`}
          stroke="#e2e8f0"
          strokeWidth="2"
        />
        {/* Stylized Aeronautical Wings */}
        <path
          d="M 22 40 L 50 50 L 78 40 L 50 58 Z"
          fill="#38bdf8"
          opacity="0.9"
        />
        <path
          d="M 28 48 L 50 56 L 72 48 L 50 63 Z"
          fill="#93c5fd"
          opacity="0.8"
        />
        {/* Acronym / Sigla */}
        <text
          x="50"
          y="35"
          fill="#ffffff"
          fontSize="16"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          textAnchor="middle"
          letterSpacing="1"
        >
          {sigla}
        </text>
      </svg>

      {/* Brand Text */}
      <div className="min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <span 
            className="text-xs sm:text-sm font-extrabold tracking-tight truncate"
            style={{ color: primaryColor }}
          >
            {orgName}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-300 shrink-0 font-mono">
            {sigla}
          </span>
        </div>
        <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
          {legalName}
        </p>
        <p className="text-[8px] text-blue-700 font-semibold uppercase tracking-wider mt-0.5">
          Alinhado a ANAC RBAC 145 & EASA Part-145
        </p>
      </div>
    </div>
  );
};

/**
 * Generates an SVG string of the organization logo for self-contained HTML/PDF export
 */
export function getOrganizationLogoSVGString(
  organization?: OrganizationRecord | null,
  width = 210,
  height = 58
): string {
  const isImpacto = Boolean(
    organization && (
      organization.id === 'org_impacto_aviation' || 
      (organization.name && organization.name.toLowerCase().includes('impacto'))
    )
  );

  if (isImpacto) {
    return getImpactoLogoSVGString(width, height);
  }

  const sigla = organization?.configuration?.identidadeVisual?.siglaAeronautica || 
                (organization?.name ? organization.name.substring(0, 3).toUpperCase() : 'SGQ');
  const primaryColor = organization?.configuration?.identidadeVisual?.corPrimaria || '#1e3a8a';
  const orgName = organization?.name || 'QualiGest SGQ';
  const legalName = organization?.legalName || 'Gestão da Qualidade Aeronáutica';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="${width}" height="${height}" style="display:block; max-width:100%; height:auto;">
      <g transform="translate(5, 5)">
        <path d="M 25 2 L 45 10 C 45 35, 25 48, 25 50 C 25 48, 5 35, 5 10 Z" fill="${primaryColor}" />
        <path d="M 10 22 L 25 28 L 40 22 L 25 32 Z" fill="#38bdf8" />
        <text x="25" y="18" fill="#ffffff" font-size="9" font-weight="bold" font-family="sans-serif" text-anchor="middle">${sigla}</text>
        <text x="55" y="20" fill="${primaryColor}" font-size="14" font-weight="bold" font-family="sans-serif">${orgName}</text>
        <text x="55" y="34" fill="#64748b" font-size="8" font-family="sans-serif">${legalName}</text>
        <text x="55" y="46" fill="#1d4ed8" font-size="7" font-weight="600" font-family="sans-serif">SGQ AERONÁUTICO • RBAC 145</text>
      </g>
    </svg>
  `;
}
