"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type L from 'leaflet';
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
  const mapRef = useRef<L.Map | null>(null);
  const leafletModuleRef = useRef<typeof import('leaflet') | null>(null);
  const plaquesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const drawLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Selected Plaque for direct assignment popover
  const [selectedPlaque, setSelectedPlaque] = useState<Plaque | null>(null);
  const [assigningSalespersonIds, setAssigningSalespersonIds] = useState<number[]>([]);
  const [isSavingAssign, setIsSavingAssign] = useState(false);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState('');

  // Drawing Mode (Crayon)
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]); // [lat, lng]
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newPlaqueCode, setNewPlaqueCode] = useState('');
  const [newPlaqueName, setNewPlaqueName] = useState('');
  const [newPlaqueCity, setNewPlaqueCity] = useState('Kinshasa');
  const [newPlaqueSalespersonIds, setNewPlaqueSalespersonIds] = useState<number[]>([]);
  const [isSavingPlaque, setIsSavingPlaque] = useState(false);
  const [savePlaqueError, setSavePlaqueError] = useState('');

  // 1. Initialize Leaflet Map (0 WebGL requirement, works in all environments)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    let isMounted = true;

    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default;
        if (!isMounted || !mapContainerRef.current) return;
        leafletModuleRef.current = L as any;

        // Clean up default icon paths
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: '',
          iconUrl: '',
          shadowUrl: '',
        });

        const isDark = document.documentElement.classList.contains('dark');
        const tileUrl = isDark
          ? 'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png'
          : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

        const map = L.map(mapContainerRef.current, {
          center: [-4.3276, 15.3136], // Kinshasa [lat, lng]
          zoom: 12,
          zoomControl: false,
          attributionControl: false,
        });

        L.tileLayer(tileUrl, {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap &copy; CARTO',
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        const plaquesGroup = L.layerGroup().addTo(map);
        plaquesLayerGroupRef.current = plaquesGroup;

        const drawGroup = L.layerGroup().addTo(map);
        drawLayerGroupRef.current = drawGroup;

        mapRef.current = map;

        setTimeout(() => {
          if (isMounted && map) {
            map.invalidateSize();
          }
        }, 200);
      } catch (err) {
        console.error("Leaflet supervisor map initialization failed:", err);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Handle map clicks for drawing
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (!isDrawingMode) return;
      const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng];
      setDrawnPoints((prev) => [...prev, newPoint]);
    };

    map.on('click', handleMapClick);

    // Update cursor
    if (mapContainerRef.current) {
      mapContainerRef.current.style.cursor = isDrawingMode ? 'crosshair' : '';
    }

    return () => {
      map.off('click', handleMapClick);
    };
  }, [isDrawingMode]);

  // 3. Update Drawing Layer live on map
  useEffect(() => {
    const L = leafletModuleRef.current;
    const drawGroup = drawLayerGroupRef.current;
    if (!L || !drawGroup) return;

    drawGroup.clearLayers();

    if (drawnPoints.length === 0) return;

    if (drawnPoints.length >= 3) {
      const polygon = L.polygon(drawnPoints, {
        color: '#4F6CE8',
        weight: 2,
        dashArray: '4, 4',
        fillColor: '#4F6CE8',
        fillOpacity: 0.2,
      });
      polygon.addTo(drawGroup);
    } else {
      const polyline = L.polyline(drawnPoints, {
        color: '#4F6CE8',
        weight: 3,
        dashArray: '4, 4',
      });
      polyline.addTo(drawGroup);
    }

    // Vertex points
    drawnPoints.forEach(([lat, lng]) => {
      const circle = L.circleMarker([lat, lng], {
        radius: 5,
        color: '#FFFFFF',
        weight: 2,
        fillColor: '#4F6CE8',
        fillOpacity: 1,
      });
      circle.addTo(drawGroup);
    });
  }, [drawnPoints]);

  // 4. Update plaques markers and polygons
  useEffect(() => {
    const L = leafletModuleRef.current;
    const plaquesGroup = plaquesLayerGroupRef.current;
    const map = mapRef.current;
    if (!L || !plaquesGroup || !map) return;

    plaquesGroup.clearLayers();

    plaques.forEach((p) => {
      const lat = p.latitude ?? -4.3276;
      const lng = p.longitude ?? 15.3136;

      // Render polygon boundary if available
      if (p.boundary_geojson) {
        try {
          const geoJsonLayer = L.geoJSON(p.boundary_geojson, {
            style: {
              color: '#4F6CE8',
              weight: 2,
              fillColor: '#4F6CE8',
              fillOpacity: 0.15,
            },
          });
          geoJsonLayer.on('click', () => {
            setSelectedPlaque(p);
            setAssigningSalespersonIds(p.assigned_salespersons || []);
          });
          geoJsonLayer.addTo(plaquesGroup);
        } catch (e) {
          // ignore malformed geojson
        }
      }

      // Marker
      const icon = L.divIcon({
        className: 'custom-supervisor-marker',
        html: `
          <div class="cursor-pointer group flex flex-col items-center select-none" style="transform: translate(-50%, -50%);">
            <div class="px-2.5 py-1 rounded-xl bg-[#4F6CE8] text-white font-extrabold text-[11px] shadow-sm flex items-center gap-1 border border-white/30 transition-transform group-hover:scale-110">
              <span>${p.code}</span>
            </div>
            <div class="w-1.5 h-1.5 bg-[#4F6CE8] rounded-full mt-0.5"></div>
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker([lat, lng], { icon });
      marker.on('click', () => {
        setSelectedPlaque(p);
        setAssigningSalespersonIds(p.assigned_salespersons || []);
      });
      marker.addTo(plaquesGroup);
    });
  }, [plaques]);

  // Save Drawn Plaque to Backend
  const handleSavePlaque = async () => {
    if (drawnPoints.length < 3) return;
    if (!newPlaqueCode || !newPlaqueName) {
      setSavePlaqueError("Veuillez renseigner le code et le nom de la plaque.");
      return;
    }

    setIsSavingPlaque(true);
    setSavePlaqueError('');

    // Compute centroid
    const avgLat = drawnPoints.reduce((acc, p) => acc + p[0], 0) / drawnPoints.length;
    const avgLng = drawnPoints.reduce((acc, p) => acc + p[1], 0) / drawnPoints.length;

    // Convert [lat, lng] to GeoJSON [lng, lat]
    const closed = [...drawnPoints, drawnPoints[0]];
    const boundaryGeoJson = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [closed.map(([lat, lng]) => [lng, lat])],
      },
      properties: {
        code: newPlaqueCode,
        name: newPlaqueName,
      },
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

  return (
    <div className="relative w-full h-[650px] rounded-3xl overflow-hidden border border-black/5 dark:border-white/5 bg-[#F6F5F2] dark:bg-[#242124]">
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full z-0 ${isDrawingMode ? 'cursor-crosshair' : ''}`}
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

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-black/5 dark:bg-white/5 p-3 rounded-2xl flex flex-col">
              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Comptes SOHO</span>
              <span className="text-lg font-bold text-[#242124] dark:text-white">{selectedPlaque.enterprises_count || 0}</span>
            </div>
            <div className="bg-black/5 dark:bg-white/5 p-3 rounded-2xl flex flex-col">
              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Commerciaux</span>
              <span className="text-lg font-bold text-[#4F6CE8]">
                {assigningSalespersonIds.length}
              </span>
            </div>
          </div>

          {/* Detailed Plaque Link */}
          {onOpenPlaqueDetail && (
            <button
              onClick={() => onOpenPlaqueDetail(selectedPlaque)}
              className="w-full py-2 px-3 rounded-2xl bg-[#4F6CE8]/10 hover:bg-[#4F6CE8]/20 text-[#4F6CE8] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Accéder à la Fiche Complète & Dispatch</span>
              <Icons.ExternalLink size={13} />
            </button>
          )}

          {/* Direct Salesperson Checkbox Assignment */}
          <div className="flex flex-col gap-2 pt-2 border-t border-black/5 dark:border-white/5">
            <span className="text-xs font-semibold text-[#242124] dark:text-white">
              Affecter des Commerciaux à cette Plaque :
            </span>

            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
              {salespersons.map((sp) => {
                const isAssigned = assigningSalespersonIds.includes(sp.id);
                return (
                  <label
                    key={sp.id}
                    className={`flex items-center gap-2.5 p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                      isAssigned
                        ? 'bg-[#4F6CE8]/10 text-[#4F6CE8] font-semibold'
                        : 'hover:bg-black/5 dark:hover:bg-white/5 text-[#242124] dark:text-white'
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
                      className="rounded accent-[#4F6CE8] cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold">
                        {sp.full_name?.charAt(0) || 'C'}
                      </div>
                      <span className="truncate">{sp.full_name}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            {assignSuccessMsg && (
              <span className="text-[11px] font-medium text-[#10B981] mt-1">{assignSuccessMsg}</span>
            )}

            <button
              onClick={handleSaveDirectAssignment}
              disabled={isSavingAssign}
              className="w-full mt-2 py-2 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isSavingAssign ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <span>Sauvegarder l'Affectation</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Save New Plaque from Drawing */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-2xl border border-black/10 dark:border-white/10 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Créer une Nouvelle Plaque
                </h3>
                <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                  Périmètre tracé au crayon ({drawnPoints.length} sommets)
                </p>
              </div>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 cursor-pointer"
              >
                <Icons.X size={16} />
              </button>
            </div>

            {savePlaqueError && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
                {savePlaqueError}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Code de la Plaque (ex: PLQ-GOMBE-01) *
                </label>
                <input
                  type="text"
                  value={newPlaqueCode}
                  onChange={(e) => setNewPlaqueCode(e.target.value)}
                  placeholder="ex: PLQ-GOMBE-01"
                  className="w-full mt-1 bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-2xl p-3 text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Nom du Territoire / Quartier *
                </label>
                <input
                  type="text"
                  value={newPlaqueName}
                  onChange={(e) => setNewPlaqueName(e.target.value)}
                  placeholder="ex: Boulevard du 30 Juin"
                  className="w-full mt-1 bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-2xl p-3 text-xs font-semibold text-zinc-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Ville
                </label>
                <input
                  type="text"
                  value={newPlaqueCity}
                  onChange={(e) => setNewPlaqueCity(e.target.value)}
                  className="w-full mt-1 bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-2xl p-3 text-xs font-semibold text-zinc-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Assigner des commerciaux dès la création :
                </label>
                <div className="grid grid-cols-2 gap-1.5 mt-1 max-h-36 overflow-y-auto pr-1">
                  {salespersons.map((sp) => {
                    const isSelected = newPlaqueSalespersonIds.includes(sp.id);
                    return (
                      <label
                        key={sp.id}
                        className={`flex items-center gap-2 p-2 rounded-xl text-xs cursor-pointer border transition-colors ${
                          isSelected
                            ? 'bg-[#4F6CE8]/10 border-[#4F6CE8] text-[#4F6CE8] font-bold'
                            : 'bg-white dark:bg-[#363336] border-black/5 dark:border-white/5 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewPlaqueSalespersonIds((prev) => [...prev, sp.id]);
                            } else {
                              setNewPlaqueSalespersonIds((prev) => prev.filter((id) => id !== sp.id));
                            }
                          }}
                          className="accent-[#4F6CE8]"
                        />
                        <span className="truncate">{sp.full_name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/5 dark:border-white/5">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleSavePlaque}
                disabled={isSavingPlaque}
                className="px-5 py-2 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSavingPlaque ? 'Enregistrement...' : 'Enregistrer la Plaque'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
