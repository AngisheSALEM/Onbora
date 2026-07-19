"use client";

import React from 'react';

interface LogoProps {
  className?: string;
  showBg?: boolean;
  size?: number;
}

export default function Logo({ className = "", showBg = true, size = 32 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {showBg ? (
        <rect width="100" height="100" rx="24" fill="#F97316" />
      ) : null}
      
      {/* Hand gesture gesture shape from on.png */}
      <path
        d="M 33 26 
           C 31 16, 33 9, 36 7 
           C 38 5, 41 7, 40 16 
           C 39 23, 37 30, 36 33 
           C 35 34, 34 34, 33 33 Z 
           
           M 43 23 
           C 41 12, 44 5, 47 3 
           C 49 1, 52 4, 50 14 
           C 49 22, 46 29, 44.5 32 
           C 44 33, 43 33, 43 32.5 Z
           
           M 53 24 
           C 51 15, 54 8, 57 6 
           C 59 4, 61 7, 59 16 
           C 57 24, 54 29, 52.5 32 
           C 52 33, 51 33, 51.5 32.5 Z
           
           M 50 35 
           C 62 35, 76 45, 76 58 
           C 76 65, 71 67, 65 67
           L 65 77 
           C 76 77, 86 73, 86 58 
           C 86 40, 68 25, 50 25 
           C 32 25, 18 39, 18 58 
           C 18 77, 32 91, 50 91 
           C 68 91, 82 78, 84 63
           L 74 63
           C 72 72, 62 81, 50 81 
           C 38 81, 28 71, 28 58 
           C 28 45, 38 35, 50 35 Z"
        fill={showBg ? "white" : "currentColor"}
      />
    </svg>
  );
}
