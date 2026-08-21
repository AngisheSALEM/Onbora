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
  assigned_salespersons?: number[];
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
  first_name?: string;
  last_name?: string;
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
  onSalespersonChanged: () => void;
}

export default function SupervisorTerritoryMap({
  plaques,
  enterprises,
  salespersons,
  recentReports,
  onPlaqueCreated,
  onSalespersonAssigned,
  onSalespersonChanged,
}: SupervisorTerritoryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Navigation sub-tab
  const [activeTab, setActiveTab] = useState<'map' | 'salespersons' | 'reports'>('map');

  // Selected Lead / Plaque
  const [selectedEnterprise, setSelectedEnterprise] = useState<Enterprise | null>(null);
  const [selectedPlaque, setSelectedPlaque] = useState<Plaque | null>(null);

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
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Quick Assign Commercial Modal
  const [assigningPlaque, setAssigningPlaque] = useState<Plaque | null>(null);
  const [assigningSalespersonIds, setAssigningSalespersonIds] = useState<number[]>([]);
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  // Create New Commercial Modal
  const [isCreateSalesModalOpen, setIsCreateSalesModalOpen] = useState(false);
  const [newSalesUsername, setNewSalesUsername] = useState('');
  const [newSalesPassword, setNewSalesPassword] = useState('');
  const [newSalesFirstName, setNewSalesFirstName] = useState('');
  const [newSalesLastName, setNewSalesLastName] = useState('');
  const [newSalesPhone, setNewSalesPhone] = useState('+243 ');
  const [newSalesLocation, setNewSalesLocation] = useState('Kinshasa');
  const [newSalesPlaqueId, setNewSalesPlaqueId] = useState<number | ''>('');
  const [isSubmittingNewSales, setIsSubmittingNewSales] = useState(false);

  // Revoke / Delete Confirmation
  const [revokingSalesperson, setRevokingSalesperson] = useState<Salesperson | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Free high-performance OpenStreetMap / Carto Dark tile style (Zero API Key required)
  const getMapStyle = (isDark: boolean): maplibregl.StyleSpecification => {
    if (isDark) {
      return {
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          },
        },
        layers: [
          {
            id: 'carto-dark-layer',
            type: 'raster',
            source: 'carto-dark',
            minzoom: 0,
            maxzoom: 20,
          },
        ],
      };
    } else {
      return {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      };
    }
  };

  // Initialize MapLibre GL JS
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const isDarkMode = document.documentElement.classList.contains('dark');
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getMapStyle(isDarkMode),
      center: [15.3084, -4.3033], // Kinshasa Center
      zoom: 12.5,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    mapRef.current = map;

    // Handle map click for delimitation
    map.on('click', (e) => {
      setNewPlaqueLat(parseFloat(e.lngLat.lat.toFixed(5)));
      setNewPlaqueLng(parseFloat(e.lngLat.lng.toFixed(5)));
    });

    return () => {
      map.remove();
    };
  }, []);

  // Update Markers on Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 1. Enterprise Lead Markers (Green = Converted/Ready, Orange = To Prospect)
    enterprises.forEach((ent) => {
      if (!ent.latitude || !ent.longitude) return;

      const isReady = ent.is_ready_for_conversion;
      const markerColor = isReady ? '#10B981' : '#FF7900';

      const el = document.createElement('div');
      el.className = 'cursor-pointer transform hover:scale-125 transition-transform duration-150';
      el.innerHTML = `
        <div style="background-color: ${markerColor}; width: 22px; height: 22px; border-radius: 50%; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
          <div style="background-color: #FFFFFF; width: 6px; height: 6px; border-radius: 50%;"></div>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedEnterprise(ent);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([ent.longitude, ent.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // 2. Plaque Territorial Center Markers
    plaques.forEach((p) => {
      if (!p.latitude || !p.longitude) return;

      const el = document.createElement('div');
      el.className = 'cursor-pointer transform hover:scale-110 transition-transform duration-150';
      el.innerHTML = `
        <div style="background: rgba(255, 121, 0, 0.18); border: 2px solid #FF7900; border-radius: 999px; padding: 4px 10px; backdrop-filter: blur(8px); display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 14px rgba(255,121,0,0.25);">
          <div style="width: 8px; height: 8px; border-radius: 50%; background-color: #FF7900;"></div>
          <span style="font-size: 11px; font-weight: 800; color: #FF7900; letter-spacing: 0.3px;">${p.code}</span>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedPlaque(p);
        map.flyTo({ center: [p.longitude, p.latitude], zoom: 13.5 });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([p.longitude, p.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [enterprises, plaques]);

  // Create Plaque Handler
  const handleCreatePlaque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaqueCode || !newPlaqueName) {
      setStatusMessage({ text: "Veuillez renseigner le code et le nom de la plaque.", type: 'error' });
      return;
    }

    setIsSubmittingPlaque(true);
    setStatusMessage(null);

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
        throw new Error(err.detail || JSON.stringify(err) || "Erreur de création de la plaque");
      }

      setStatusMessage({ text: `Plaque ${newPlaqueCode} créée et déployée avec succès.`, type: 'success' });
      setIsDelimiting(false);
      setNewPlaqueCode('');
      setNewPlaqueName('');
      setSelectedSalespersonIds([]);
      onPlaqueCreated();
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Erreur lors du déploiement.", type: 'error' });
    } finally {
      setIsSubmittingPlaque(false);
    }
  };

  // Re-assign Salespersons to Plaque
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

      if (!res.ok) throw new Error("Erreur d'affectation");

      setAssigningPlaque(null);
      setStatusMessage({ text: `Effectif commercial mis à jour pour la plaque ${assigningPlaque.code}.`, type: 'success' });
      onSalespersonAssigned();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  // Create New Commercial (Supervisor Action)
  const handleCreateSalesperson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSalesUsername || !newSalesPassword) {
      alert("L'identifiant et le mot de passe sont obligatoires.");
      return;
    }

    setIsSubmittingNewSales(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_URL}/api/sales/salespersons/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          username: newSalesUsername.trim().toLowerCase(),
          password: newSalesPassword.trim(),
          first_name: newSalesFirstName.trim(),
          last_name: newSalesLastName.trim(),
          phone: newSalesPhone.trim(),
          location: newSalesLocation.trim(),
          plaque_id: newSalesPlaqueId || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Erreur de création du compte commercial");
      }

      setIsCreateSalesModalOpen(false);
      setNewSalesUsername('');
      setNewSalesPassword('');
      setNewSalesFirstName('');
      setNewSalesLastName('');
      setNewSalesPhone('+243 ');
      setStatusMessage({ text: `Compte commercial créé avec succès. Le commercial peut désormais se connecter sur l'app mobile.`, type: 'success' });
      onSalespersonChanged();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsSubmittingNewSales(false);
    }
  };

  // Revoke Commercial Account (Supervisor Action)
  const handleRevokeSalesperson = async () => {
    if (!revokingSalesperson) return;
    setIsRevoking(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_URL}/api/sales/salespersons/${revokingSalesperson.id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (!res.ok) throw new Error("Erreur de suppression du compte commercial");

      setRevokingSalesperson(null);
      setStatusMessage({ text: `Le compte commercial '${revokingSalesperson.username}' a été révoqué. Son accès à l'application mobile est immédiatement coupé.`, type: 'success' });
      onSalespersonChanged();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsRevoking(false);
    }
  };

  const flyTo = (lng: number, lat: number, zoom = 13.5) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, essential: true });
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in font-sans">
      {/* Status Notification Toast */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold ${
          statusMessage.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <Icons.CheckCircle size={16} /> : <Icons.AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
          >
            <Icons.Close size={14} />
          </button>
        </div>
      )}

      {/* Top Metric Strip (Mobile App Styled Solid Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Plaques Ouvertes</span>
            <Icons.Layers size={16} className="text-orange-500" />
          </div>
          <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50 mt-1">{plaques.length}</span>
          <p className="text-[10px] text-zinc-500">Secteurs délimités par le back-office</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Leads Géolocalisés</span>
            <Icons.MapPin size={16} className="text-emerald-500" />
          </div>
          <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {enterprises.length}
          </span>
          <p className="text-[10px] text-zinc-500">
            {enterprises.filter((e) => e.is_ready_for_conversion).length} prêts à convertir (Verts)
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Forces Commerciales</span>
            <Icons.Users size={16} className="text-blue-500" />
          </div>
          <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50 mt-1">{salespersons.length}</span>
          <p className="text-[10px] text-zinc-500">Comptes terrain gérés en direct</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Visites Effectuées</span>
            <Icons.FileText size={16} className="text-orange-500" />
          </div>
          <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50 mt-1">{recentReports.length}</span>
          <p className="text-[10px] text-zinc-500">Comptes-rendus transmis depuis l'app</p>
        </div>
      </div>

      {/* Segmented Navigation Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-100 dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'map'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Icons.Map size={14} /> Territoires & Carte des Plaques
          </button>
          <button
            onClick={() => setActiveTab('salespersons')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'salespersons'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Icons.Users size={14} /> Effectif Commercial ({salespersons.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Icons.Activity size={14} /> Rapports Terrain Reçus ({recentReports.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'map' && (
            <button
              onClick={() => setIsDelimiting(!isDelimiting)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                isDelimiting
                  ? 'bg-red-500/10 text-red-500 border-red-500/30'
                  : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700 shadow-sm'
              }`}
            >
              <Icons.Crosshair size={14} />
              {isDelimiting ? 'Fermer Délimitation' : 'Délimiter une Plaque sur la Carte'}
            </button>
          )}

          {activeTab === 'salespersons' && (
            <button
              onClick={() => setIsCreateSalesModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-black text-white bg-orange-500 hover:bg-orange-600 transition-all cursor-pointer flex items-center gap-2 shadow-sm"
            >
              <Icons.UserPlus size={14} /> Créer un Compte Commercial
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: Territoires & Carte */}
      {activeTab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Vector Map Frame */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            {/* Quick Sector Jumps */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Icons.Compass size={12} /> Centrer sur :
              </span>
              <button
                onClick={() => flyTo(15.3084, -4.3033)}
                className="px-3 py-1 rounded-full text-[11px] font-bold bg-zinc-100 dark:bg-zinc-850 hover:bg-orange-500 hover:text-white transition-all cursor-pointer"
              >
                Kinshasa (Gombe)
              </button>
              <button
                onClick={() => flyTo(15.3400, -4.3450)}
                className="px-3 py-1 rounded-full text-[11px] font-bold bg-zinc-100 dark:bg-zinc-850 hover:bg-orange-500 hover:text-white transition-all cursor-pointer"
              >
                Kinshasa (Limete)
              </button>
              <button
                onClick={() => flyTo(15.2832, -4.2634)}
                className="px-3 py-1 rounded-full text-[11px] font-bold bg-zinc-100 dark:bg-zinc-850 hover:bg-orange-500 hover:text-white transition-all cursor-pointer"
              >
                Brazzaville (Plateau)
              </button>
              <button
                onClick={() => flyTo(27.4794, -11.6608)}
                className="px-3 py-1 rounded-full text-[11px] font-bold bg-zinc-100 dark:bg-zinc-850 hover:bg-orange-500 hover:text-white transition-all cursor-pointer"
              >
                Lubumbashi (Centre)
              </button>
            </div>

            {/* Map Container */}
            <div className="relative w-full h-[540px] rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm bg-zinc-900">
              <div ref={mapContainerRef} className="w-full h-full" />

              {/* Map Legend Overlay */}
              <div className="absolute top-4 left-4 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg flex flex-col gap-2 z-10 text-[11px]">
                <span className="font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Légende des Entités
                </span>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white dark:border-zinc-900" />
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Lead Prêt / Converti</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500 border border-white dark:border-zinc-900" />
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Lead À Prospecter</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-dashed border-orange-500" />
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Centre & Périmètre de Plaque</span>
                </div>
              </div>

              {/* Delimitation Banner */}
              {isDelimiting && (
                <div className="absolute bottom-4 left-4 right-4 bg-orange-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center justify-between z-10 animate-fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Icons.Crosshair size={18} />
                    <span>Mode Délimitation : Cliquez sur la carte pour définir le centre ({newPlaqueLat}, {newPlaqueLng})</span>
                  </div>
                  <span className="text-xs bg-black/20 px-3 py-1 rounded-full font-black">
                    Rayon : {newPlaqueRadius} km
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Control & Detail Column */}
          <div className="flex flex-col gap-4">
            {/* 1. Delimitation Form */}
            {isDelimiting ? (
              <div className="p-6 rounded-3xl bg-zinc-100/90 dark:bg-zinc-900 border border-orange-500/30 flex flex-col gap-4 shadow-sm animate-fade-in">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Icons.Target size={16} className="text-orange-500" />
                    <h3 className="text-xs font-black uppercase text-zinc-900 dark:text-zinc-100">
                      Délimiter une Plaque
                    </h3>
                  </div>
                  <span className="text-[10px] bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full font-extrabold">
                    Superviseur
                  </span>
                </div>

                <form onSubmit={handleCreatePlaque} className="flex flex-col gap-3 text-xs">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-zinc-600 dark:text-zinc-400">Code de la plaque *</label>
                    <input
                      type="text"
                      placeholder="Ex: KIN-BANDAL"
                      value={newPlaqueCode}
                      onChange={(e) => setNewPlaqueCode(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-bold"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-zinc-600 dark:text-zinc-400">Nom descriptif du secteur *</label>
                    <input
                      type="text"
                      placeholder="Ex: Kinshasa (Bandalungwa & Kasa-Vubu)"
                      value={newPlaqueName}
                      onChange={(e) => setNewPlaqueName(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl text-xs"
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
                        className="px-3.5 py-2.5 rounded-xl text-xs"
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
                        className="px-3.5 py-2.5 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 mt-1">
                    <label className="font-bold text-zinc-600 dark:text-zinc-400">
                      Affecter des commerciaux immédiatement
                    </label>
                    <div className="max-h-32 overflow-y-auto flex flex-col gap-1.5 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-2.5 bg-zinc-50 dark:bg-zinc-950">
                      {salespersons.length === 0 ? (
                        <span className="text-[10px] text-zinc-400">Aucun commercial actif</span>
                      ) : (
                        salespersons.map((s) => (
                          <label key={s.id} className="flex items-center gap-2 cursor-pointer text-xs p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg">
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
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">{s.full_name}</span>
                            <span className="text-[10px] text-zinc-400">(@{s.username})</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingPlaque}
                    className="w-full py-3 mt-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-xs transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
                  >
                    <Icons.CheckCircle size={14} />
                    {isSubmittingPlaque ? 'Déploiement...' : 'Créer et Déployer la Plaque'}
                  </button>
                </form>
              </div>
            ) : selectedEnterprise ? (
              /* 2. Selected Lead Dossier */
              <div className="p-6 rounded-3xl bg-zinc-100/90 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex flex-col gap-4 shadow-sm animate-fade-in">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase text-orange-500 tracking-wider">
                      Fiche Entreprise
                    </span>
                    <h3 className="text-base font-black text-zinc-900 dark:text-zinc-50">{selectedEnterprise.name}</h3>
                    <p className="text-xs text-zinc-500">{selectedEnterprise.sector} • {selectedEnterprise.location}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                    selectedEnterprise.is_ready_for_conversion
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
                  }`}>
                    {selectedEnterprise.is_ready_for_conversion ? 'Converti' : 'À Prospecter'}
                  </span>
                </div>

                {selectedEnterprise.ai_tailored_pitch && (
                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs flex flex-col gap-1">
                    <span className="font-black text-orange-500 text-[10px] uppercase flex items-center gap-1">
                      <Icons.Sparkles size={12} /> Argumentaire IA Sur-Mesure
                    </span>
                    <p className="text-zinc-700 dark:text-zinc-300 italic text-[11px] leading-relaxed">
                      {selectedEnterprise.ai_tailored_pitch}
                    </p>
                  </div>
                )}

                {selectedEnterprise.key_needs && selectedEnterprise.key_needs.length > 0 && (
                  <div className="flex flex-col gap-1.5 text-xs">
                    <span className="font-bold text-zinc-500 text-[10px] uppercase">Besoins identifiés :</span>
                    <ul className="list-disc pl-4 text-zinc-700 dark:text-zinc-300 text-[11px] space-y-0.5">
                      {selectedEnterprise.key_needs.map((need, idx) => (
                        <li key={idx}>{need}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  onClick={() => setSelectedEnterprise(null)}
                  className="w-full py-2.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  Fermer la Fiche
                </button>
              </div>
            ) : (
              /* 3. Plaques List */
              <div className="p-6 rounded-3xl bg-zinc-100/90 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex flex-col gap-3 shadow-sm">
                <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Icons.Layers size={16} className="text-orange-500" />
                    <h3 className="text-xs font-black uppercase text-zinc-900 dark:text-zinc-100">
                      Plaques Actives ({plaques.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-bold">{enterprises.length} Leads</span>
                </div>

                <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {plaques.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/40 hover:border-orange-500/50 transition-all flex flex-col gap-2 cursor-pointer"
                      onClick={() => {
                        setSelectedPlaque(p);
                        flyTo(p.longitude, p.latitude, 13.5);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">{p.name}</span>
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-[9px] font-black">
                            {p.code}
                          </span>
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
                          setAssigningSalespersonIds(p.assigned_salespersons || []);
                        }}
                        className="w-full py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-orange-500 hover:text-white text-[10px] font-bold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Icons.Users size={12} /> Affecter Commerciaux
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Commercial Accounts Management */}
      {activeTab === 'salespersons' && (
        <div className="p-6 md:p-8 rounded-3xl bg-zinc-100/90 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col gap-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-tight flex items-center gap-2">
                <Icons.Users size={18} className="text-orange-500" />
                Gestion de l'Effectif Commercial
              </h3>
              <p className="text-xs text-zinc-500">
                Créez, affectez ou révoquez les comptes des commerciaux terrain ayant accès à l'application mobile.
              </p>
            </div>
            <button
              onClick={() => setIsCreateSalesModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-black text-white bg-orange-500 hover:bg-orange-600 transition-all cursor-pointer flex items-center gap-2 shadow-sm"
            >
              <Icons.UserPlus size={14} /> Nouveau Commercial
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold">
                  <th className="py-3 px-3">Commercial</th>
                  <th className="py-3 px-3">Téléphone</th>
                  <th className="py-3 px-3">Secteur / Ville</th>
                  <th className="py-3 px-3">Plaques Affectées</th>
                  <th className="py-3 px-3">Activité Mobile</th>
                  <th className="py-3 px-3 text-right">Actions Superviseur</th>
                </tr>
              </thead>
              <tbody>
                {salespersons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-400">
                      Aucun commercial enregistré. Cliquez sur "Nouveau Commercial" pour créer le premier compte.
                    </td>
                  </tr>
                ) : (
                  salespersons.map((s) => (
                    <tr key={s.id} className="border-b border-zinc-200/50 dark:border-zinc-800/60 hover:bg-white/40 dark:hover:bg-zinc-950/30">
                      <td className="py-3.5 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                        {s.full_name}
                        <span className="block text-[10px] text-zinc-400 font-normal">Identifiant : @{s.username}</span>
                      </td>
                      <td className="py-3.5 px-3 text-zinc-500">{s.phone || 'Non renseigné'}</td>
                      <td className="py-3.5 px-3 text-zinc-700 dark:text-zinc-300 font-medium">{s.location || 'Kinshasa'}</td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {s.assigned_plaques.length === 0 ? (
                            <span className="text-[10px] text-zinc-400 italic">Non affecté</span>
                          ) : (
                            s.assigned_plaques.map((code, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-[9px] font-black">
                                {code}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                        {s.reports_count} rapport(s) transmis
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => setRevokingSalesperson(s)}
                          className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                          title="Révoquer l'accès à l'application mobile"
                        >
                          <Icons.Trash2 size={12} /> Révoquer Accès
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Recent Reports Received Feed */}
      {activeTab === 'reports' && (
        <div className="p-6 md:p-8 rounded-3xl bg-zinc-100/90 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col gap-5 animate-fade-in">
          <div>
            <h3 className="text-base font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-tight flex items-center gap-2">
              <Icons.Activity size={18} className="text-orange-500" />
              Flux des Comptes-Rendus de Visite Mobile
            </h3>
            <p className="text-xs text-zinc-500">
              Rapports envoyés en direct par les commerciaux depuis l'application Onbora Mobile.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentReports.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-zinc-400 text-xs">
                Aucun compte-rendu de visite reçu pour le moment.
              </div>
            ) : (
              recentReports.map((rep) => (
                <div key={rep.id} className="p-5 rounded-2xl bg-white/70 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-sm text-zinc-900 dark:text-zinc-100">{rep.enterprise_name}</h4>
                      <p className="text-[11px] text-zinc-500">Par <strong>{rep.salesperson_name}</strong> • {new Date(rep.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    {rep.ai_feedback_rating && (
                      <span className="px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-500 text-[10px] font-black flex items-center gap-1">
                        <Icons.Star size={12} /> {rep.ai_feedback_rating}/5 IA
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    {rep.executive_summary}
                  </p>

                  {rep.confirmed_needs && rep.confirmed_needs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {rep.confirmed_needs.map((n, i) => (
                        <span key={i} className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[9px] font-bold">
                          {n}
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

      {/* MODAL: Create New Commercial Account */}
      {isCreateSalesModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 max-w-md w-full p-6 rounded-3xl flex flex-col gap-4 animate-fade-in shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Icons.UserPlus size={18} className="text-orange-500" />
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase">
                  Créer un Compte Commercial
                </h3>
              </div>
              <button
                onClick={() => setIsCreateSalesModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <Icons.Close size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSalesperson} className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-zinc-600 dark:text-zinc-400">Prénom *</label>
                  <input
                    type="text"
                    placeholder="Dieudonné"
                    value={newSalesFirstName}
                    onChange={(e) => setNewSalesFirstName(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-zinc-600 dark:text-zinc-400">Nom *</label>
                  <input
                    type="text"
                    placeholder="Mukendi"
                    value={newSalesLastName}
                    onChange={(e) => setNewSalesLastName(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-600 dark:text-zinc-400">Identifiant de connexion mobile *</label>
                <input
                  type="text"
                  placeholder="Ex: sales_mukendi"
                  value={newSalesUsername}
                  onChange={(e) => setNewSalesUsername(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl font-bold"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-600 dark:text-zinc-400">Mot de passe provisoire *</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newSalesPassword}
                  onChange={(e) => setNewSalesPassword(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-zinc-600 dark:text-zinc-400">Téléphone</label>
                  <input
                    type="text"
                    value={newSalesPhone}
                    onChange={(e) => setNewSalesPhone(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-zinc-600 dark:text-zinc-400">Ville</label>
                  <input
                    type="text"
                    value={newSalesLocation}
                    onChange={(e) => setNewSalesLocation(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-600 dark:text-zinc-400">Plaque d'affectation initiale</label>
                <select
                  value={newSalesPlaqueId}
                  onChange={(e) => setNewSalesPlaqueId(e.target.value ? Number(e.target.value) : '')}
                  className="px-3.5 py-2.5 rounded-xl cursor-pointer"
                >
                  <option value="">-- Aucune affectation immédiate --</option>
                  {plaques.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateSalesModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewSales}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingNewSales ? 'Création...' : 'Créer le Compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Revoke Commercial Confirmation */}
      {revokingSalesperson && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 max-w-md w-full p-6 rounded-3xl flex flex-col gap-4 animate-fade-in shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-2.5 bg-red-500/10 rounded-2xl">
                <Icons.Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase">
                  Révoquer ce Commercial ?
                </h3>
                <p className="text-xs text-zinc-500">
                  {revokingSalesperson.full_name} (@{revokingSalesperson.username})
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              Cette action supprimera le compte et révoquera immédiatement tous les jetons de session. Ce commercial <strong>ne pourra plus se connecter ni accéder aux données de l'application mobile Onbora</strong>.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setRevokingSalesperson(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleRevokeSalesperson}
                disabled={isRevoking}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer disabled:opacity-50"
              >
                {isRevoking ? 'Révocation...' : 'Confirmer la Révocation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Re-assign Commercials to Plaque */}
      {assigningPlaque && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 max-w-md w-full p-6 rounded-3xl flex flex-col gap-4 animate-fade-in shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase">
                  Affecter les Commerciaux
                </h3>
                <p className="text-xs text-zinc-500">
                  Plaque : <strong>{assigningPlaque.name} ({assigningPlaque.code})</strong>
                </p>
              </div>
              <button
                onClick={() => setAssigningPlaque(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <Icons.Close size={16} />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto flex flex-col gap-1.5 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 bg-zinc-50 dark:bg-zinc-950">
              {salespersons.map((s) => (
                <label key={s.id} className="flex items-center gap-2.5 cursor-pointer text-xs p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl">
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
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleAssignSalespersons}
                disabled={isSubmittingAssign}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 cursor-pointer disabled:opacity-50"
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
