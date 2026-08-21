"use client";

import React from 'react';

interface LogoProps {
  className?: string;
  showBg?: boolean;
  size?: number;
}

export default function Logo({ className = "", showBg = true, size = 36 }: LogoProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-[22%] shadow-sm ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/icone_onbora.jpeg"
        alt="Onbora"
        className="w-full h-full object-cover"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
