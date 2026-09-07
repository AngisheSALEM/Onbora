"use client";

import React, { useState } from 'react';
import { Icons } from '@/components/shared/Icons';

interface PulseTick {
  timeLabel: string;
  isNow?: boolean;
  status: 'HEALTHY' | 'WARNING' | 'BREACHED';
  metric: string;
  summary: string;
  account: string;
}

export default function KamPulseRadar() {
  const [selectedTick, setSelectedTick] = useState<number>(3); // Default to NOW

  const ticks: PulseTick[] = [
    { timeLabel: '9h', status: 'HEALTHY', metric: '99.9%', summary: 'Supervision Réseau Fibre OK (54 agences raccordées)', account: 'SGB' },
    { timeLabel: '11h', status: 'HEALTHY', metric: '10G', summary: 'Débit IP Transit Datacenter stable à 9.8 Gbps', account: 'Ecobank' },
    { timeLabel: '13h', status: 'WARNING', metric: 'SLA 98%', summary: 'Légère latence sur liaison satellite nord', account: 'SITARAIL' },
    { timeLabel: 'NOW', isNow: true, status: 'HEALTHY', metric: '100%', summary: 'Liens stratégiques nominaux. Aucune alerte P1 en cours.', account: 'Portefeuille' },
    { timeLabel: '16h', status: 'WARNING', metric: 'REX', summary: 'Remise du rapport d\'incident génie civil Marcory', account: 'SGB' },
    { timeLabel: '18h', status: 'HEALTHY', metric: 'SOC 24/7', summary: 'Orange Cyberdefense : 0 incident critique', account: 'Ministère TN' },
  ];

  return (
    <div className="w-full bg-[#0B0B0F] rounded-3xl p-5 text-white shadow-xl">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Supervision Réseau & SLA Live
          </span>
        </div>
        <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
          Disponibilité: 99.88%
        </span>
      </div>

      {/* Timeline Horizontal Capsule (Contrast-based without 1px borders) */}
      <div className="grid grid-cols-6 gap-2 bg-[#050508] p-2 rounded-2xl">
        {ticks.map((tick, idx) => {
          const isSelected = selectedTick === idx;
          return (
            <button
              key={tick.timeLabel}
              onClick={() => setSelectedTick(idx)}
              className={`flex flex-col items-center justify-between py-3 px-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-[#22222C] text-white shadow-md'
                  : 'hover:bg-[#121217] text-zinc-400'
              }`}
            >
              <div className="mb-2">
                {tick.status === 'HEALTHY' && (
                  <Icons.CloudSun size={18} className="text-blue-400" />
                )}
                {tick.status === 'WARNING' && (
                  <Icons.CloudRain size={18} className="text-amber-400" />
                )}
                {tick.status === 'BREACHED' && (
                  <Icons.Wind size={18} className="text-red-400" />
                )}
              </div>

              <span className="text-xs font-mono font-semibold text-white tracking-tight">
                {tick.metric}
              </span>

              <span
                className={`text-[10px] font-semibold mt-1.5 uppercase ${
                  tick.isNow
                    ? 'bg-white text-black px-1.5 py-0.2 rounded font-extrabold'
                    : 'text-zinc-500'
                }`}
              >
                {tick.timeLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Tick Insight Summary Banner */}
      <div className="mt-3.5 px-3.5 py-2.5 bg-[#121218] rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5 truncate">
          <Icons.Activity size={14} className="text-blue-400 shrink-0" />
          <span className="text-zinc-300 truncate">
            <strong className="text-white font-semibold">[{ticks[selectedTick].account}]</strong> {ticks[selectedTick].summary}
          </span>
        </div>
        <Icons.ChevronRight size={14} className="text-zinc-500 shrink-0 ml-2" />
      </div>
    </div>
  );
}
