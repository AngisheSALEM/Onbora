"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { Icons } from '@/components/shared/Icons';

interface PlaqueItem {
  id: number;
  code: string;
  name: string;
  city: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  enterprises_count: number;
  assigned_salespersons_names?: string[];
  boundary_geojson?: any;
}

interface AdminPlaqueMapOnlyProps {
  plaques: PlaqueItem[];
  selectedPlaqueCode?: string;
  onSelectPlaque?: (code: string) => void;
}

export default function AdminPlaqueMapOnly({
  plaques,
  selectedPlaqueCode,
  onSelectPlaque,
}: AdminPlaqueMapOnlyProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [activePlaque, setActivePlaque] = useState<PlaqueItem | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    // Check WebGL2
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
      setWebglError("Accélération graphique WebGL2 indisponible.");
      return;
    }

    const isDarkMode = document.documentElement.classList.contains('dark');
    const tileUrl = isDarkMode
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
        center: [15.3136, -4.3276], // Kinshasa centre
        zoom: 11.5,
      });
    } catch (err: any) {
      console.warn("MapLibre WebGL2 initialization failed:", err);
      setWebglError(err?.message || "Erreur WebGL2");
      return;
    }

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
        console.warn("Cleanup error:", err);
      }
    };
  }, []);

  // Update Markers & GeoJSON layers when plaques change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    plaques.forEach((p) => {
      const lat = p.latitude ?? -4.3276;
      const lng = p.longitude ?? 15.3136;

      const el = document.createElement('div');
      el.className = 'cursor-pointer group flex flex-col items-center';
      el.innerHTML = `
        <div class="px-2.5 py-1 rounded-xl bg-[#4F6CE8] text-white font-extrabold text-[11px] shadow-sm flex items-center gap-1 border border-white/30 transition-transform group-hover:scale-110">
          <span>${p.code}</span>
        </div>
        <div class="w-1.5 h-1.5 bg-[#4F6CE8] rounded-full mt-0.5"></div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setActivePlaque(p);
        if (onSelectPlaque) onSelectPlaque(p.code);
        map.flyTo({ center: [lng, lat], zoom: 13.5, essential: true });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    if (plaques.length > 0 && plaques[0].latitude && plaques[0].longitude) {
      setActivePlaque(plaques[0]);
    }
  }, [plaques, onSelectPlaque]);

  if (webglError) {
    return (
      <div className="flex flex-col gap-4 p-5 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5">
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#4F6CE8]/10 border border-[#4F6CE8]/20">
          <div className="w-8 h-8 rounded-xl bg-[#4F6CE8]/20 text-[#4F6CE8] flex items-center justify-center shrink-0">
            <span className="font-bold text-xs">3D</span>
          </div>
          <div className="flex flex-col">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
              Affichage cartographique désactivé (WebGL2 requis)
            </h4>
            <p className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
              Activez l'accélération graphique matérielle dans les paramètres de votre navigateur pour visualiser la carte interactive.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
          {plaques.map((plaque) => (
            <div
              key={plaque.id}
              onClick={() => {
                setActivePlaque(plaque);
                if (onSelectPlaque) onSelectPlaque(plaque.code);
              }}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#242124] border border-black/5 dark:border-white/5 hover:border-[#4F6CE8]/40 transition-all cursor-pointer flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#4F6CE8]">{plaque.code}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400">
                  {plaque.enterprises_count} ent.
                </span>
              </div>
              <h5 className="text-xs font-bold text-zinc-900 dark:text-white">{plaque.name}</h5>
              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{plaque.city}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[620px] rounded-3xl overflow-hidden border border-black/5 dark:border-white/5 bg-[#ECEAE5] dark:bg-[#242124]">
      {/* Container de la carte */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Boutons de zoom et recentrage */}
      <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-10">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          className="w-9 h-9 rounded-xl bg-white/90 dark:bg-[#2D2A2D]/90 backdrop-blur-md text-[#242124] dark:text-white flex items-center justify-center font-semibold text-sm shadow-sm hover:bg-white dark:hover:bg-[#363336] transition-all cursor-pointer border border-black/5 dark:border-white/5"
          title="Zoom avant"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          className="w-9 h-9 rounded-xl bg-white/90 dark:bg-[#2D2A2D]/90 backdrop-blur-md text-[#242124] dark:text-white flex items-center justify-center font-semibold text-sm shadow-sm hover:bg-white dark:hover:bg-[#363336] transition-all cursor-pointer border border-black/5 dark:border-white/5"
          title="Zoom arrière"
        >
          -
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.flyTo({ center: [15.3136, -4.3276], zoom: 11.5 })}
          className="w-9 h-9 rounded-xl bg-white/90 dark:bg-[#2D2A2D]/90 backdrop-blur-md text-[#242124] dark:text-white flex items-center justify-center text-xs shadow-sm hover:bg-white dark:hover:bg-[#363336] transition-all cursor-pointer border border-black/5 dark:border-white/5"
          title="Recentrer sur Kinshasa"
        >
          <Icons.Compass size={15} />
        </button>
      </div>

      {/* Carte flottante d'inspection de la plaque active */}
      {activePlaque && (
        <div className="absolute bottom-4 left-4 max-w-sm w-full bg-white/95 dark:bg-[#2D2A2D]/95 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-black/5 dark:border-white/5 z-10 animate-fade-in flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded-md bg-[#4F6CE8]/15 text-[#4F6CE8]">
                {activePlaque.code}
              </span>
              <h4 className="font-extrabold text-sm text-[#242124] dark:text-white mt-1">
                {activePlaque.name}
              </h4>
              <span className="text-[11px] text-[#787570] dark:text-[#9B978F]">
                Ville : {activePlaque.city}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActivePlaque(null)}
              className="p-1 text-[#787570] hover:text-[#242124] dark:hover:text-white cursor-pointer"
            >
              <Icons.X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-black/5 dark:border-white/5">
            <div className="p-2 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl">
              <span className="text-[10px] text-[#787570] dark:text-[#9B978F] block">Comptes SOHO</span>
              <span className="font-extrabold text-[#4F6CE8] text-sm">
                {activePlaque.enterprises_count}
              </span>
            </div>
            <div className="p-2 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl">
              <span className="text-[10px] text-[#787570] dark:text-[#9B978F] block">Rayon d'action</span>
              <span className="font-semibold text-[#242124] dark:text-white text-xs">
                {activePlaque.radius_km || 5} km
              </span>
            </div>
          </div>

          {activePlaque.assigned_salespersons_names && activePlaque.assigned_salespersons_names.length > 0 && (
            <div className="text-[11px] pt-1">
              <span className="text-[#787570] dark:text-[#9B978F] block font-semibold text-[10px] uppercase tracking-wider mb-1">
                Commerciaux affectés :
              </span>
              <div className="flex flex-wrap gap-1">
                {activePlaque.assigned_salespersons_names.map((name, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-lg bg-[#4F6CE8]/10 text-[#4F6CE8] font-semibold text-[10px]"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
