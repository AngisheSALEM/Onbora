"use client";

import React, { useEffect, useRef, useState } from 'react';
import type L from 'leaflet';
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
  const mapRef = useRef<L.Map | null>(null);
  const leafletModuleRef = useRef<typeof import('leaflet') | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const [activePlaque, setActivePlaque] = useState<PlaqueItem | null>(null);

  // 1. Initialize Leaflet Map (0 WebGL dependency, works on all environments)
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

        const isDarkMode = document.documentElement.classList.contains('dark');
        const tileUrl = isDarkMode
          ? 'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png'
          : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

        const map = L.map(mapContainerRef.current, {
          center: [-4.3276, 15.3136], // Kinshasa [lat, lng]
          zoom: 11.5,
          zoomControl: false,
          attributionControl: false,
        });

        L.tileLayer(tileUrl, {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap &copy; CARTO',
        }).addTo(map);

        const markersGroup = L.layerGroup().addTo(map);
        markersLayerGroupRef.current = markersGroup;

        mapRef.current = map;

        setTimeout(() => {
          if (isMounted && map) {
            map.invalidateSize();
          }
        }, 200);
      } catch (err) {
        console.error("Leaflet admin map initialization failed:", err);
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

  // 2. Update Markers & GeoJSON layers when plaques change
  useEffect(() => {
    const L = leafletModuleRef.current;
    const markersGroup = markersLayerGroupRef.current;
    const map = mapRef.current;
    if (!L || !markersGroup || !map) return;

    markersGroup.clearLayers();

    plaques.forEach((p) => {
      const lat = p.latitude ?? -4.3276;
      const lng = p.longitude ?? 15.3136;

      // Optional GeoJSON boundary
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
            setActivePlaque(p);
            if (onSelectPlaque) onSelectPlaque(p.code);
            map.flyTo([lat, lng], 13.5);
          });
          geoJsonLayer.addTo(markersGroup);
        } catch (e) {
          // ignore malformed geojson
        }
      }

      // Marker
      const icon = L.divIcon({
        className: 'custom-admin-marker',
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
        setActivePlaque(p);
        if (onSelectPlaque) onSelectPlaque(p.code);
        map.flyTo([lat, lng], 13.5);
      });
      marker.addTo(markersGroup);
    });

    if (plaques.length > 0 && plaques[0].latitude && plaques[0].longitude) {
      setActivePlaque(plaques[0]);
    }
  }, [plaques, onSelectPlaque]);

  return (
    <div className="relative w-full h-[620px] rounded-3xl overflow-hidden border border-black/5 dark:border-white/5 bg-[#ECEAE5] dark:bg-[#242124]">
      {/* Container de la carte */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

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
          onClick={() => mapRef.current?.flyTo([-4.3276, 15.3136], 11.5)}
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
