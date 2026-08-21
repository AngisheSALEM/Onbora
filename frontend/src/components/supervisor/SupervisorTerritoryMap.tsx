"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { Icons } from '@/components/shared/Icons';

interface Plaque {
  id: number;
  code: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  is_active: boolean;
  total_enterprises?: number;
  ready_count?: number;
  assigned_salespersons_names?: string[];
}

interface Enterprise {
  id: number;
  name: string;
  sector: string;
  approximate_size: string;
  location: string;
  latitude: number;
  longitude: number;
  is_ready_for_conversion: boolean;
  conversion_score: number;
  ai_tailored_pitch?: string;
  ai_hypotheses?: string[];
  ai_key_questions?: string[];
  ai_potential_objections?: string[];
  key_needs?: string[];
  plaque?: string;
}

interface Salesperson {
  id: number;
  username: string;
  full_name: string;
  phone?: string;
  location?: string;
  is_available: boolean;
  assigned_plaques: string[];
  reports_count: number;
}

interface RecentReport {
  id: number;
  enterprise_name: string;
  salesperson_name: string;
  executive_summary: string;
  confirmed_needs: string[];
  objections_raised: string[];
  actions_todo: string[];
  ai_feedback_rating?: number;
  ai_feedback_comments?: string;
  created_at: string;
}

interface SupervisorTerritoryMapProps {
  plaques: Plaque[];
  enterprises: Enterprise[];
  salespersons: Salesperson[];
  recentReports: RecentReport[];
  onPlaqueCreated: () => void;
  onSalespersonAssigned: () => void;
}

export default function SupervisorTerritoryMap({
  plaques,
  enterprises,
  salespersons,
  recentReports,
  onPlaqueCreated,
  onSalespersonAssigned,
}: SupervisorTerritoryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // UI state
  const [selectedEnterprise, setSelectedEnterprise] = useState<Enterprise | null>(null);
  const [selectedPlaque, setSelectedPlaque] = useState<Plaque | null>(null);
  const [activeView, setActiveView] = useState<'map' | 'salespersons' | 'reports'>('map');

  // Plaque Delimitation Mode
  const [isDelimiting, setIsDelimiting] = useState(false);
  const [newPlaqueLat, setNewPlaqueLat] = useState(-4.3033);
  const [newPlaqueLng, setNewPlaqueLng] = useState(15.3084);
  const [newPlaqueRadius, setNewPlaqueRadius] = useState(5.0);
  const [newPlaqueCode, setNewPlaqueCode] = useState('');
  const [newPlaqueName, setNewPlaqueName] = useState('');
  const [newPlaqueCity, setNewPlaqueCity] = useState('Kinshasa');
  const [selectedSalespersonIds, setSelectedSalespersonIds] = useState<number[]>([]);
  const [isSubmittingPlaque, setIsSubmittingPlaque] = useState(false);
  const [plaqueSuccessMsg, setPlaqueSuccessMsg] = useState('');

  // Quick Assign Modal
  const [assigningPlaque, setAssigningPlaque] = useState<Plaque | null>(null);
  const [assigningSalespersonIds, setAssigningSalespersonIds] = useState<number[]>([]);
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  // Initialize MapLibre GL JS Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const isDarkMode = document.documentElement.classList.contains('dark');
    // MapTiler / OpenStreetMap vector style
    const mapStyle = isDarkMode
      ? 'https://api.maptiler.com/maps/streets-v2-dark/style.json?key=YOUR_MAPTILER_KEY'
      : 'https://api.maptiler.com/maps/streets-v2/style.json?key=YOUR_MAPTILER_KEY';

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://demotiles.maplibre.org/style.json', // Fallback standard OpenStreetMap tiles
      center: [15.3084, -4.3033], // Kinshasa Center
      zoom: 12.2,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    mapRef.current = map;

    // Handle map click for territory delimitation
    map.on('click', (e) => {
      if (isDelimiting) {
        setNewPlaqueLat(parseFloat(e.lngLat.lat.toFixed(5)));
        setNewPlaqueLng(parseFloat(e.lngLat.lng.toFixed(5)));
      }
    });

    return () => {
      map.remove();
    };
  }, []);

  // Update Markers on Map when enterprises or plaques change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add Enterprise markers (Green = Ready/Converted, Orange = To Prospect)
    enterprises.forEach((ent) => {
      if (!ent.latitude || !ent.longitude) return;

      const isReady = ent.is_ready_for_conversion;
      const markerColor = isReady ? '#10B981' : '#FF6600';

      const el = document.createElement('div');
      el.className = 'cursor-pointer transform hover:scale-125 transition-transform duration-150';
      el.innerHTML = `
        <div style="background-color: ${markerColor}; width: 22px; height: 22px; border-radius: 50%; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
          <div style="background-color: #FFFFFF; width: 6px; height: 6px; border-radius: 50%;"></div>
        </div>
      `;

      el.addEventListener('click', () => {
        setSelectedEnterprise(ent);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([ent.longitude, ent.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Add Plaque territorial center pins
    plaques.forEach((p) => {
      if (!p.latitude || !p.longitude) return;

      const el = document.createElement('div');
      el.className = 'cursor-pointer transform hover:scale-110 transition-transform duration-150';
      el.innerHTML = `
        <div style="background: rgba(255, 102, 0, 0.15); border: 2px dashed #FF6600; border-radius: 12px; padding: 4px 8px; backdrop-filter: blur(8px); display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 12px rgba(255,102,0,0.2);">
          <span style="font-size: 10px; font-weight: 900; color: #FF6600;">📍 ${p.code}</span>
        </div>
      `;

      el.addEventListener('click', () => {
        setSelectedPlaque(p);
        map.flyTo({ center: [p.longitude, p.latitude], zoom: 13.5 });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([p.longitude, p.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [enterprises, plaques, isDelimiting]);

  // Create & Deploy a new Plaque
  const handleCreatePlaque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaqueCode || !newPlaqueName) {
      alert("Veuillez renseigner le code et le nom de la plaque.");
      return;
    }

    setIsSubmittingPlaque(true);
    setPlaqueSuccessMsg('');

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_URL}/api/sales/plaques/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          code: newPlaqueCode.trim().toUpperCase(),
          name: newPlaqueName.trim(),
          city: newPlaqueCity.trim(),
          latitude: newPlaqueLat,
          longitude: newPlaqueLng,
          radius_km: newPlaqueRadius,
          assigned_salespersons: selectedSalespersonIds,
          is_active: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || JSON.stringify(err) || "Erreur création plaque");
      }

      setPlaqueSuccessMsg(`Plaque ${newPlaqueCode} délimitée et déployée avec succès.`);
      setIsDelimiting(false);
      setNewPlaqueCode('');
      setNewPlaqueName('');
      setSelectedSalespersonIds([]);
      onPlaqueCreated();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsSubmittingPlaque(false);
    }
  };

  // Assign Commercials to Plaque
  const handleAssignSalespersons = async () => {
    if (!assigningPlaque) return;
    setIsSubmittingAssign(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_URL}/api/sales/plaques/${assigningPlaque.id}/assign/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          salesperson_ids: assigningSalespersonIds,
        }),
      });

      if (!res.ok) throw new Error("Erreur affectation commerciaux");

      setAssigningPlaque(null);
      onSalespersonAssigned();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const flyToCity = (lng: number, lat: number, zoom = 12.8) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom });
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      {/* Sub-header Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-50/80 dark:bg-zinc-900/60 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('map')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'map'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            🗺️ Carte des Plaques & Leads
          </button>
          <button
            onClick={() => setActiveView('salespersons')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'salespersons'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            👥 Déploiement Commerciaux ({salespersons.length})
          </button>
          <button
            onClick={() => setActiveView('reports')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'reports'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            📱 Rapports Terrain Reçus ({recentReports.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDelimiting(!isDelimiting)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              isDelimiting
                ? 'bg-red-500/10 text-red-500 border-red-500/30'
                : 'bg-white dark:bg-zinc-800 text-orange-500 border-orange-500/20 shadow-sm'
            }`}
          >
            {isDelimiting ? '❌ Annuler Délimitation' : '📍 Délimiter une Nouvelle Plaque'}
          </button>
        </div>
      </div>

      {/* Main Map View */}
      {activeView === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Center Map Container */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            {/* Quick Territoire Jump Buttons */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase mr-1">Aller à :</span>
              <button
                onClick={() => flyToCity(15.3084, -4.3033)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-orange-500/10 hover:text-orange-500 transition-all cursor-pointer"
              >
                Kinshasa (Gombe)
              </button>
              <button
                onClick={() => flyToCity(15.3400, -4.3450)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-orange-500/10 hover:text-orange-500 transition-all cursor-pointer"
              >
                Kinshasa (Limete)
              </button>
              <button
                onClick={() => flyToCity(15.2832, -4.2634)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-orange-500/10 hover:text-orange-500 transition-all cursor-pointer"
              >
                Brazzaville (Plateau)
              </button>
              <button
                onClick={() => flyToCity(27.4794, -11.6608)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-orange-500/10 hover:text-orange-500 transition-all cursor-pointer"
              >
                Lubumbashi (Centre)
              </button>
            </div>

            {/* Interactive Vector Map Frame */}
            <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div ref={mapContainerRef} className="w-full h-full" />

              {/* Map Legend Overlay */}
              <div className="absolute top-3 left-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-1.5 z-10 text-[10px]">
                <span className="font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Légende Leads</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Lead Prêt / Converti</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-white" />
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Lead À Prospecter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-orange-500 font-bold">📍</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Centre de Plaque</span>
                </div>
              </div>

              {/* Interactive Delimitation Banner */}
              {isDelimiting && (
                <div className="absolute bottom-3 left-3 right-3 bg-orange-500/95 text-white backdrop-blur-md px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between z-10 animate-fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span>🎯 Mode Délimitation Actif :</span>
                    <span className="font-normal opacity-90">Cliquez sur la carte pour définir le centre de la plaque ({newPlaqueLat}, {newPlaqueLng})</span>
                  </div>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-black">Rayon : {newPlaqueRadius} km</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Side Control Panel */}
          <div className="flex flex-col gap-4">
            {/* 1. Delimitation & Creation Form */}
            {isDelimiting ? (
              <div className="glass-card rounded-2xl p-5 border border-orange-500/30 flex flex-col gap-4 shadow-sm animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-orange-500 uppercase tracking-wider">Créer & Affecter la Plaque</h3>
                  <span className="text-[9px] bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full font-bold">Superviseur</span>
                </div>

                <form onSubmit={handleCreatePlaque} className="flex flex-col gap-3 text-xs">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-zinc-600 dark:text-zinc-400">Code Plaque</label>
                    <input
                      type="text"
                      placeholder="Ex: KIN-BANDAL"
                      value={newPlaqueCode}
                      onChange={(e) => setNewPlaqueCode(e.target.value)}
                      className="px-3 py-2 rounded-xl text-xs"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-zinc-600 dark:text-zinc-400">Nom descriptif</label>
                    <input
                      type="text"
                      placeholder="Ex: Kinshasa (Bandalungwa)"
                      value={newPlaqueName}
                      onChange={(e) => setNewPlaqueName(e.target.value)}
                      className="px-3 py-2 rounded-xl text-xs"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-zinc-600 dark:text-zinc-400">Ville</label>
                      <input
                        type="text"
                        value={newPlaqueCity}
                        onChange={(e) => setNewPlaqueCity(e.target.value)}
                        className="px-3 py-2 rounded-xl text-xs"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-zinc-600 dark:text-zinc-400">Rayon (km)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="30"
                        value={newPlaqueRadius}
                        onChange={(e) => setNewPlaqueRadius(parseFloat(e.target.value) || 5.0)}
                        className="px-3 py-2 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 mt-1">
                    <label className="font-bold text-zinc-600 dark:text-zinc-400">Affecter des commerciaux immédiatement</label>
                    <div className="max-h-28 overflow-y-auto flex flex-col gap-1 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 bg-zinc-50/50 dark:bg-zinc-950/20">
                      {salespersons.length === 0 ? (
                        <span className="text-[10px] text-zinc-400">Aucun commercial trouvé</span>
                      ) : (
                        salespersons.map((s) => (
                          <label key={s.id} className="flex items-center gap-2 cursor-pointer text-[11px]">
                            <input
                              type="checkbox"
                              checked={selectedSalespersonIds.includes(s.id)}
                              onChange={() => {
                                setSelectedSalespersonIds((prev) =>
                                  prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                                );
                              }}
                              className="accent-orange-500 rounded"
                            />
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{s.full_name}</span>
                            <span className="text-[9px] text-zinc-400">({s.location || 'Terrain'})</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingPlaque}
                    className="w-full py-2.5 orange-gradient-bg hover:opacity-90 active:scale-98 text-white rounded-xl font-bold text-xs transition-all cursor-pointer disabled:opacity-50 mt-2 shadow-md shadow-orange-500/10"
                  >
                    {isSubmittingPlaque ? 'Déploiement en cours...' : '🚀 Créer & Déployer sur le Terrain'}
                  </button>
                </form>
              </div>
            ) : selectedEnterprise ? (
              /* 2. Selected Enterprise Dossier */
              <div className="glass-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-4 shadow-sm animate-fade-in">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-black uppercase text-orange-500 tracking-wider">Fiche Prospect</span>
                    <h3 className="text-base font-black text-zinc-900 dark:text-zinc-50">{selectedEnterprise.name}</h3>
                    <p className="text-xs text-zinc-500">{selectedEnterprise.sector} • {selectedEnterprise.location}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                    selectedEnterprise.is_ready_for_conversion
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
                  }`}>
                    {selectedEnterprise.is_ready_for_conversion ? 'Converti' : 'À Prospecter'}
                  </span>
                </div>

                {selectedEnterprise.ai_tailored_pitch && (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs flex flex-col gap-1">
                    <span className="font-black text-orange-500 text-[10px] uppercase">Pitch IA Sur-Mesure</span>
                    <p className="text-zinc-700 dark:text-zinc-300 italic text-[11px] leading-relaxed">{selectedEnterprise.ai_tailored_pitch}</p>
                  </div>
                )}

                {selectedEnterprise.key_needs && selectedEnterprise.key_needs.length > 0 && (
                  <div className="flex flex-col gap-1.5 text-xs">
                    <span className="font-bold text-zinc-600 dark:text-zinc-400 text-[10px] uppercase">Besoins prioritaires :</span>
                    <ul className="list-disc pl-4 text-zinc-700 dark:text-zinc-300 text-[11px] space-y-0.5">
                      {selectedEnterprise.key_needs.map((need, idx) => (
                        <li key={idx}>{need}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  onClick={() => setSelectedEnterprise(null)}
                  className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  Fermer la fiche
                </button>
              </div>
            ) : (
              /* 3. Plaques Overview List */
              <div className="glass-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Plaques Actives ({plaques.length})</h3>
                  <span className="text-[10px] text-zinc-400 font-bold">{enterprises.length} Leads</span>
                </div>

                <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
                  {plaques.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20 hover:border-orange-500/40 transition-all flex flex-col gap-2 cursor-pointer"
                      onClick={() => {
                        setSelectedPlaque(p);
                        flyToCity(p.longitude, p.latitude, 13.5);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-black text-xs text-zinc-900 dark:text-zinc-100">{p.name}</span>
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 text-[8px] font-black uppercase">{p.code}</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-semibold">{p.city}</span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-zinc-500">
                        <span>Leads : <strong>{p.total_enterprises || 0}</strong></span>
                        <span>Commerciaux : <strong>{p.assigned_salespersons_names?.length || 0}</strong></span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssigningPlaque(p);
                        }}
                        className="w-full py-1 rounded-lg bg-zinc-200/60 dark:bg-zinc-800/60 hover:bg-orange-500 hover:text-white text-[10px] font-bold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer"
                      >
                        👥 Réaffecter Commerciaux
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Salespersons Deployment Table */}
      {activeView === 'salespersons' && (
        <div className="glass-card rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Effectif Commercial & Affectations</h3>
              <p className="text-xs text-zinc-500">Suivi des forces de vente déployées sur les plaques territoriales.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold">
                  <th className="py-3 px-3">Commercial</th>
                  <th className="py-3 px-3">Téléphone</th>
                  <th className="py-3 px-3">Zone de base</th>
                  <th className="py-3 px-3">Plaques Affectées</th>
                  <th className="py-3 px-3">Rapports Envoyés</th>
                  <th className="py-3 px-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {salespersons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-400">Aucun commercial trouvé.</td>
                  </tr>
                ) : (
                  salespersons.map((s) => (
                    <tr key={s.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20">
                      <td className="py-3 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                        {s.full_name}
                        <span className="block text-[10px] text-zinc-400 font-normal">@{s.username}</span>
                      </td>
                      <td className="py-3 px-3 text-zinc-500">{s.phone || 'Non renseigné'}</td>
                      <td className="py-3 px-3 text-zinc-700 dark:text-zinc-300 font-medium">{s.location || 'Kinshasa'}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {s.assigned_plaques.length === 0 ? (
                            <span className="text-[10px] text-zinc-400 italic">Aucune plaque</span>
                          ) : (
                            s.assigned_plaques.map((code, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-500 text-[9px] font-black">
                                {code}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-zinc-900 dark:text-zinc-100">{s.reports_count} visites</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          s.is_available ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-500'
                        }`}>
                          {s.is_available ? 'Disponible' : 'En Mission'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports Received Feed */}
      {activeView === 'reports' && (
        <div className="glass-card rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-4 animate-fade-in">
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Rapports Mobile Reçus en Temps Réel</h3>
            <p className="text-xs text-zinc-500">Comptes-rendus générés par les commerciaux depuis l'application Onbora Mobile.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentReports.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-zinc-400 text-xs">
                Aucun rapport de visite reçu pour le moment.
              </div>
            ) : (
              recentReports.map((rep) => (
                <div key={rep.id} className="p-4 rounded-xl border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/30 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-sm text-zinc-900 dark:text-zinc-100">{rep.enterprise_name}</h4>
                      <p className="text-[10px] text-zinc-500 font-medium">Par {rep.salesperson_name} • {new Date(rep.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    {rep.ai_feedback_rating && (
                      <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-500 text-[10px] font-black">
                        ⭐ {rep.ai_feedback_rating}/5 IA
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-white/40 dark:bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    {rep.executive_summary}
                  </p>

                  {rep.confirmed_needs && rep.confirmed_needs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {rep.confirmed_needs.map((n, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-[9px] font-bold">
                          ✓ {n}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assigningPlaque && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col gap-4 animate-fade-in shadow-2xl">
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase">Affecter les commerciaux</h3>
              <p className="text-xs text-zinc-500">Plaque : <strong>{assigningPlaque.name} ({assigningPlaque.code})</strong></p>
            </div>

            <div className="max-h-56 overflow-y-auto flex flex-col gap-1.5 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-950/20">
              {salespersons.map((s) => (
                <label key={s.id} className="flex items-center gap-2.5 cursor-pointer text-xs p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg">
                  <input
                    type="checkbox"
                    checked={assigningSalespersonIds.includes(s.id)}
                    onChange={() => {
                      setAssigningSalespersonIds((prev) =>
                        prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                      );
                    }}
                    className="accent-orange-500 rounded"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{s.full_name}</span>
                    <span className="text-[10px] text-zinc-400">Plaques actuelles : {s.assigned_plaques.join(', ') || 'Aucune'}</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setAssigningPlaque(null)}
                className="flex-1 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleAssignSalespersons}
                disabled={isSubmittingAssign}
                className="flex-1 py-2 rounded-xl orange-gradient-bg text-white text-xs font-bold hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingAssign ? 'Affectation...' : 'Confirmer Affectation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
