import React from 'react';

interface ImpactoLogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

/**
 * Official Impacto Aviation Logo Component
 * Includes:
 * - Stylized "e IMPACTO AVIATION" banner with aerodynamic swoosh
 * - Regulatory and Certification references:
 *   - COM 200607-05/ANAC
 *   - EASA.145.1003
 * - EASA APPROVED certification badge
 */
export const ImpactoLogo: React.FC<ImpactoLogoProps> = ({
  className = 'h-14 w-auto',
  width = 240,
  height = 70,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 260 76"
      width={width}
      height={height}
      className={className}
      style={{ display: 'block' }}
      aria-label="Impacto Aviation - ANAC & EASA 145 Certified"
    >
      {/* Background container if needed (transparent) */}
      <rect width="260" height="76" fill="transparent" />

      {/* TOP SECTION: LOGO & BRAND */}
      <g transform="translate(0, 0)">
        {/* Stylized 'e' with swoosh */}
        {/* Lowercase 'e' circle head */}
        <circle cx="17" cy="18" r="3.2" fill="#1b2e88" />
        
        {/* Dynamic 'e' curve & underline swoosh */}
        <path
          d="M 24 14 C 18 10, 10 13, 9 20 C 8 28, 16 31, 24 29 C 30 27.5, 34 24, 37 23 C 32 28, 20 33, 11 31 C 4 29, 2 20, 6 12 C 10 4, 21 4, 27 10 Z"
          fill="#1b2e88"
        />

        {/* Dynamic sweeping swoosh line under IMPACTO */}
        <path
          d="M 6 25 C 2 34, 16 38, 38 37 C 85 35, 140 33, 185 30 C 145 32, 90 34, 36 34 C 18 34, 8 30, 6 25 Z"
          fill="#1b2e88"
        />

        {/* IMPACTO text */}
        <text
          x="35"
          y="28"
          fill="#1b2e88"
          fontFamily="'Arial Black', 'Trebuchet MS', 'Impact', sans-serif"
          fontWeight="900"
          fontStyle="italic"
          fontSize="26.5"
          letterSpacing="-0.5px"
        >
          IMPACTO
        </text>

        {/* AVIATION text */}
        <text
          x="158"
          y="37"
          fill="#1b2e88"
          fontFamily="'Arial Black', 'Helvetica', sans-serif"
          fontWeight="900"
          fontStyle="italic"
          fontSize="10"
          letterSpacing="0.8px"
        >
          AVIATION
        </text>
      </g>

      {/* BOTTOM SECTION: CREDENTIALS & CERTIFICATIONS */}
      <g transform="translate(0, 41)">
        {/* Left column: ANAC & EASA Certifications */}
        <g transform="translate(2, 0)">
          <text
            x="0"
            y="13"
            fill="#1e327d"
            fontFamily="'Arial Black', 'Arial', sans-serif"
            fontWeight="900"
            fontSize="8.5"
            letterSpacing="-0.1px"
          >
            COM 200607-05/ANAC
          </text>
          <text
            x="36"
            y="25.5"
            fill="#1e327d"
            fontFamily="'Arial Black', 'Arial', sans-serif"
            fontWeight="900"
            fontSize="10.5"
            letterSpacing="-0.1px"
          >
            EASA.145.1003
          </text>
        </g>

        {/* Right column: EASA Approved Badge */}
        <g transform="translate(144, 1)">
          {/* Outer Badge Container */}
          <rect
            x="0"
            y="0"
            width="104"
            height="29"
            rx="2.5"
            fill="#0284c7"
            stroke="#0284c7"
            strokeWidth="0.8"
          />

          {/* Top section of badge (Darker Sky/Navy) */}
          <path
            d="M 2.5 0 L 101.5 0 C 103 0 104 1 104 2.5 L 104 20 L 0 20 L 0 2.5 C 0 1 1 0 2.5 0 Z"
            fill="#0369a1"
          />

          {/* Golden Wing/Bird Motif */}
          <path
            d="M 5 15 C 8 13, 14 10, 24 5 C 19 9, 14 12, 10 16 Z"
            fill="#fbbf24"
          />
          <path
            d="M 8 16 C 12 14, 17 11, 23 8 C 19 12, 15 14, 11 17 Z"
            fill="#38bdf8"
          />

          {/* EASA Text */}
          <text
            x="30"
            y="14"
            fill="#ffffff"
            fontFamily="'Arial Black', sans-serif"
            fontWeight="900"
            fontStyle="italic"
            fontSize="13.5"
            letterSpacing="0.5px"
          >
            EASA
          </text>

          {/* European Aviation Safety Agency subtitle */}
          <text
            x="24"
            y="18.5"
            fill="#ffffff"
            fontFamily="Arial, sans-serif"
            fontWeight="bold"
            fontSize="3.8"
            letterSpacing="-0.1px"
          >
            European Aviation Safety Agency
          </text>

          {/* Tiny flight accent top right of badge */}
          <path
            d="M 94 3 L 98 1 L 96 4 L 99 5 L 94 6 Z"
            fill="#38bdf8"
          />

          {/* APPROVED Banner (Bottom portion) */}
          <rect
            x="0"
            y="20"
            width="104"
            height="9"
            rx="0"
            fill="#0284c7"
          />
          <text
            x="52"
            y="26.8"
            fill="#ffffff"
            fontFamily="'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="6.8"
            letterSpacing="1px"
            textAnchor="middle"
          >
            APPROVED
          </text>
        </g>
      </g>
    </svg>
  );
};

/**
 * Raw SVG string representation for HTML templates, standalone print windows,
 * and high-resolution PDF canvas exports.
 */
export function getImpactoLogoSVGString(width = 240, height = 70): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 76" width="${width}" height="${height}" style="display:block; max-width:100%; height:auto;" aria-label="Impacto Aviation - ANAC & EASA 145 Certified">
    <rect width="260" height="76" fill="transparent" />
    <g transform="translate(0, 0)">
      <circle cx="17" cy="18" r="3.2" fill="#1b2e88" />
      <path d="M 24 14 C 18 10, 10 13, 9 20 C 8 28, 16 31, 24 29 C 30 27.5, 34 24, 37 23 C 32 28, 20 33, 11 31 C 4 29, 2 20, 6 12 C 10 4, 21 4, 27 10 Z" fill="#1b2e88" />
      <path d="M 6 25 C 2 34, 16 38, 38 37 C 85 35, 140 33, 185 30 C 145 32, 90 34, 36 34 C 18 34, 8 30, 6 25 Z" fill="#1b2e88" />
      <text x="35" y="28" fill="#1b2e88" font-family="'Arial Black', 'Trebuchet MS', 'Impact', sans-serif" font-weight="900" font-style="italic" font-size="26.5" letter-spacing="-0.5px">IMPACTO</text>
      <text x="158" y="37" fill="#1b2e88" font-family="'Arial Black', 'Helvetica', sans-serif" font-weight="900" font-style="italic" font-size="10" letter-spacing="0.8px">AVIATION</text>
    </g>
    <g transform="translate(0, 41)">
      <g transform="translate(2, 0)">
        <text x="0" y="13" fill="#1e327d" font-family="'Arial Black', 'Arial', sans-serif" font-weight="900" font-size="8.5" letter-spacing="-0.1px">COM 200607-05/ANAC</text>
        <text x="36" y="25.5" fill="#1e327d" font-family="'Arial Black', 'Arial', sans-serif" font-weight="900" font-size="10.5" letter-spacing="-0.1px">EASA.145.1003</text>
      </g>
      <g transform="translate(144, 1)">
        <rect x="0" y="0" width="104" height="29" rx="2.5" fill="#0284c7" stroke="#0284c7" stroke-width="0.8" />
        <path d="M 2.5 0 L 101.5 0 C 103 0 104 1 104 2.5 L 104 20 L 0 20 L 0 2.5 C 0 1 1 0 2.5 0 Z" fill="#0369a1" />
        <path d="M 5 15 C 8 13, 14 10, 24 5 C 19 9, 14 12, 10 16 Z" fill="#fbbf24" />
        <path d="M 8 16 C 12 14, 17 11, 23 8 C 19 12, 15 14, 11 17 Z" fill="#38bdf8" />
        <text x="30" y="14" fill="#ffffff" font-family="'Arial Black', sans-serif" font-weight="900" font-style="italic" font-size="13.5" letter-spacing="0.5px">EASA</text>
        <text x="24" y="18.5" fill="#ffffff" font-family="Arial, sans-serif" font-weight="bold" font-size="3.8" letter-spacing="-0.1px">European Aviation Safety Agency</text>
        <path d="M 94 3 L 98 1 L 96 4 L 99 5 L 94 6 Z" fill="#38bdf8" />
        <rect x="0" y="20" width="104" height="9" rx="0" fill="#0284c7" />
        <text x="52" y="26.8" fill="#ffffff" font-family="'Arial Black', sans-serif" font-weight="900" font-size="6.8" letter-spacing="1px" text-anchor="middle">APPROVED</text>
      </g>
    </g>
  </svg>`;
}
