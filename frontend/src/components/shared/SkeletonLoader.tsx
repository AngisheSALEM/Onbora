"use client";

import React from 'react';

/**
 * Skeleton Box Component with subtle shimmer animation
 */
export function SkeletonBox({
  className = '',
  width,
  height,
  rounded = 'rounded-xl',
}: {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: string;
}) {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      style={style}
      className={`relative overflow-hidden bg-zinc-200 dark:bg-zinc-800/80 ${rounded} ${className} before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 dark:before:via-white/10 before:to-transparent`}
    />
  );
}

/**
 * Generic Skeleton Card
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`p-5 rounded-2xl bg-[#FFFFFF] dark:bg-[#2F2C30] border border-black/5 dark:border-white/5 space-y-3 shadow-xs ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <SkeletonBox height={16} width="40%" rounded="rounded-lg" />
        <SkeletonBox height={20} width={60} rounded="rounded-full" />
      </div>
      <SkeletonBox height={14} width="85%" rounded="rounded-md" />
      <SkeletonBox height={14} width="65%" rounded="rounded-md" />
      <div className="flex items-center gap-3 pt-2">
        <SkeletonBox height={28} width={80} rounded="rounded-full" />
        <SkeletonBox height={28} width={100} rounded="rounded-full" />
      </div>
    </div>
  );
}

/**
 * Skeleton List Loader
 */
export function SkeletonListLoader({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </div>
  );
}

/**
 * High-End Skeleton Loader for B2B News Feed
 */
export function SkeletonNewsLoader({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-5 md:p-6 rounded-3xl bg-[#FFFFFF] dark:bg-[#2F2C30] border border-black/5 dark:border-white/5 shadow-xs space-y-4"
        >
          {/* Header row: badge, source, date */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SkeletonBox height={20} width={80} rounded="rounded-full" />
              <SkeletonBox height={14} width={100} rounded="rounded-md" />
            </div>
            <SkeletonBox height={14} width={60} rounded="rounded-md" />
          </div>

          {/* Title lines */}
          <div className="space-y-2">
            <SkeletonBox height={20} width="90%" rounded="rounded-lg" />
            <SkeletonBox height={20} width="60%" rounded="rounded-lg" />
          </div>

          {/* Summary paragraph */}
          <div className="space-y-1.5">
            <SkeletonBox height={14} width="100%" rounded="rounded-md" />
            <SkeletonBox height={14} width="85%" rounded="rounded-md" />
          </div>

          {/* AI Opportunity Rationale line */}
          <div className="flex items-center gap-2 pt-1">
            <SkeletonBox height={12} width={16} rounded="rounded-full" />
            <SkeletonBox height={12} width="45%" rounded="rounded-md" />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2">
            <SkeletonBox height={28} width={110} rounded="rounded-full" />
            <SkeletonBox height={20} width={70} rounded="rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * High-End Skeleton Loader for Debrief / AI Generation
 */
export function SkeletonDebriefLoader() {
  return (
    <div className="p-6 md:p-8 rounded-3xl bg-[#FFFFFF] dark:bg-[#2F2C30] border border-black/5 dark:border-white/5 space-y-6 shadow-sm">
      <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3">
          <SkeletonBox height={24} width={24} rounded="rounded-lg" />
          <SkeletonBox height={20} width={220} rounded="rounded-lg" />
        </div>
        <SkeletonBox height={22} width={90} rounded="rounded-full" />
      </div>

      {/* Summary lines */}
      <div className="space-y-2.5">
        <SkeletonBox height={14} width="98%" rounded="rounded-md" />
        <SkeletonBox height={14} width="92%" rounded="rounded-md" />
        <SkeletonBox height={14} width="84%" rounded="rounded-md" />
      </div>

      {/* Commitments & recommendations section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="p-4 rounded-2xl bg-[#F6F5F2] dark:bg-[#3B373D] space-y-3">
          <SkeletonBox height={16} width={140} rounded="rounded-md" />
          <div className="space-y-2">
            <SkeletonBox height={12} width="90%" rounded="rounded-md" />
            <SkeletonBox height={12} width="75%" rounded="rounded-md" />
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#F6F5F2] dark:bg-[#3B373D] space-y-3">
          <SkeletonBox height={16} width={160} rounded="rounded-md" />
          <div className="space-y-2">
            <SkeletonBox height={12} width="85%" rounded="rounded-md" />
            <SkeletonBox height={12} width="80%" rounded="rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
