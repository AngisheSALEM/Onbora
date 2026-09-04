"use client";

import React, { useState } from 'react';
import { StrategicVisit } from './kamTypes';
import { Icons } from '@/components/shared/Icons';

interface KamAgendaTimelineProps {
  visits: StrategicVisit[];
  selectedVisitId: string;
  onSelectVisit: (visit: StrategicVisit) => void;
  onOpenBriefing: (visit: StrategicVisit) => void;
  onOpenMeetingMode: (visit: StrategicVisit) => void;
  onOpenOrgChart: (visit: StrategicVisit) => void;
  onNewVisit: () => void;
}

export default function KamAgendaTimeline({
  visits,
  selectedVisitId,
  onSelectVisit,
  onOpenBriefing,
  onOpenMeetingMode,
  onOpenOrgChart,
  onNewVisit
}: KamAgendaTimelineProps) {
  const [selectedDay, setSelectedDay] = useState<number>(2); // Wednesday (2 Sept)

  const days = [
    { dayNumber: 31, dayName: 'Lun', hasEvent: true, dotColor: 'bg-blue-400' },
    { dayNumber: 1, dayName: 'Mar', hasEvent: true, dotColor: 'bg-green-400' },
    { dayNumber: 2, dayName: 'Mer', hasEvent: true, isToday: true, dotColor: 'bg-blue-500' },
    { dayNumber: 3, dayName: 'Jeu', hasEvent: true, dotColor: 'bg-amber-400' },
    { dayNumber: 4, dayName: 'Ven', hasEvent: true, dotColor: 'bg-purple-400' },
    { dayNumber: 5, dayName: 'Sam', hasEvent: false },
    { dayNumber: 6, dayName: 'Dim', hasEvent: false },
  ];

  return (
    <div className="flex flex-col h-full w-full select-none">
      
      {/* 1. Horizontal Days Strip (Sleek Contrast without 1px borders) */}
      <div className="grid grid-cols-7 gap-2 mb-5">
        {days.map((d, idx) => {
          const isSelected = selectedDay === idx;
          return (
            <button
              key={`${d.dayName}-${d.dayNumber}`}
              onClick={() => setSelectedDay(idx)}
              className={`flex flex-col items-center justify-center py-3.5 px-2 rounded-2xl transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-white text-black shadow-xl font-bold scale-[1.02]'
                  : 'bg-[#0B0B0F] text-zinc-400 hover:bg-[#141419]'
              }`}
            >
              <div className="h-1.5 flex items-center justify-center mb-1">
                {d.hasEvent && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-blue-600' : d.dotColor || 'bg-blue-400'
                    }`}
                  />
                )}
              </div>

              <span className={`text-base md:text-xl font-black font-sans tracking-tight ${isSelected ? 'text-black' : 'text-white'}`}>
                {d.dayNumber}
              </span>
              <span className={`text-[10px] md:text-xs uppercase font-bold mt-0.5 ${isSelected ? 'text-zinc-700' : 'text-zinc-500'}`}>
                {d.dayName}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Agenda Feed : Hero Focus Card + Upcoming Secondary Feed */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
        {visits.map((visit) => {
          const isSelected = visit.id === selectedVisitId;

          const dotClasses = {
            blue: 'bg-blue-500',
            green: 'bg-emerald-500',
            orange: 'bg-amber-500',
            red: 'bg-rose-500'
          }[visit.dot_color];

          if (isSelected) {
            // HERO SPOTLIGHT CARD : Pure White High Contrast (Matching Screenshot Focus Card)
            return (
              <div
                key={visit.id}
                onClick={() => onSelectVisit(visit)}
                className="bg-white text-[#09090B] rounded-[28px] p-6 md:p-8 shadow-2xl transition-all duration-300 transform scale-[1.01]"
              >
                {/* Top Row : Time badge + Status */}
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${dotClasses} animate-pulse`} />
                    <span className="text-xs uppercase font-black tracking-wider text-zinc-600">
                      Rendez-vous Prioritaire du Jour
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-mono font-black text-black bg-zinc-100 px-3 py-1.5 rounded-full">
                    <Icons.Clock size={14} />
                    <span>{visit.meeting_time} ({visit.duration_minutes} min)</span>
                  </div>
                </div>

                {/* Company Name & Meeting Title */}
                <h2 className="text-xl md:text-2xl font-black text-black tracking-tight leading-tight mt-1">
                  {visit.account_name}
                </h2>
                <p className="text-xs md:text-sm font-semibold text-zinc-600 mt-1">
                  {visit.meeting_title}
                </p>

                {/* Golden Rule Highlight Box */}
                <div className="mt-4 p-4 bg-amber-500/10 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
                  <Icons.Shield size={18} className="text-amber-700 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="font-bold text-amber-900">Règle d&apos;Or Avant d&apos;Entrer : </strong>
                    <span>{visit.golden_rule}</span>
                  </div>
                </div>

                {/* KPI Metrics Strip */}
                <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                  <div className="p-3 bg-zinc-100 rounded-2xl">
                    <span className="block text-[10px] font-bold text-zinc-500 uppercase">MRR Actuel Orange</span>
                    <span className="text-sm md:text-base font-mono font-black text-zinc-900">
                      {visit.briefing.orange_relationship.mrr_current.toLocaleString()} €
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-100 rounded-2xl">
                    <span className="block text-[10px] font-bold text-zinc-500 uppercase">Part Portefeuille</span>
                    <span className="text-sm md:text-base font-mono font-black text-blue-600">
                      {visit.briefing.orange_relationship.wallet_share_percentage}%
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-100 rounded-2xl">
                    <span className="block text-[10px] font-bold text-zinc-500 uppercase">Agences Connectées</span>
                    <span className="text-sm md:text-base font-mono font-black text-zinc-900">
                      {visit.briefing.firmographics.locations_count} sites
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-zinc-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenBriefing(visit);
                    }}
                    className="flex-1 min-w-[160px] flex items-center justify-center gap-2 py-3 px-4 bg-black hover:bg-zinc-800 text-white rounded-2xl text-xs font-black transition-all active:scale-95 shadow-md cursor-pointer"
                  >
                    <Icons.FileText size={15} />
                    <span>Fiche Briefing 360° (5 min)</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenOrgChart(visit);
                    }}
                    className="flex items-center justify-center gap-1.5 py-3 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-2xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    <Icons.Users size={15} />
                    <span>MEDDIC</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenMeetingMode(visit);
                    }}
                    className="flex items-center justify-center gap-1.5 py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black transition-all active:scale-95 shadow-md cursor-pointer"
                  >
                    <Icons.Mic size={15} />
                    <span>Lancer Réunion</span>
                  </button>
                </div>
              </div>
            );
          }

          // SECONDARY UPCOMING VISITS (Sleek Dark Container with Whitespace)
          return (
            <div
              key={visit.id}
              onClick={() => onSelectVisit(visit)}
              className="group cursor-pointer bg-[#0B0B0F] hover:bg-[#121217] rounded-3xl p-5 transition-all duration-200 shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${dotClasses} shrink-0`} />
                  <div>
                    <h3 className="text-sm md:text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                      {visit.account_name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                      {visit.meeting_title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-400 bg-[#16161D] px-2.5 py-1 rounded-full shrink-0">
                  <Icons.Clock size={12} />
                  <span>{visit.meeting_time}</span>
                </div>
              </div>

              {/* Subtext preview */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#16161D] text-[11px] text-zinc-500">
                <span className="truncate max-w-[320px]">
                  {visit.golden_rule}
                </span>
                <span className="font-bold text-zinc-400 shrink-0 ml-2">
                  {visit.status_label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
