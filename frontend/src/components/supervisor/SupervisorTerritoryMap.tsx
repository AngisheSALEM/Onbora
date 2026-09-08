"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import { Icons } from '@/components/shared/Icons';
import { fetchAPI } from '@/lib/api';

export interface Plaque {
  id: number;
  code: string;
  name: string;
  city: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  is_active: boolean;
  total_enterprises?: number;
  enterprises_count?: number;
  ready_count?: number;
  assigned_salespersons?: number[];
  assigned_salespersons_names?: string[];
  boundary_geojson?: any;
}

export interface Salesperson {
  id: number;
  username: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  is_available?: boolean;
}

interface SupervisorTerritoryMapProps {
  plaques: Plaque[];
  enterprises?: any[];
  salespersons: Salesperson[];
  recentReports?: any[];
  onPlaqueCreated?: () => void;
  onSalespersonAssigned?: () => void;
  onSalespersonChanged?: () => void;
  onOpenPlaqueDetail?: (plaque: Plaque) => void;
}

export default function SupervisorTerritoryMap({
  plaques,
  salespersons,
  onPlaqueCreated,
  onSalespersonAssigned,
  onOpenPlaqueDetail,
}: SupervisorTerritoryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Selected Plaque for direct assignment popover
  const [selectedPlaque, setSelectedPlaque] = useState<Plaque | null>(null);
  const [assigningSalespersonIds, setAssigningSalespersonIds] = useState<number[]>([]);
  const [isSavingAssign, setIsSavingAssign] = useState(false);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState('');

  // Drawing Mode (Crayon)
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newPlaqueCode, setNewPlaqueCode] = useState('');
  const [newPlaqueName, setNewPlaqueName] = useState('');
  const [newPlaqueCity, setNewPlaqueCity] = useState('Kinshasa');
  const [newPlaqueSalespersonIds, setNewPlaqueSalespersonIds] = useState<number[]>([]);
  const [isSavingPlaque, setIsSavingPlaque] = useState(false);
  const [savePlaqueError, setSavePlaqueError] = useState('');
  const [webglError, setWebglError] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  // 1. Initialize MapLibre with WebGL2 safety check
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    // Verify WebGL2 support before MapLibre instantiates to prevent uncaught GPUInitializationError
    const checkWebGL2 = (): boolean => {
      if (typeof window === 'undefined') return false;
      try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGL2RenderingContext && (canvas.getContext('webgl2') || canvas.getContext('experimental-webgl2')));
      } catch {
        return false;
      }
    };

    if (!checkWebGL2()) {
      setWebglError("Accélération graphique WebGL2 indisponible dans ce navigateur.");
      return;
    }

    const isDark = document.documentElement.classList.contains('dark');
    const tileUrl = isDark
      ? 'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png'
      : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            'base-tiles': {
              type: 'raster',
              tiles: [tileUrl],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap &copy; CARTO',
            },
          },
          layers: [
            {
              id: 'base-layer',
              type: 'raster',
              source: 'base-tiles',
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        },
        center: [15.3136, -4.3276], // Kinshasa
        zoom: 12,
      });
    } catch (err: any) {
      console.warn("MapLibre WebGL2 initialization failed:", err);
      setWebglError(err?.message || "Erreur d'initialisation de la carte WebGL2.");
      return;
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      // GeoJSON source for drawing live line / polygon
      map.addSource('draw-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Drawing line layer
      map.addLayer({
        id: 'draw-line',
        type: 'line',
        source: 'draw-source',
        paint: {
          'line-color': '#4F6CE8',
          'line-width': 3,
          'line-dasharray': [2, 2],
        },
      });

      // Drawing fill layer
      map.addLayer({
        id: 'draw-fill',
        type: 'fill',
        source: 'draw-source',
        paint: {
          'fill-color': '#4F6CE8',
          'fill-opacity': 0.2,
        },
      });

      // Plaques polygons source
      map.addSource('plaques-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Plaques fill layer
      map.addLayer({
        id: 'plaques-fill',
        type: 'fill',
        source: 'plaques-source',
        paint: {
          'fill-color': '#4F6CE8',
          'fill-opacity': 0.15,
        },
      });

      // Plaques border layer
      map.addLayer({
        id: 'plaques-border',
        type: 'line',
        source: 'plaques-source',
        paint: {
          'line-color': '#4F6CE8',
          'line-width': 2,
        },
      });
    });

    mapRef.current = map;

    return () => {
      try {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch (err) {
        console.warn("Error cleaning up map:", err);
      }
    };
  }, []);

  // 2. Handle map clicks for drawing
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      if (!isDrawingMode) return;
      const newPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setDrawnPoints((prev) => [...prev, newPoint]);
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isDrawingMode]);

  // 3. Update live drawing layer when points change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource('draw-source')) return;

    const source = map.getSource('draw-source') as maplibregl.GeoJSONSource;

    if (drawnPoints.length === 0) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    if (drawnPoints.length >= 3) {
      // Closed polygon
      const closed = [...drawnPoints, drawnPoints[0]];
      source.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [closed],
            },
          },
        ],
      });
    } else {
      // LineString
      source.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: drawnPoints,
            },
          },
        ],
      });
    }
  }, [drawnPoints]);

  // 4. Update plaques markers and polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Render markers on plaques center
    plaques.forEach((p) => {
      const lat = p.latitude ?? -4.3276;
      const lng = p.longitude ?? 15.3136;

      const el = document.createElement('div');
      el.className = 'cursor-pointer group flex flex-col items-center';
      el.innerHTML = `
        <div class="px-2.5 py-1 rounded-xl bg-[#4F6CE8] text-white font-medium text-[11px] shadow-sm flex items-center gap-1 border border-white/30 transition-transform group-hover:scale-110">
          <span>${p.code}</span>
        </div>
        <div class="w-1.5 h-1.5 bg-[#4F6CE8] rounded-full mt-0.5"></div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedPlaque(p);
        setAssigningSalespersonIds(p.assigned_salespersons || []);
        setAssignSuccessMsg('');
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Render polygons GeoJSON if available
    if (map.getSource('plaques-source')) {
      const features: any[] = [];
      plaques.forEach((p) => {
        if (p.boundary_geojson) {
          features.push({
            type: 'Feature',
            properties: { id: p.id, code: p.code, name: p.name },
            geometry: p.boundary_geojson.geometry || p.boundary_geojson,
          });
        }
      });

      const source = map.getSource('plaques-source') as maplibregl.GeoJSONSource;
      source.setData({ type: 'FeatureCollection', features });
    }
  }, [plaques]);

  // Save Drawn Plaque
  const handleSaveDrawnPlaque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (drawnPoints.length < 3) return;

    setIsSavingPlaque(true);
    setSavePlaqueError('');

    // Compute center
    const avgLng = drawnPoints.reduce((sum, p) => sum + p[0], 0) / drawnPoints.length;
    const avgLat = drawnPoints.reduce((sum, p) => sum + p[1], 0) / drawnPoints.length;

    const closedPolygon = [...drawnPoints, drawnPoints[0]];
    const boundaryGeoJson = {
      type: 'Polygon',
      coordinates: [closedPolygon],
    };

    try {
      await fetchAPI('/api/sales/plaques/draw-zone/', {
        method: 'POST',
        body: JSON.stringify({
          code: newPlaqueCode,
          name: newPlaqueName,
          city: newPlaqueCity,
          center_lat: avgLat,
          center_lng: avgLng,
          radius_km: 1.5,
          boundary_geojson: boundaryGeoJson,
          salesperson_ids: newPlaqueSalespersonIds,
        }),
      });

      // Reset drawing
      setIsDrawingMode(false);
      setDrawnPoints([]);
      setIsSaveModalOpen(false);
      setNewPlaqueCode('');
      setNewPlaqueName('');
      setNewPlaqueSalespersonIds([]);

      if (onPlaqueCreated) onPlaqueCreated();
    } catch (err: any) {
      setSavePlaqueError(err.message || "Erreur lors de l'enregistrement de la plaque.");
    } finally {
      setIsSavingPlaque(false);
    }
  };

  // Save Direct Salesperson Assignment from Map
  const handleSaveDirectAssignment = async () => {
    if (!selectedPlaque) return;
    setIsSavingAssign(true);
    setAssignSuccessMsg('');

    try {
      await fetchAPI(`/api/sales/plaques/${selectedPlaque.id}/assign/`, {
        method: 'POST',
        body: JSON.stringify({ salesperson_ids: assigningSalespersonIds }),
      });

      setAssignSuccessMsg("Affectation sauvegardée avec succès.");
      if (onSalespersonAssigned) onSalespersonAssigned();
    } catch (err: any) {
      console.error("Erreur direct assign:", err);
    } finally {
      setIsSavingAssign(false);
    }
  };

  // Fallback view when WebGL2 is not available in user's browser/environment
  if (webglError) {
    const filteredPlaques = plaques.filter((p) => {
      const q = filterQuery.toLowerCase();
      return (
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q)
      );
    });

    return (
      <div className="flex flex-col gap-4 p-5 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5">
        {/* Banner Alert WebGL2 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#4F6CE8]/10 border border-[#4F6CE8]/20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#4F6CE8]/20 text-[#4F6CE8] flex items-center justify-center shrink-0 mt-0.5">
              <Icons.AlertTriangle size={18} />
            </div>
            <div className="flex flex-col">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                Affichage cartographique vectoriel désactivé (WebGL2 requis)
              </h4>
              <p className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
                Votre navigateur n'a pas accès à l'accélération graphique WebGL2. Vous pouvez continuer à gérer et affecter vos plaques ci-dessous.
              </p>
              <p className="text-[10px] text-[#4F6CE8] font-medium mt-1">
                Pour réactiver la carte : accédez à chrome://settings/system (ou edge://settings/system) et activez « Utiliser l'accélération matérielle ».
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Icons.Search size={14} className="absolute left-3 top-2.5 text-[#6E6C67] dark:text-[#A1A1AA]" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filtrer une plaque..."
                className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-[#242124] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white outline-none w-44"
              />
            </div>
          </div>
        </div>

        {/* Plaques List Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto pr-1">
          {filteredPlaques.map((plaque) => {
            const isSelected = selectedPlaque?.id === plaque.id;
            return (
              <div
                key={plaque.id}
                onClick={() => {
                  setSelectedPlaque(plaque);
                  setAssigningSalespersonIds(plaque.assigned_salespersons || []);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#4F6CE8]/5 border-[#4F6CE8] ring-1 ring-[#4F6CE8]'
                    : 'bg-white dark:bg-[#242124] border-black/5 dark:border-white/5 hover:border-[#4F6CE8]/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-bold text-[#4F6CE8]">
                      {plaque.code}
                    </span>
                    <h5 className="text-xs font-bold text-zinc-900 dark:text-white mt-0.5">
                      {plaque.name}
                    </h5>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                      {plaque.city}
                    </span>
                  </div>

                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-zinc-700 dark:text-zinc-300">
                    {plaque.enterprises_count} entreprises
                  </span>
                </div>

                <div className="flex flex-col gap-1 pt-2 border-t border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
                    Commerciaux affectés :
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {plaque.assigned_salespersons_names && plaque.assigned_salespersons_names.length > 0 ? (
                      plaque.assigned_salespersons_names.map((name, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#4F6CE8]/10 text-[#4F6CE8]"
                        >
                          {name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] italic text-zinc-400">
                        Aucun commercial affecté
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlaque(plaque);
                      setAssigningSalespersonIds(plaque.assigned_salespersons || []);
                    }}
                    className="flex-1 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-[#4F6CE8] hover:text-white text-zinc-700 dark:text-zinc-200 text-[11px] font-semibold transition-colors text-center"
                  >
                    Affecter commerciaux
                  </button>
                  {onOpenPlaqueDetail && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPlaqueDetail(plaque);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-200 text-[11px] font-medium transition-colors"
                      title="Ouvrir le détail complet"
                    >
                      <Icons.ExternalLink size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Popover / Panel d'affectation pour la plaque sélectionnée */}
        {selectedPlaque && (
          <div className="p-4 rounded-2xl bg-white dark:bg-[#242124] border border-[#4F6CE8]/30 flex flex-col gap-3 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#4F6CE8]">{selectedPlaque.code}</span>
                <span className="text-xs font-bold text-zinc-900 dark:text-white">— Affectation des commerciaux</span>
              </div>
              <button
                onClick={() => setSelectedPlaque(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                <Icons.X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {salespersons.map((sp) => {
                const isAssigned = assigningSalespersonIds.includes(sp.id);
                return (
                  <label
                    key={sp.id}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs cursor-pointer border transition-colors ${
                      isAssigned
                        ? 'bg-[#4F6CE8]/10 border-[#4F6CE8] text-[#4F6CE8] font-bold'
                        : 'bg-black/2 dark:bg-white/2 border-black/5 dark:border-white/5 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAssigningSalespersonIds((prev) => [...prev, sp.id]);
                        } else {
                          setAssigningSalespersonIds((prev) => prev.filter((id) => id !== sp.id));
                        }
                      }}
                      className="accent-[#4F6CE8]"
                    />
                    <span className="truncate">{sp.full_name}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/5">
              {assignSuccessMsg && (
                <span className="text-xs font-semibold text-[#10B981] mr-auto">
                  {assignSuccessMsg}
                </span>
              )}
              <button
                onClick={() => setSelectedPlaque(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5"
              >
                Fermer
              </button>
              <button
                onClick={handleSaveDirectAssignment}
                disabled={isSavingAssign}
                className="px-4 py-1.5 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                {isSavingAssign ? 'Sauvegarde...' : 'Enregistrer les affectations'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-[650px] rounded-3xl overflow-hidden border border-black/5 dark:border-white/5 bg-[#F6F5F2] dark:bg-[#242124]">
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full ${isDrawingMode ? 'cursor-crosshair' : ''}`}
      />

      {/* Floating Toolbar: Crayon (Dessiner Plaque) & Tool Info */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-[#F6F5F2]/90 dark:bg-[#2D2A2D]/90 backdrop-blur-xl p-1.5 rounded-2xl border border-black/5 dark:border-white/5 shadow-md flex items-center gap-2">
          <button
            onClick={() => {
              setIsDrawingMode(!isDrawingMode);
              if (isDrawingMode) {
                setDrawnPoints([]);
              }
            }}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${
              isDrawingMode
                ? 'bg-[#4F6CE8] text-white shadow-xs'
                : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#242124] dark:text-white'
            }`}
          >
            <Icons.Edit3 size={15} />
            <span>{isDrawingMode ? "Mode Crayon Actif" : "Dessiner une Plaque (Crayon)"}</span>
          </button>

          {isDrawingMode && (
            <span className="text-[11px] font-semibold text-[#4F6CE8] px-2">
              {drawnPoints.length} point{drawnPoints.length > 1 ? 's' : ''} posé{drawnPoints.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Live Drawing Controls */}
        {isDrawingMode && (
          <div className="bg-[#F6F5F2]/95 dark:bg-[#2D2A2D]/95 backdrop-blur-xl p-2 rounded-2xl border border-black/5 dark:border-white/5 shadow-lg flex items-center gap-2">
            <button
              onClick={() => {
                if (drawnPoints.length >= 3) {
                  setIsSaveModalOpen(true);
                }
              }}
              disabled={drawnPoints.length < 3}
              className="px-3 py-1.5 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-xs"
            >
              <Icons.Check size={13} />
              <span>Valider la Plaque ({drawnPoints.length} sommets)</span>
            </button>

            {drawnPoints.length > 0 && (
              <button
                onClick={() => setDrawnPoints((prev) => prev.slice(0, -1))}
                className="p-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                title="Annuler le dernier sommet"
              >
                <Icons.RotateCcw size={14} />
              </button>
            )}

            <button
              onClick={() => {
                setIsDrawingMode(false);
                setDrawnPoints([]);
              }}
              className="p-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-red-500/15 text-zinc-500 hover:text-red-500 transition-colors cursor-pointer"
              title="Quitter le mode tracé"
            >
              <Icons.X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Floating Plaque Info & Direct Assignment Panel (when a plaque is clicked) */}
      {selectedPlaque && (
        <div className="absolute top-4 right-4 z-20 w-80 max-h-[calc(100%-2rem)] bg-[#F6F5F2]/95 dark:bg-[#2D2A2D]/95 backdrop-blur-2xl rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-2xl flex flex-col gap-4 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-[#4F6CE8] uppercase">Plaque Sélectionnée</span>
              <h3 className="text-base font-semibold text-[#242124] dark:text-white">{selectedPlaque.code}</h3>
              <span className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">{selectedPlaque.name} • {selectedPlaque.city}</span>
            </div>
            <button
              onClick={() => setSelectedPlaque(null)}
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Icons.X size={16} />
            </button>
          </div>

          {/* Success message */}
          {assignSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-1.5">
              <Icons.CheckCircle size={14} />
              <span>{assignSuccessMsg}</span>
            </div>
          )}

          {/* Assigned Salespersons Overview (as requested: only show assigned commercials and dedicated detail button) */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#242124] dark:text-white">Commerciaux Déployés</span>
              <span className="text-[10px] text-[#4F6CE8] font-semibold">
                {salespersons.filter((sp) => (selectedPlaque.assigned_salespersons || []).includes(sp.id)).length} affecté(s)
              </span>
            </div>

            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
              {salespersons.filter((sp) => (selectedPlaque.assigned_salespersons || []).includes(sp.id)).length === 0 ? (
                <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[#6E6C67] dark:text-[#A1A1AA] text-xs font-medium">
                  Aucun commercial affecté à cette plaque cartographique.
                </div>
              ) : (
                salespersons
                  .filter((sp) => (selectedPlaque.assigned_salespersons || []).includes(sp.id))
                  .map((sp) => (
                    <div
                      key={sp.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-[#4F6CE8] text-white flex items-center justify-center text-[10px] font-semibold shrink-0">
                          {sp.first_name?.[0] || sp.username[0]}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold truncate text-[#242124] dark:text-white">{sp.full_name}</span>
                          <span className="text-[9px] text-[#6E6C67] dark:text-[#A1A1AA]">@{sp.username}</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                        Déployé
                      </span>
                    </div>
                  ))
              )}
            </div>

            {/* Direct button to open dedicated Plaque Detail & Dispatch Interface */}
            {onOpenPlaqueDetail && (
              <button
                onClick={() => onOpenPlaqueDetail(selectedPlaque)}
                className="mt-2 py-2.5 px-3.5 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Icons.Eye size={14} />
                <span>Ouvrir Fiche Détail & Dispatch</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal: Enregistrer la Plaque Dessinée */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 w-full max-w-md border border-black/5 dark:border-white/5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Icons.Edit3 size={18} className="text-[#4F6CE8]" />
                <h3 className="font-semibold text-sm text-[#242124] dark:text-white">Créer la Plaque Tracée au Crayon</h3>
              </div>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <Icons.X size={16} />
              </button>
            </div>

            {savePlaqueError && (
              <div className="p-3 rounded-2xl bg-red-500/15 text-red-700 dark:text-red-300 text-xs font-medium">
                {savePlaqueError}
              </div>
            )}

            <form onSubmit={handleSaveDrawnPlaque} className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Code Plaque *</label>
                <input
                  required
                  type="text"
                  value={newPlaqueCode}
                  onChange={(e) => setNewPlaqueCode(e.target.value)}
                  placeholder="Ex: PLQ-GOMBE-02"
                  className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Nom du Secteur *</label>
                <input
                  required
                  type="text"
                  value={newPlaqueName}
                  onChange={(e) => setNewPlaqueName(e.target.value)}
                  placeholder="Ex: Avenue de la Libération"
                  className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Ville *</label>
                <input
                  required
                  type="text"
                  value={newPlaqueCity}
                  onChange={(e) => setNewPlaqueCity(e.target.value)}
                  placeholder="Kinshasa"
                  className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">
                  Affecter des commerciaux immédiatement
                </label>
                <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1">
                  {salespersons.map((sp) => (
                    <label key={sp.id} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#363336] text-xs cursor-pointer">
                      <span className="font-semibold text-[#242124] dark:text-white">{sp.full_name}</span>
                      <input
                        type="checkbox"
                        checked={newPlaqueSalespersonIds.includes(sp.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewPlaqueSalespersonIds((prev) => [...prev, sp.id]);
                          } else {
                            setNewPlaqueSalespersonIds((prev) => prev.filter((id) => id !== sp.id));
                          }
                        }}
                        className="w-4 h-4 accent-[#4F6CE8]"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 rounded-2xl bg-black/5 dark:bg-white/5 text-xs font-medium text-[#242124] dark:text-white cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlaque}
                  className="px-4 py-2 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSavingPlaque ? "Enregistrement..." : "Valider & Sauvegarder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
