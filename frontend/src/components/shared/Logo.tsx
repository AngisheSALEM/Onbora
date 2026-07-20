"use client";

import React from 'react';

interface LogoProps {
  className?: string;
  showBg?: boolean;
  size?: number;
}

export default function Logo({ className = "", showBg = true, size = 32 }: LogoProps) {
  const imgElement = (
    <img
      src="/onbora_logo.png"
      alt="Onbora Logo"
      className="object-contain"
      style={{
        width: showBg ? '80%' : '100%',
        height: showBg ? '80%' : '100%',
      }}
    />
  );

  if (showBg) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-orange-500 rounded-[24%]`}
        style={{ width: size, height: size }}
      >
        {imgElement}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {imgElement}
    </div>
  );
}
