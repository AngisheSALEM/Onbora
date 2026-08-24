"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import { Icons } from '@/components/shared/Icons';

export interface Plaque {
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
  boundary_geojson?: any;
  kml_data?: string;
  kml_url?: string;
}

export interface DrawnZone {
  id: string;
  code: string;
  name: string;
  color: string;
  lineWidth: number;
  points: [number, number][];
  areaKm2: number;
  center: [number, number];
  createdAt: string;
  isSaved?: boolean;
}

export interface Enterprise {
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

export interface Salesperson {
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

export interface RecentReport {
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

export interface NearbyLead {
  id: number;
  name: string;
  sector?: string;
  manager_name?: string;
  phone?: string;
  proximity_notes?: string;
  photo_url?: string;
  latitude: number;
  longitude: number;
  status?: string;
  source_enterprise_name?: string;
  created_at: string;
}

export interface TradeAudit {
  id: number;
  enterprise_name: string;
  competitor_name: string;
  satisfaction_score: number;
  friction_reasons?: string[];
  contract_end_date?: string;
  monthly_spend_estimated?: string;
  is_priority_friction_alert: boolean;
  alert_notes?: string;
  created_at: string;
}

export interface LeaderboardEntry {
  salesperson_id: number;
  salesperson_name: string;
  fullName: string;
  total_points: number;
  successful_conversions_count: number;
  nearby_leads_count: number;
  referrals_count: number;
  trade_audits_count: number;
  rank: number;
}

interface SupervisorTerritoryMapProps {
  plaques: Plaque[];
  enterprises: Enterprise[];
  salespersons: Salesperson[];
  recentReports: RecentReport[];
  nearbyLeads?: NearbyLead[];
  tradeAudits?: TradeAudit[];
  leaderboard?: LeaderboardEntry[];
  onPlaqueCreated: () => void;
  onSalespersonAssigned: () => void;
  onSalespersonChanged: () => void;
}

export default function SupervisorTerritoryMap({
  plaques,
  enterprises,
  salespersons,
  recentReports,
  nearbyLeads: initialNearbyLeads,
  tradeAudits: initialTradeAudits,
  leaderboard: initialLeaderboard,
  onPlaqueCreated,
  onSalespersonAssigned,
  onSalespersonChanged,
}: SupervisorTerritoryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Navigation sub-tab
  const [activeTab, setActiveTab] = useState<'map' | 'salespersons' | 'reports' | 'field_intel'>('map');

  // Marker Category Filter
  const [markerFilter, setMarkerFilter] = useState<'ALL' | 'CONVERTED' | 'NEARBY' | 'FRICTION'>('ALL');

  // Selected Entities
  const [selectedEnterprise, setSelectedEnterprise] = useState<Enterprise | null>(null);
  const [selectedPlaque, setSelectedPlaque] = useState<Plaque | null>(null);
  const [selectedNearbyLead, setSelectedNearbyLead] = useState<NearbyLead | null>(null);
  const [selectedTradeAudit, setSelectedTradeAudit] = useState<TradeAudit | null>(null);

  // Field Intelligence State
  const [nearbyLeads, setNearbyLeads] = useState<NearbyLead[]>(initialNearbyLeads || []);
  const [tradeAudits, setTradeAudits] = useState<TradeAudit[]>(initialTradeAudits || []);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initialLeaderboard || []);
  const [loadingFieldIntel, setLoadingFieldIntel] = useState(false);

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

  // Interactive Multi-Zone Polygon / KML Drawing Mode (Continuous Paint Pencil)
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const isDrawingModeRef = useRef(false);
  const [drawColor, setDrawColor] = useState('#2563EB'); // Default electric blue
  const [drawLineWidth, setDrawLineWidth] = useState(4); // 2, 4, 8 px
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingCanvasMouseDown = useRef(false);
  const canvasPointsRef = useRef<{ x: number; y: number; lng: number; lat: number }[]>([]);
  const [drawnZones, setDrawnZones] = useState<DrawnZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [activeZoneToAssign, setActiveZoneToAssign] = useState<DrawnZone | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [isSaveDrawnModalOpen, setIsSaveDrawnModalOpen] = useState(false);
  const [drawnPlaqueCode, setDrawnPlaqueCode] = useState('');
  const [drawnPlaqueName, setDrawnPlaqueName] = useState('');
  const [drawnPlaqueCity, setDrawnPlaqueCity] = useState('Kinshasa');
  const [drawnSalespersonIds, setDrawnSalespersonIds] = useState<number[]>([]);
  const [isSavingDrawnPlaque, setIsSavingDrawnPlaque] = useState(false);

  // Fetch Field Intelligence Data from Django Backend
  const loadFieldIntelligence = useCallback(async () => {
    setLoadingFieldIntel(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Token ${token}` };

      const [nearbyRes, auditsRes, boardRes] = await Promise.all([
        fetch(`${API_URL}/api/sales/field-intelligence/nearby-leads/`, { headers }).catch(() => null),
        fetch(`${API_URL}/api/sales/field-intelligence/trade-audits/`, { headers }).catch(() => null),
        fetch(`${API_URL}/api/sales/field-intelligence/leaderboard/`, { headers }).catch(() => null),
      ]);

      if (nearbyRes && nearbyRes.ok) {
        const data = await nearbyRes.json();
        setNearbyLeads(Array.isArray(data) ? data : []);
      }
      if (auditsRes && auditsRes.ok) {
        const data = await auditsRes.json();
        setTradeAudits(Array.isArray(data) ? data : []);
      }
      if (boardRes && boardRes.ok) {
        const data = await boardRes.json();
        setLeaderboard(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Erreur chargement Field Intelligence:", err);
    } finally {
      setLoadingFieldIntel(false);
    }
  }, []);

  useEffect(() => {
    loadFieldIntelligence();
  }, [loadFieldIntelligence]);

  // OpenStreetMap tile style (zero key required)
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
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
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
      center: [15.3084, -4.3033], // Kinshasa
      zoom: 12.5,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    mapRef.current = map;

    map.on('click', (e) => {
      if (!isDrawingModeRef.current) {
        setNewPlaqueLat(parseFloat(e.lngLat.lat.toFixed(5)));
        setNewPlaqueLng(parseFloat(e.lngLat.lng.toFixed(5)));
      }
    });

    return () => {
      map.remove();
    };
  }, []);

  // Helper for Hex to RGBA
  const hexToRgba = (hex: string, alpha: number) => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) || 37;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 99;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 235;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Helper for KML AABBGGRR color format
  const hexToKmlColor = (hex: string, alphaHex = '80'): string => {
    const cleanHex = hex.replace('#', '');
    const r = cleanHex.substring(0, 2);
    const g = cleanHex.substring(2, 4);
    const b = cleanHex.substring(4, 6);
    return `${alphaHex}${b}${g}${r}`;
  };

  // Canvas Setup & Resize on Drawing Mode Toggle
  useEffect(() => {
    isDrawingModeRef.current = isDrawingMode;
    const map = mapRef.current;
    if (map) {
      if (isDrawingMode) {
        map.dragPan.disable();
        map.touchZoomRotate.disable();
      } else {
        map.dragPan.enable();
        map.touchZoomRotate.enable();
      }
    }

    if (!isDrawingMode || !drawingCanvasRef.current || !mapContainerRef.current) return;
    const canvas = drawingCanvasRef.current;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [isDrawingMode]);

  // Canvas Mouse & Touch Drawing Handlers (Instant Real-Time Canvas 2D)
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawingCanvasRef.current;
    const map = mapRef.current;
    if (!canvas || !map) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isDrawingCanvasMouseDown.current = true;
    const lngLat = map.unproject([x, y]);

    canvasPointsRef.current = [{
      x,
      y,
      lng: parseFloat(lngLat.lng.toFixed(5)),
      lat: parseFloat(lngLat.lat.toFixed(5)),
    }];

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.beginPath();
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawLineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(x, y);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingCanvasMouseDown.current) return;
    const canvas = drawingCanvasRef.current;
    const map = mapRef.current;
    if (!canvas || !map) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pts = canvasPointsRef.current;
    if (pts.length > 0) {
      const last = pts[pts.length - 1];
      const dist = Math.hypot(x - last.x, y - last.y);
      if (dist < 2) return;
    }

    const lngLat = map.unproject([x, y]);
    canvasPointsRef.current.push({
      x,
      y,
      lng: parseFloat(lngLat.lng.toFixed(5)),
      lat: parseFloat(lngLat.lat.toFixed(5)),
    });

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  // Shoelace formula to calculate real-world polygon surface area (km²)
  const calculatePolygonAreaKm2 = (points: [number, number][]): number => {
    if (points.length < 3) return 0;
    let area = 0;
    const n = points.length;
    const latFactor = 111.132;
    const lngFactor = 111.320 * Math.cos(-4.3033 * (Math.PI / 180));

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const xi = points[i][0] * lngFactor;
      const yi = points[i][1] * latFactor;
      const xj = points[j][0] * lngFactor;
      const yj = points[j][1] * latFactor;
      area += xi * yj - xj * yi;
    }
    return Math.abs(area / 2);
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawingCanvasMouseDown.current) return;
    isDrawingCanvasMouseDown.current = false;

    const canvas = drawingCanvasRef.current;
    const pts = canvasPointsRef.current;

    if (canvas && pts.length >= 3) {
      // Convert to GPS coordinates array
      const gpsPoints: [number, number][] = pts.map((p) => [p.lng, p.lat]);
      if (gpsPoints[0][0] !== gpsPoints[gpsPoints.length - 1][0] || gpsPoints[0][1] !== gpsPoints[gpsPoints.length - 1][1]) {
        gpsPoints.push(gpsPoints[0]);
      }

      // Calculate centroid and area
      const avgLng = parseFloat((gpsPoints.reduce((sum, p) => sum + p[0], 0) / gpsPoints.length).toFixed(5));
      const avgLat = parseFloat((gpsPoints.reduce((sum, p) => sum + p[1], 0) / gpsPoints.length).toFixed(5));
      const area = calculatePolygonAreaKm2(gpsPoints);

      const zoneIndex = drawnZones.length + 1;
      const newZone: DrawnZone = {
        id: `zone-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        code: `KIN-ZONE-${String(zoneIndex).padStart(2, '0')}`,
        name: `Zone Délimitée ${zoneIndex}`,
        color: drawColor,
        lineWidth: drawLineWidth,
        points: gpsPoints,
        areaKm2: area,
        center: [avgLng, avgLat],
        createdAt: new Date().toISOString(),
      };

      setDrawnZones((prev) => [...prev, newZone]);
      setSelectedZoneId(newZone.id);
      setDrawingPoints(gpsPoints);
      setStatusMessage({
        text: `Zone ${newZone.code} (${newZone.areaKm2.toFixed(2)} km²) ajoutée sur la carte. Vous pouvez enchaîner d'autres tracés.`,
        type: 'success',
      });

      // Clear the temporary HTML5 canvas so the user can immediately chain the next drawing!
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
      canvasPointsRef.current = [];
    } else {
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
      canvasPointsRef.current = [];
    }
  };

  const handleDeleteZone = (zoneId: string) => {
    setDrawnZones((prev) => prev.filter((z) => z.id !== zoneId));
    if (selectedZoneId === zoneId) setSelectedZoneId(null);
    setStatusMessage({ text: "Zone supprimée de la carte.", type: 'success' });
  };

  const handleClearAllZones = () => {
    setDrawnZones([]);
    setSelectedZoneId(null);
    setDrawingPoints([]);
    handleClearDrawing();
    setStatusMessage({ text: "Toutes les zones dessinées ont été effacées.", type: 'success' });
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const canvas = drawingCanvasRef.current;
    const map = mapRef.current;
    if (!canvas || !map) return;

    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    isDrawingCanvasMouseDown.current = true;
    const lngLat = map.unproject([x, y]);

    canvasPointsRef.current = [{
      x,
      y,
      lng: parseFloat(lngLat.lng.toFixed(5)),
      lat: parseFloat(lngLat.lat.toFixed(5)),
    }];

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.beginPath();
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawLineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(x, y);
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingCanvasMouseDown.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const canvas = drawingCanvasRef.current;
    const map = mapRef.current;
    if (!canvas || !map) return;

    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const pts = canvasPointsRef.current;
    if (pts.length > 0) {
      const last = pts[pts.length - 1];
      const dist = Math.hypot(x - last.x, y - last.y);
      if (dist < 2) return;
    }

    const lngLat = map.unproject([x, y]);
    canvasPointsRef.current.push({
      x,
      y,
      lng: parseFloat(lngLat.lng.toFixed(5)),
      lat: parseFloat(lngLat.lat.toFixed(5)),
    });

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handleClearDrawing = () => {
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    }
    canvasPointsRef.current = [];
    setDrawingPoints([]);
  };

  // Update Markers on Map with 3 Key Categories
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 1. Enterprise Lead Markers (🟢 Green = Converted/Ready, ⚪ To Prospect)
    if (markerFilter === 'ALL' || markerFilter === 'CONVERTED') {
      enterprises.forEach((ent) => {
        if (!ent.latitude || !ent.longitude) return;

        const isReady = ent.is_ready_for_conversion;
        if (markerFilter === 'CONVERTED' && !isReady) return;

        const markerColor = isReady ? '#10B981' : '#64748B';

        const el = document.createElement('div');
        el.className = 'cursor-pointer transform hover:scale-125 transition-transform duration-150 group';
        el.innerHTML = `
          <div style="background-color: ${markerColor}; width: 24px; height: 24px; border-radius: 50%; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; position: relative;">
            <div style="background-color: #FFFFFF; width: 6px; height: 6px; border-radius: 50%;"></div>
            ${isReady ? '<div style="position: absolute; top: -3px; right: -3px; width: 8px; height: 8px; border-radius: 50%; background-color: #10B981; border: 1.5px solid white;"></div>' : ''}
          </div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedNearbyLead(null);
          setSelectedTradeAudit(null);
          setSelectedEnterprise(ent);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([ent.longitude, ent.latitude])
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

    // 2. Lookalike 100m Nearby Leads (🔵 Electric Blue `#2563EB`)
    if (markerFilter === 'ALL' || markerFilter === 'NEARBY') {
      nearbyLeads.forEach((lead) => {
        if (!lead.latitude || !lead.longitude) return;

        const el = document.createElement('div');
        el.className = 'cursor-pointer transform hover:scale-125 transition-transform duration-150';
        el.innerHTML = `
          <div style="background-color: #2563EB; width: 26px; height: 26px; border-radius: 50%; border: 2.5px solid #FFFFFF; box-shadow: 0 0 14px rgba(37,99,235,0.6); display: flex; align-items: center; justify-content: center; position: relative;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span style="position: absolute; top: -5px; right: -5px; background: #10B981; color: white; font-size: 8px; font-weight: 900; padding: 1px 4px; border-radius: 6px; border: 1px solid white;">100m</span>
          </div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedEnterprise(null);
          setSelectedTradeAudit(null);
          setSelectedNearbyLead(lead);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lead.longitude, lead.latitude])
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

    // 3. Competitor Friction Alerts (🔴 Red `#EF4444` SQL Prioritaire KAM)
    if (markerFilter === 'ALL' || markerFilter === 'FRICTION') {
      tradeAudits
        .filter((a) => a.is_priority_friction_alert)
        .forEach((audit) => {
          const matchedEnt = enterprises.find((e) => e.name.toLowerCase() === audit.enterprise_name.toLowerCase());
          const lat = matchedEnt ? matchedEnt.latitude + 0.0008 : -4.3033;
          const lng = matchedEnt ? matchedEnt.longitude + 0.0008 : 15.3084;

          const el = document.createElement('div');
          el.className = 'cursor-pointer transform hover:scale-125 transition-transform duration-150 animate-bounce';
          el.innerHTML = `
            <div style="background-color: #EF4444; width: 28px; height: 28px; border-radius: 50%; border: 2.5px solid #FFFFFF; box-shadow: 0 0 16px rgba(239,68,68,0.7); display: flex; align-items: center; justify-content: center; position: relative;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span style="position: absolute; top: -5px; right: -5px; background: #B91C1C; color: white; font-size: 8px; font-weight: 900; padding: 1px 3px; border-radius: 6px; border: 1px solid white;">KAM</span>
            </div>
          `;

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            setSelectedEnterprise(null);
            setSelectedNearbyLead(null);
            setSelectedTradeAudit(audit);
          });

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(map);

          markersRef.current.push(marker);
        });
    }

    // 4. Plaque Territorial Center Markers
    plaques.forEach((p) => {
      if (!p.latitude || !p.longitude) return;

      const el = document.createElement('div');
      el.className = 'cursor-pointer transform hover:scale-110 transition-transform duration-150';
      el.innerHTML = `
        <div style="background: rgba(37, 99, 235, 0.16); border: 2px solid #2563EB; border-radius: 9999px; padding: 4px 10px; backdrop-filter: blur(8px); display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 14px rgba(37,99,235,0.25);">
          <div style="width: 8px; height: 8px; border-radius: 50%; background-color: #2563EB;"></div>
          <span style="font-size: 11px; font-weight: 800; color: #2563EB; letter-spacing: 0.3px;">${p.code}</span>
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
  }, [enterprises, plaques, nearbyLeads, tradeAudits, markerFilter]);

  // Render Multi-Zones & Saved Plaque Polygons on MapLibre
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateDrawingLayers = () => {
      // 1. Convert all drawnZones to GeoJSON Features
      const drawnZoneFeatures: GeoJSON.Feature[] = drawnZones.map((z) => {
        const closed = [...z.points];
        if (closed.length > 0 && (closed[0][0] !== closed[closed.length - 1][0] || closed[0][1] !== closed[closed.length - 1][1])) {
          closed.push(closed[0]);
        }
        return {
          type: 'Feature' as const,
          properties: {
            id: z.id,
            code: z.code,
            name: z.name,
            color: z.color || '#2563EB',
            lineWidth: z.lineWidth || 4,
            areaKm2: z.areaKm2.toFixed(2),
            isSelected: z.id === selectedZoneId,
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [closed],
          },
        };
      });

      const drawingGeojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: drawnZoneFeatures,
      };

      const drawingSource = map.getSource('drawing-source') as maplibregl.GeoJSONSource | undefined;
      if (drawingSource) {
        drawingSource.setData(drawingGeojson);
      } else if (map.isStyleLoaded()) {
        map.addSource('drawing-source', {
          type: 'geojson',
          data: drawingGeojson,
        });

        map.addLayer({
          id: 'drawing-fill',
          type: 'fill',
          source: 'drawing-source',
          paint: {
            'fill-color': ['coalesce', ['get', 'color'], '#2563EB'],
            'fill-opacity': ['case', ['boolean', ['get', 'isSelected'], false], 0.40, 0.25],
          },
        });

        map.addLayer({
          id: 'drawing-line',
          type: 'line',
          source: 'drawing-source',
          paint: {
            'line-color': ['coalesce', ['get', 'color'], '#2563EB'],
            'line-width': ['case', ['boolean', ['get', 'isSelected'], false], 5.5, ['coalesce', ['get', 'lineWidth'], 4]],
            'line-opacity': 0.95,
          },
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
        });
      }

      // 2. Update Saved Plaque Polygons
      const plaqueFeatures = plaques
        .filter((p) => p.boundary_geojson && p.boundary_geojson.coordinates)
        .map((p) => ({
          type: 'Feature' as const,
          properties: { id: p.id, code: p.code, name: p.name },
          geometry: p.boundary_geojson,
        }));

      const plaquesGeojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: plaqueFeatures,
      };

      const savedSource = map.getSource('saved-plaques-source') as maplibregl.GeoJSONSource | undefined;
      if (savedSource) {
        savedSource.setData(plaquesGeojson);
      } else if (map.isStyleLoaded() && plaqueFeatures.length > 0) {
        map.addSource('saved-plaques-source', {
          type: 'geojson',
          data: plaquesGeojson,
        });

        map.addLayer({
          id: 'saved-plaques-fill',
          type: 'fill',
          source: 'saved-plaques-source',
          paint: {
            'fill-color': '#2563EB',
            'fill-opacity': 0.12,
          },
        });

        map.addLayer({
          id: 'saved-plaques-line',
          type: 'line',
          source: 'saved-plaques-source',
          paint: {
            'line-color': '#2563EB',
            'line-width': 2,
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      updateDrawingLayers();
    } else {
      map.once('load', updateDrawingLayers);
    }
  }, [drawnZones, selectedZoneId, plaques]);

  // Multi-Zone KML Generation
  const generateMultiZoneKmlString = (zones: DrawnZone[]) => {
    if (zones.length === 0) return '';
    const stylesXml = zones.map((z) => {
      const cleanId = z.id.replace(/[^a-zA-Z0-9_]/g, '_');
      return `
    <Style id="style_${cleanId}">
      <LineStyle><color>${hexToKmlColor(z.color, 'ff')}</color><width>${z.lineWidth || 4}</width></LineStyle>
      <PolyStyle><color>${hexToKmlColor(z.color, '40')}</color><fill>1</fill><outline>1</outline></PolyStyle>
    </Style>`;
    }).join('\n');

    const placemarksXml = zones.map((z) => {
      const cleanId = z.id.replace(/[^a-zA-Z0-9_]/g, '_');
      const closed = [...z.points];
      if (closed.length > 0 && (closed[0][0] !== closed[closed.length - 1][0] || closed[0][1] !== closed[closed.length - 1][1])) {
        closed.push(closed[0]);
      }
      const coordsStr = closed.map((p) => `${p[0]},${p[1]},0`).join(' ');
      return `
    <Placemark>
      <name>${z.code} - ${z.name}</name>
      <description>Zone commerciale Onbora (${z.points.length} points GPS - ${z.areaKm2.toFixed(2)} km²)</description>
      <styleUrl>#style_${cleanId}</styleUrl>
      <Polygon>
        <extrude>1</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordsStr}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Territoires Commerciaux Onbora (${zones.length} zones)</name>
    <description>Tracé vectoriel KML multi-zones - Onbora Telecom Intelligence</description>
    ${stylesXml}
    ${placemarksXml}
  </Document>
</kml>`;
  };

  // Single Zone KML Generation
  const generateKmlString = (points: [number, number][], name: string, code: string, colorHex = drawColor) => {
    const closed = [...points];
    if (closed.length > 0 && (closed[0][0] !== closed[closed.length - 1][0] || closed[0][1] !== closed[closed.length - 1][1])) {
      closed.push(closed[0]);
    }
    const coordsStr = closed.map((p) => `${p[0]},${p[1]},0`).join(' ');
    const kmlLineColor = hexToKmlColor(colorHex, 'ff');
    const kmlPolyColor = hexToKmlColor(colorHex, '40');
    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${name || 'Plaque'} (${code || 'ZONE'})</name>
    <description>Périmètre commercial Onbora pour ${name} - Tracé vectoriel</description>
    <Style id="plaqueStyle">
      <LineStyle><color>${kmlLineColor}</color><width>${drawLineWidth}</width></LineStyle>
      <PolyStyle><color>${kmlPolyColor}</color><fill>1</fill><outline>1</outline></PolyStyle>
    </Style>
    <Placemark>
      <name>${code || 'ZONE'}</name>
      <styleUrl>#plaqueStyle</styleUrl>
      <Polygon>
        <extrude>1</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordsStr}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;
  };

  const handleDownloadAllKml = () => {
    if (drawnZones.length === 0) {
      setStatusMessage({ text: "Tracez au moins une zone sur la carte avant d'exporter.", type: 'error' });
      return;
    }
    const kml = generateMultiZoneKmlString(drawnZones);
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `territoires_onbora_multi_zones_${drawnZones.length}.kml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage({ text: `Fichier KML consolidé (${drawnZones.length} zones) téléchargé avec succès.`, type: 'success' });
  };

  const handleDownloadKml = (points: [number, number][], name: string, code: string, colorHex = drawColor) => {
    if (points.length < 3) {
      setStatusMessage({ text: "Tracez au moins 3 points sur la carte pour exporter le fichier KML.", type: 'error' });
      return;
    }
    const kml = generateKmlString(points, name, code, colorHex);
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${code || 'zone_plaque'}.kml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage({ text: `Fichier KML (${code || 'zone'}.kml) téléchargé avec succès.`, type: 'success' });
  };

  const handleOpenAssignModalForZone = (zone: DrawnZone) => {
    setActiveZoneToAssign(zone);
    setDrawnPlaqueCode(zone.code);
    setDrawnPlaqueName(zone.name);
    setDrawnPlaqueCity('Kinshasa');
    setDrawingPoints(zone.points);
    setIsSaveDrawnModalOpen(true);
  };

  const handleSaveDrawnPlaque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawnPlaqueCode || !drawnPlaqueName || drawingPoints.length < 3) {
      setStatusMessage({ text: "Veuillez tracer au moins 3 points et renseigner le code et le nom.", type: 'error' });
      return;
    }

    setIsSavingDrawnPlaque(true);
    setStatusMessage(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token');

      // Calculate centroid
      const avgLng = drawingPoints.reduce((sum, p) => sum + p[0], 0) / drawingPoints.length;
      const avgLat = drawingPoints.reduce((sum, p) => sum + p[1], 0) / drawingPoints.length;

      const closed = [...drawingPoints];
      if (closed[0][0] !== closed[closed.length - 1][0] || closed[0][1] !== closed[closed.length - 1][1]) {
        closed.push(closed[0]);
      }

      const boundaryGeojson = {
        type: 'Polygon',
        coordinates: [closed],
      };

      const kmlData = generateKmlString(drawingPoints, drawnPlaqueName, drawnPlaqueCode);

      const res = await fetch(`${API_URL}/api/sales/plaques/draw-zone/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          code: drawnPlaqueCode.trim().toUpperCase(),
          name: drawnPlaqueName.trim(),
          city: drawnPlaqueCity.trim(),
          latitude: parseFloat(avgLat.toFixed(5)),
          longitude: parseFloat(avgLng.toFixed(5)),
          radius_km: 5.0,
          boundary_geojson: boundaryGeojson,
          kml_data: kmlData,
          salesperson_ids: drawnSalespersonIds,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Erreur lors de l'enregistrement de la zone");
      }

      setStatusMessage({
        text: `Zone tracée '${drawnPlaqueCode}' enregistrée avec succès. KML généré et ${drawnSalespersonIds.length} commercial(aux) notifié(s) dans leur application mobile !`,
        type: 'success',
      });

      setIsSaveDrawnModalOpen(false);
      setIsDrawingMode(false);
      setDrawingPoints([]);
      setDrawnPlaqueCode('');
      setDrawnPlaqueName('');
      setDrawnSalespersonIds([]);
      onPlaqueCreated();
      if (drawnSalespersonIds.length > 0) onSalespersonAssigned();
    } catch (err: any) {
      setStatusMessage({ text: `Erreur: ${err.message}`, type: 'error' });
    } finally {
      setIsSavingDrawnPlaque(false);
    }
  };

  // Handlers for Plaque Creation, Assignment, and Sales Creation
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
      setStatusMessage({ text: `Erreur: ${err.message}`, type: 'error' });
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const handleCreateSalesperson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSalesUsername || !newSalesPassword || !newSalesFirstName || !newSalesLastName) {
      setStatusMessage({ text: "Veuillez renseigner tous les champs obligatoires (*)", type: 'error' });
      return;
    }

    setIsSubmittingNewSales(true);
    setStatusMessage(null);

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
          username: newSalesUsername.trim(),
          password: newSalesPassword,
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
      setStatusMessage({ text: `Erreur création commercial: ${err.message}`, type: 'error' });
    } finally {
      setIsSubmittingNewSales(false);
    }
  };

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
      setStatusMessage({ text: `Erreur: ${err.message}`, type: 'error' });
    } finally {
      setIsRevoking(false);
    }
  };

  const flyTo = (lng: number, lat: number, zoom = 13.5) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, essential: true });
  };

  const readyEnterprisesCount = enterprises.filter((e) => e.is_ready_for_conversion).length;
  const priorityFrictionsCount = tradeAudits.filter((a) => a.is_priority_friction_alert).length;

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in font-sans">
      {/* Toast Notification */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold ${
          statusMessage.type === 'success' ? 'badge-success border-none' : 'badge-error border-none'
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

      {/* Top Metric Strip with Field Intelligence KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="studio-card p-6 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Plaques Ouvertes</span>
            <Icons.Layers size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-3xl font-black text-zinc-950 dark:text-white mt-1">{plaques.length}</span>
          <p className="text-[11px] text-zinc-600 dark:text-gray-300 font-medium">Secteurs délimités par le back-office</p>
        </div>

        <div className="studio-card p-6 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Pré-conversions 🟢</span>
            <Icons.CheckCircle size={18} className="text-emerald-500" />
          </div>
          <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {readyEnterprisesCount}
          </span>
          <p className="text-[11px] text-zinc-600 dark:text-gray-300 font-medium">Dossiers signés & prêts pour l'ADV</p>
        </div>

        <div className="studio-card p-6 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Lookalike 100m 🔵</span>
            <Icons.MapPin size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {nearbyLeads.length}
          </span>
          <p className="text-[11px] text-zinc-600 dark:text-gray-300 font-medium">Voisins repérés par la force de vente</p>
        </div>

        <div className="studio-card p-6 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Radar Frictions 🔴</span>
            <Icons.AlertTriangle size={18} className="text-red-500" />
          </div>
          <span className="text-3xl font-black text-red-600 dark:text-red-400 mt-1">
            {priorityFrictionsCount}
          </span>
          <p className="text-[11px] text-zinc-600 dark:text-gray-300 font-medium">Alertes SQL prioritaires pour les KAMs</p>
        </div>
      </div>

      {/* Segmented Navigation Bar */}
      <div className="studio-subcard p-2 rounded-[20px] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'map'
                ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.20)]'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Icons.Map size={14} /> Territoires & Carte Vectorielle
          </button>
          <button
            onClick={() => setActiveTab('salespersons')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'salespersons'
                ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.20)]'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Icons.Users size={14} /> Effectif Commercial ({salespersons.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.20)]'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Icons.Activity size={14} /> Rapports Reçus ({recentReports.length})
          </button>
          <button
            onClick={() => setActiveTab('field_intel')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'field_intel'
                ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.20)]'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Icons.Award size={14} /> Field Intelligence & Dénicheurs ({leaderboard.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'map' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsDrawingMode(!isDrawingMode);
                  if (isDelimiting) setIsDelimiting(false);
                }}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                  isDrawingMode
                    ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-blue-600 hover:text-white'
                }`}
              >
                <Icons.Edit size={14} />
                {isDrawingMode ? 'Mode Tracé Actif' : 'Tracer une Zone (KML)'}
              </button>

              <button
                onClick={() => {
                  setIsDelimiting(!isDelimiting);
                  if (isDrawingMode) setIsDrawingMode(false);
                }}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border-none ${
                  isDelimiting
                    ? 'bg-red-500/15 text-red-500'
                    : 'btn-primary-cta shadow-sm'
                }`}
              >
                <Icons.Crosshair size={14} />
                {isDelimiting ? 'Fermer Délimitation' : 'Délimiter une Plaque'}
              </button>
            </div>
          )}

          {activeTab === 'salespersons' && (
            <button
              onClick={() => setIsCreateSalesModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.20)]"
            >
              <Icons.UserPlus size={14} /> Créer un Compte Commercial
            </button>
          )}

          {activeTab === 'field_intel' && (
            <button
              onClick={loadFieldIntelligence}
              disabled={loadingFieldIntel}
              className="px-4 py-2.5 rounded-2xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.20)]"
            >
              <Icons.RefreshCw size={14} className={loadingFieldIntel ? 'animate-spin' : ''} /> Actualiser
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: Territoires & Carte */}
      {activeTab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Vector Map Frame */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            {/* Quick Sector Jumps & Interactive Marker Filter Bar */}
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider flex items-center gap-1 mr-1">
                  <Icons.Filter size={12} /> Marqueurs :
                </span>
                <button
                  onClick={() => setMarkerFilter('ALL')}
                  className={`px-3 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer ${
                    markerFilter === 'ALL'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300'
                  }`}
                >
                  Tous ({enterprises.length + nearbyLeads.length + priorityFrictionsCount})
                </button>
                <button
                  onClick={() => setMarkerFilter('CONVERTED')}
                  className={`px-3 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                    markerFilter === 'CONVERTED'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Pré-convertis ({readyEnterprisesCount})
                </button>
                <button
                  onClick={() => setMarkerFilter('NEARBY')}
                  className={`px-3 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                    markerFilter === 'NEARBY'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  Voisins 100m ({nearbyLeads.length})
                </button>
                <button
                  onClick={() => setMarkerFilter('FRICTION')}
                  className={`px-3 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                    markerFilter === 'FRICTION'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-600"></span>
                  Frictions KAM ({priorityFrictionsCount})
                </button>
              </div>

              {/* Quick Jump Buttons */}
              <div className="flex gap-1.5 items-center">
                <button
                  onClick={() => flyTo(15.3084, -4.3033)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
                >
                  Gombe
                </button>
                <button
                  onClick={() => flyTo(15.3400, -4.3450)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
                >
                  Limete
                </button>
              </div>
            </div>

            {/* Map Container */}
            <div className="relative w-full h-[540px] rounded-[22px] overflow-hidden shadow-sm bg-zinc-950">
              <div ref={mapContainerRef} className="w-full h-full" />

              {/* Dedicated High-Performance HTML5 Painting Canvas Overlay */}
              {isDrawingMode && (
                <canvas
                  ref={drawingCanvasRef}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  onTouchStart={handleCanvasTouchStart}
                  onTouchMove={handleCanvasTouchMove}
                  onTouchEnd={handleCanvasMouseUp}
                  className="absolute inset-0 w-full h-full z-20 cursor-crosshair touch-none"
                />
              )}

              {/* Map Legend Overlay */}
              {!isDrawingMode && (
                <div className="absolute top-4 left-4 bg-white/95 dark:bg-[#1C1C22]/95 backdrop-blur-md px-4 py-3 rounded-[18px] shadow-lg flex flex-col gap-2 z-10 text-[11px]">
                  <span className="font-black text-zinc-950 dark:text-white uppercase tracking-wider text-[10px]">
                    Légende Onbora Map
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1C1C22]" />
                    <span className="font-semibold text-zinc-800 dark:text-gray-300">Client Pré-converti (ADV)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white dark:border-[#1C1C22]" />
                    <span className="font-semibold text-zinc-800 dark:text-gray-300">Lead Voisin 100m (Lookalike)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 border-2 border-white dark:border-[#1C1C22]" />
                    <span className="font-semibold text-zinc-800 dark:text-gray-300">Alerte Friction Concurrent (SQL KAM)</span>
                  </div>
                </div>
              )}

              {/* Floating Drawing Toolbar (Continuous Multi-Zone Paint Mode) */}
              {isDrawingMode && (
                <div className="absolute top-4 left-4 right-4 bg-white/95 dark:bg-[#1C1C22]/95 backdrop-blur-md px-4 py-3 rounded-[20px] shadow-2xl flex flex-wrap items-center justify-between gap-3 z-30 border border-blue-600/30 animate-fade-in">
                  {/* Left: Info & Color Palette */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-black text-zinc-950 dark:text-white">
                      <span className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: drawColor }} />
                      <span>
                        ✏️ Mode Crayon : {drawnZones.length === 0 ? 'Maintenez le clic et tracez votre 1ère zone' : `${drawnZones.length} zone(s) sur la carte`}
                      </span>
                    </div>

                    {/* Color Swatches */}
                    <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
                      <span className="text-[10px] font-bold text-zinc-500 mr-1 hidden sm:inline">Couleur :</span>
                      {[
                        { color: '#2563EB', name: 'Bleu' },
                        { color: '#EA580C', name: 'Orange' },
                        { color: '#10B981', name: 'Vert' },
                        { color: '#8B5CF6', name: 'Violet' },
                        { color: '#EF4444', name: 'Rouge' },
                        { color: '#F59E0B', name: 'Jaune' },
                      ].map((c) => (
                        <button
                          key={c.color}
                          type="button"
                          title={c.name}
                          onClick={() => setDrawColor(c.color)}
                          className={`w-5 h-5 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                            drawColor === c.color ? 'scale-125 ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-zinc-900 shadow-md' : 'hover:scale-110 opacity-75 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.color }}
                        />
                      ))}
                    </div>

                    {/* Stroke Width Selector */}
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
                      <span className="text-[10px] font-bold text-zinc-500 mx-1 hidden sm:inline">Taille :</span>
                      {[
                        { size: 2, label: 'Fin' },
                        { size: 4, label: 'Moyen' },
                        { size: 8, label: 'Épais' },
                      ].map((s) => (
                        <button
                          key={s.size}
                          type="button"
                          onClick={() => setDrawLineWidth(s.size)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            drawLineWidth === s.size
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearAllZones}
                      disabled={drawnZones.length === 0}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-200 dark:bg-zinc-800 hover:bg-red-500/20 hover:text-red-500 disabled:opacity-40 cursor-pointer transition-colors"
                    >
                      Tout Effacer
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadAllKml}
                      disabled={drawnZones.length === 0}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      <Icons.Download size={13} />
                      Export KML Multi ({drawnZones.length})
                    </button>
                    {drawnZones.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const lastZone = drawnZones[drawnZones.length - 1];
                          handleOpenAssignModalForZone(lastZone);
                        }}
                        className="px-4 py-1.5 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                      >
                        <Icons.CheckCircle size={13} />
                        Affecter & Notifier
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Floating Active Zones Manager */}
              {isDrawingMode && drawnZones.length > 0 && (
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-[#1C1C22]/95 backdrop-blur-md p-3 rounded-[20px] shadow-2xl flex flex-col gap-2 z-30 border border-zinc-200 dark:border-zinc-800 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Icons.Layers size={13} className="text-blue-600 dark:text-blue-400" />
                      Zones actives sur la carte ({drawnZones.length})
                    </span>
                    <span className="text-[10px] text-zinc-500 font-bold">
                      Surface totale : {drawnZones.reduce((sum, z) => sum + z.areaKm2, 0).toFixed(2)} km²
                    </span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {drawnZones.map((zone) => (
                      <div
                        key={zone.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
                          selectedZoneId === zone.id
                            ? 'bg-blue-500/15 border-blue-500 shadow-sm'
                            : 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedZoneId(zone.id);
                            mapRef.current?.flyTo({ center: zone.center, zoom: 14 });
                          }}
                          className="text-xs font-black text-zinc-900 dark:text-white cursor-pointer hover:underline"
                        >
                          {zone.code}
                        </button>
                        <span className="text-[10px] text-zinc-500 font-bold">
                          {zone.areaKm2.toFixed(2)} km²
                        </span>
                        <div className="flex items-center gap-1 border-l border-zinc-200 dark:border-zinc-700 pl-1.5 ml-0.5">
                          <button
                            type="button"
                            title="Télécharger le KML de cette zone"
                            onClick={() => handleDownloadKml(zone.points, zone.name, zone.code, zone.color)}
                            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-300 cursor-pointer"
                          >
                            <Icons.Download size={12} />
                          </button>
                          <button
                            type="button"
                            title="Affecter et notifier les commerciaux pour cette zone"
                            onClick={() => handleOpenAssignModalForZone(zone)}
                            className="p-1 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded cursor-pointer"
                          >
                            <Icons.UserCheck size={12} />
                          </button>
                          <button
                            type="button"
                            title="Supprimer cette zone de la carte"
                            onClick={() => handleDeleteZone(zone.id)}
                            className="p-1 hover:bg-red-500/20 text-red-500 rounded cursor-pointer"
                          >
                            <Icons.Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delimitation Banner */}
              {isDelimiting && (
                <div className="absolute bottom-4 left-4 right-4 bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center justify-between z-10 animate-fade-in">
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
              <div className="studio-card p-6 flex flex-col gap-4 shadow-sm animate-fade-in">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Icons.Target size={18} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-black uppercase text-zinc-950 dark:text-white">
                      Délimiter une Plaque
                    </h3>
                  </div>
                  <span className="text-[10px] bg-blue-600/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full font-extrabold">
                    Superviseur
                  </span>
                </div>

                <form onSubmit={handleCreatePlaque} className="flex flex-col gap-3 text-xs">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-zinc-700 dark:text-gray-300">Code de la plaque *</label>
                    <input
                      type="text"
                      placeholder="Ex: KIN-BANDAL"
                      value={newPlaqueCode}
                      onChange={(e) => setNewPlaqueCode(e.target.value)}
                      className="px-3.5 py-2.5 font-bold"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-zinc-700 dark:text-gray-300">Nom descriptif du secteur *</label>
                    <input
                      type="text"
                      placeholder="Ex: Kinshasa (Bandalungwa & Kasa-Vubu)"
                      value={newPlaqueName}
                      onChange={(e) => setNewPlaqueName(e.target.value)}
                      className="px-3.5 py-2.5"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-zinc-700 dark:text-gray-300">Ville</label>
                      <input
                        type="text"
                        value={newPlaqueCity}
                        onChange={(e) => setNewPlaqueCity(e.target.value)}
                        className="px-3.5 py-2.5"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-zinc-700 dark:text-gray-300">Rayon (km)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="30"
                        value={newPlaqueRadius}
                        onChange={(e) => setNewPlaqueRadius(parseFloat(e.target.value) || 5.0)}
                        className="px-3.5 py-2.5"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 mt-1">
                    <label className="font-bold text-zinc-700 dark:text-gray-300">
                      Affecter des commerciaux immédiatement
                    </label>
                    <div className="max-h-32 overflow-y-auto flex flex-col gap-1.5 studio-subcard p-2.5 rounded-xl">
                      {salespersons.length === 0 ? (
                        <span className="text-[10px] text-zinc-500">Aucun commercial actif</span>
                      ) : (
                        salespersons.map((s) => (
                          <label key={s.id} className="flex items-center gap-2 cursor-pointer text-xs p-1 hover:bg-white/40 dark:hover:bg-zinc-800 rounded-lg">
                            <input
                              type="checkbox"
                              checked={selectedSalespersonIds.includes(s.id)}
                              onChange={() => {
                                setSelectedSalespersonIds((prev) =>
                                  prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                                );
                              }}
                              className="accent-blue-600 rounded"
                            />
                            <span className="font-bold text-zinc-950 dark:text-white">{s.full_name}</span>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">(@{s.username})</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingPlaque}
                    className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs transition-all cursor-pointer disabled:opacity-50 shadow-[0_0_20px_rgba(37,99,235,0.20)] flex items-center justify-center gap-2"
                  >
                    <Icons.CheckCircle size={14} />
                    {isSubmittingPlaque ? 'Déploiement...' : 'Créer et Déployer la Plaque'}
                  </button>
                </form>
              </div>
            ) : selectedNearbyLead ? (
              /* 2. Selected Lookalike 100m Lead Inspector */
              <div className="studio-card p-6 flex flex-col gap-4 shadow-sm animate-fade-in border-2 border-blue-600/30">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider flex items-center gap-1">
                      <Icons.MapPin size={12} /> Lead Lookalike 100m
                    </span>
                    <h3 className="text-base font-black text-zinc-950 dark:text-white">{selectedNearbyLead.name}</h3>
                    <p className="text-xs text-zinc-600 dark:text-gray-300">{selectedNearbyLead.sector || 'Commerce / PME'}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-blue-600/15 text-blue-600 dark:text-blue-400">
                    Nouveau
                  </span>
                </div>

                <div className="studio-subcard p-3 rounded-2xl flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-bold text-[10px] uppercase">Gérant / Contact :</span>
                    <span className="font-extrabold text-zinc-950 dark:text-white">{selectedNearbyLead.manager_name || 'Non précisé'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-bold text-[10px] uppercase">Téléphone Direct :</span>
                    <span className="font-extrabold text-blue-600 dark:text-blue-400">{selectedNearbyLead.phone || 'Non renseigné'}</span>
                  </div>
                  {selectedNearbyLead.proximity_notes && (
                    <div className="mt-1 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <span className="text-zinc-500 font-bold text-[10px] uppercase block mb-0.5">Repères géographiques :</span>
                      <p className="italic text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                        "{selectedNearbyLead.proximity_notes}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      alert(`Le lead voisin '${selectedNearbyLead.name}' a été affecté à la prochaine tournée commerciale.`);
                      setSelectedNearbyLead(null);
                    }}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs transition-all cursor-pointer shadow-[0_0_20px_rgba(37,99,235,0.20)]"
                  >
                    Affecter au Commercial
                  </button>
                  <button
                    onClick={() => setSelectedNearbyLead(null)}
                    className="py-2.5 px-4 studio-subcard text-zinc-700 dark:text-zinc-300 rounded-2xl font-bold text-xs hover:opacity-80"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : selectedTradeAudit ? (
              /* 3. Selected Friction Alert Inspector */
              <div className="studio-card p-6 flex flex-col gap-4 shadow-sm animate-fade-in border-2 border-red-500/40">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase text-red-600 dark:text-red-400 tracking-wider flex items-center gap-1">
                      <Icons.AlertTriangle size={12} /> Alerte Friction Concurrent
                    </span>
                    <h3 className="text-base font-black text-zinc-950 dark:text-white">{selectedTradeAudit.enterprise_name}</h3>
                    <p className="text-xs text-zinc-600 dark:text-gray-300">Concurrent en place : <strong>{selectedTradeAudit.competitor_name}</strong></p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-500/15 text-red-600 dark:text-red-400">
                    {selectedTradeAudit.satisfaction_score}/5 Déçu
                  </span>
                </div>

                <div className="studio-subcard p-3 rounded-2xl flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-bold text-[10px] uppercase">Budget Mensuel Estimé :</span>
                    <span className="font-extrabold text-zinc-950 dark:text-white">{selectedTradeAudit.monthly_spend_estimated || '500 - 1500 $'}</span>
                  </div>
                  {selectedTradeAudit.friction_reasons && (
                    <div className="mt-1 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <span className="text-zinc-500 font-bold text-[10px] uppercase block mb-1">Motifs de friction signalés :</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedTradeAudit.friction_reasons.map((r, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedTradeAudit.alert_notes && (
                    <p className="text-zinc-700 dark:text-zinc-300 italic text-[11px] mt-1">
                      "{selectedTradeAudit.alert_notes}"
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      alert(`L'alerte prioritaire pour '${selectedTradeAudit.enterprise_name}' a été transmise au Responsable Grand Compte (KAM).`);
                      setSelectedTradeAudit(null);
                    }}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs transition-all cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.25)]"
                  >
                    Transmettre au KAM
                  </button>
                  <button
                    onClick={() => setSelectedTradeAudit(null)}
                    className="py-2.5 px-4 studio-subcard text-zinc-700 dark:text-zinc-300 rounded-2xl font-bold text-xs hover:opacity-80"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : selectedEnterprise ? (
              /* 4. Selected Enterprise Inspector */
              <div className="studio-card p-6 flex flex-col gap-4 shadow-sm animate-fade-in">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                      Fiche Entreprise
                    </span>
                    <h3 className="text-base font-black text-zinc-950 dark:text-white">{selectedEnterprise.name}</h3>
                    <p className="text-xs text-zinc-600 dark:text-gray-300">{selectedEnterprise.sector} • {selectedEnterprise.location}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    selectedEnterprise.is_ready_for_conversion
                      ? 'badge-success'
                      : 'badge-warning'
                  }`}>
                    {selectedEnterprise.is_ready_for_conversion ? 'Converti 🟢' : 'À Prospecter'}
                  </span>
                </div>

                {selectedEnterprise.ai_tailored_pitch && (
                  <div className="p-4 studio-subcard rounded-2xl text-xs flex flex-col gap-1">
                    <span className="font-black text-blue-600 dark:text-blue-400 text-[10px] uppercase flex items-center gap-1">
                      <Icons.Sparkles size={12} /> Argumentaire IA Sur-Mesure
                    </span>
                    <p className="text-zinc-800 dark:text-zinc-200 italic text-[11px] leading-relaxed">
                      {selectedEnterprise.ai_tailored_pitch}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setSelectedEnterprise(null)}
                  className="w-full py-2.5 studio-subcard text-zinc-900 dark:text-white rounded-2xl font-bold text-xs transition-all cursor-pointer hover:opacity-80"
                >
                  Fermer la Fiche
                </button>
              </div>
            ) : (
              /* 5. Plaques List */
              <div className="studio-card p-6 flex flex-col gap-3 shadow-sm">
                <div className="flex justify-between items-center border-b border-zinc-200/60 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Icons.Layers size={18} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-black uppercase text-zinc-950 dark:text-white">
                      Plaques Actives ({plaques.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-bold">{enterprises.length} Leads</span>
                </div>

                <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {plaques.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-[18px] studio-subcard hover:shadow-md transition-all flex flex-col gap-2 cursor-pointer"
                      onClick={() => {
                        setSelectedPlaque(p);
                        flyTo(p.longitude, p.latitude, 13.5);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-black text-xs text-zinc-950 dark:text-white">{p.name}</span>
                          <span className="ml-2 px-2.5 py-0.5 rounded-full bg-blue-600/15 text-blue-600 dark:text-blue-400 text-[9px] font-black">
                            {p.code}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold">{p.city}</span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-zinc-600 dark:text-gray-300">
                        <span>Leads : <strong>{p.total_enterprises || 0}</strong></span>
                        <span>Commerciaux : <strong>{p.assigned_salespersons_names?.length || 0}</strong></span>
                      </div>

                      <div className="flex gap-1.5 mt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssigningPlaque(p);
                            setAssigningSalespersonIds(p.assigned_salespersons || []);
                          }}
                          className="flex-1 py-2 rounded-xl bg-white/70 dark:bg-zinc-800 hover:bg-blue-600 hover:text-white text-[10px] font-bold text-zinc-800 dark:text-zinc-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Icons.Users size={12} /> Affecter
                        </button>
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sales/plaques/${p.id}/kml/?download=true`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 text-[10px] font-black transition-all flex items-center justify-center gap-1"
                          title="Télécharger le fichier KML pour Google Earth / SIG"
                        >
                          <Icons.Download size={12} /> KML
                        </a>
                      </div>
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
        <div className="studio-card p-6 md:p-8 shadow-sm flex flex-col gap-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-black text-zinc-950 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Icons.Users size={18} className="text-blue-600 dark:text-blue-400" />
                Gestion de l'Effectif Commercial
              </h3>
              <p className="text-xs text-zinc-600 dark:text-gray-300 mt-0.5">
                Créez, affectez ou révoquez les comptes des commerciaux terrain ayant accès à l'application mobile.
              </p>
            </div>
            <button
              onClick={() => setIsCreateSalesModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.20)]"
            >
              <Icons.UserPlus size={14} /> Nouveau Commercial
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold">
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
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      Aucun commercial enregistré. Cliquez sur "Nouveau Commercial" pour créer le premier compte.
                    </td>
                  </tr>
                ) : (
                  salespersons.map((s) => (
                    <tr key={s.id} className="border-b border-zinc-200/50 dark:border-zinc-800/60 hover:bg-white/40 dark:hover:bg-zinc-800/40">
                      <td className="py-3.5 px-3 font-bold text-zinc-950 dark:text-white">
                        {s.full_name}
                        <span className="block text-[10px] text-zinc-500 font-normal">Identifiant : @{s.username}</span>
                      </td>
                      <td className="py-3.5 px-3 text-zinc-600 dark:text-gray-300">{s.phone || 'Non renseigné'}</td>
                      <td className="py-3.5 px-3 text-zinc-800 dark:text-zinc-200 font-medium">{s.location || 'Kinshasa'}</td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {s.assigned_plaques.length === 0 ? (
                            <span className="text-[10px] text-zinc-400 italic">Non affecté</span>
                          ) : (
                            s.assigned_plaques.map((code, idx) => (
                              <span key={idx} className="px-2.5 py-0.5 rounded-full bg-blue-600/15 text-blue-600 dark:text-blue-400 text-[9px] font-black">
                                {code}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-zinc-950 dark:text-white">
                        {s.reports_count} rapport(s) transmis
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => setRevokingSalesperson(s)}
                          className="px-3.5 py-1.5 rounded-xl badge-error hover:bg-red-600 hover:text-white text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 border-none"
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
        <div className="studio-card p-6 md:p-8 shadow-sm flex flex-col gap-5 animate-fade-in">
          <div>
            <h3 className="text-base font-black text-zinc-950 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Icons.Activity size={18} className="text-blue-600 dark:text-blue-400" />
              Flux des Comptes-Rendus de Visite Mobile
            </h3>
            <p className="text-xs text-zinc-600 dark:text-gray-300 mt-0.5">
              Rapports envoyés en direct par les commerciaux depuis l'application Onbora Mobile.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentReports.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-zinc-500 text-xs">
                Aucun compte-rendu de visite reçu pour le moment.
              </div>
            ) : (
              recentReports.map((rep) => (
                <div key={rep.id} className="p-5 studio-subcard rounded-2xl flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-sm text-zinc-950 dark:text-white">{rep.enterprise_name}</h4>
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">Par {rep.salesperson_name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(rep.created_at).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-700 dark:text-gray-300 italic line-clamp-3">
                    "{rep.executive_summary || 'Synthèse non renseignée.'}"
                  </p>

                  {rep.actions_todo && rep.actions_todo.length > 0 && (
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      <strong>Actions suivantes :</strong> {rep.actions_todo.join(', ')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Field Intelligence & Dénicheurs (Leaderboard + Lookalike + Friction) */}
      {activeTab === 'field_intel' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Top Leaderboard Table */}
          <div className="studio-card p-6 md:p-8 shadow-sm flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-base font-black text-zinc-950 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Icons.Award size={18} className="text-blue-600 dark:text-blue-400" />
                  Classement des Dénicheurs de Leads (Field Intelligence)
                </h3>
                <p className="text-xs text-zinc-600 dark:text-gray-300 mt-0.5">
                  Points et primes débloqués par les commerciaux grâce aux repérages 100m, parrainages et conversions RCCM.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold">
                    <th className="py-3 px-3">Rang</th>
                    <th className="py-3 px-3">Commercial</th>
                    <th className="py-3 px-3 text-center">Conversions RCCM (+100 pts)</th>
                    <th className="py-3 px-3 text-center">Voisins 100m (+25 pts)</th>
                    <th className="py-3 px-3 text-center">Parrainages (+15 pts)</th>
                    <th className="py-3 px-3 text-center">Frictions (+10 pts)</th>
                    <th className="py-3 px-3 text-right">Score Total</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-500">
                        Aucun rapport Field Intelligence soumis pour le moment.
                      </td>
                    </tr>
                  ) : (
                    leaderboard.map((row) => (
                      <tr key={row.salesperson_id} className="border-b border-zinc-200/50 dark:border-zinc-800/60 hover:bg-white/40 dark:hover:bg-zinc-800/40">
                        <td className="py-3.5 px-3">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs ${
                            row.rank === 1
                              ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                              : row.rank === 2
                              ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-900 dark:text-white font-black'
                              : row.rank === 3
                              ? 'bg-amber-700 text-white font-black'
                              : 'text-zinc-500'
                          }`}>
                            #{row.rank}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-extrabold text-zinc-950 dark:text-white">
                          {row.fullName}
                          <span className="block text-[10px] text-zinc-500 font-normal">@{row.salesperson_name}</span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {row.successful_conversions_count}
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-blue-600 dark:text-blue-400">
                          {row.nearby_leads_count}
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-purple-600 dark:text-purple-400">
                          {row.referrals_count}
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-red-500">
                          {row.trade_audits_count}
                        </td>
                        <td className="py-3.5 px-3 text-right font-black text-sm text-blue-600 dark:text-blue-400">
                          {row.total_points} pts
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Dual Grid: Lookalike Feed & Priority Friction Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lookalike 100m Leads */}
            <div className="studio-card p-6 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Icons.MapPin size={18} className="text-blue-600 dark:text-blue-400" />
                  <h4 className="text-xs font-black uppercase text-zinc-950 dark:text-white">
                    Flux des Voisins Repérés (Lookalike 100m)
                  </h4>
                </div>
                <span className="text-[10px] bg-blue-600/15 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full font-black">
                  {nearbyLeads.length} leads
                </span>
              </div>

              <div className="flex flex-col gap-2.5 max-h-[340px] overflow-y-auto pr-1 text-xs">
                {nearbyLeads.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500">Aucun voisin 100m répertorié.</div>
                ) : (
                  nearbyLeads.map((nl) => (
                    <div key={nl.id} className="p-3.5 studio-subcard rounded-xl flex justify-between items-start">
                      <div>
                        <span className="font-black text-zinc-950 dark:text-white">{nl.name}</span>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {nl.manager_name ? `Gérant : ${nl.manager_name} • ` : ''}
                          {nl.phone || 'Pas de tél'}
                        </p>
                        {nl.proximity_notes && (
                          <p className="text-[10px] text-zinc-600 dark:text-zinc-400 italic mt-1">
                            "{nl.proximity_notes}"
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => flyTo(nl.longitude, nl.latitude, 14)}
                        className="px-2.5 py-1 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 font-extrabold text-[10px] hover:bg-blue-600 hover:text-white transition-all"
                      >
                        Voir Carte
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Friction Radar KAM */}
            <div className="studio-card p-6 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Icons.AlertTriangle size={18} className="text-red-500" />
                  <h4 className="text-xs font-black uppercase text-zinc-950 dark:text-white">
                    Radar Frictions Concurrentes (Alertes KAM)
                  </h4>
                </div>
                <span className="text-[10px] bg-red-500/15 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-full font-black">
                  {priorityFrictionsCount} alertes
                </span>
              </div>

              <div className="flex flex-col gap-2.5 max-h-[340px] overflow-y-auto pr-1 text-xs">
                {tradeAudits.filter((a) => a.is_priority_friction_alert).length === 0 ? (
                  <div className="py-8 text-center text-zinc-500">Aucune alerte de friction prioritaire.</div>
                ) : (
                  tradeAudits
                    .filter((a) => a.is_priority_friction_alert)
                    .map((ta) => (
                      <div key={ta.id} className="p-3.5 studio-subcard rounded-xl flex justify-between items-start border-l-2 border-red-500">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-zinc-950 dark:text-white">{ta.enterprise_name}</span>
                            <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 text-[9px] font-black">
                              {ta.satisfaction_score}/5 Déçu
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-600 dark:text-gray-300 mt-0.5">
                            Concurrent : <strong>{ta.competitor_name}</strong>
                          </p>
                          {ta.friction_reasons && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ta.friction_reasons.map((r, i) => (
                                <span key={i} className="px-1.5 py-0.2 bg-black/10 dark:bg-white/10 rounded text-[9px] font-bold">
                                  {r}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Affecter Commerciaux à Plaque */}
      {assigningPlaque && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="studio-card p-6 md:p-8 max-w-md w-full flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-black text-zinc-950 dark:text-white uppercase tracking-tight">
                  Affecter les Commerciaux
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                  Plaque : {assigningPlaque.code} - {assigningPlaque.name}
                </p>
              </div>
              <button onClick={() => setAssigningPlaque(null)} className="text-zinc-400 hover:text-zinc-600">
                <Icons.Close size={18} />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto flex flex-col gap-2 studio-subcard p-3 rounded-2xl text-xs">
              {salespersons.length === 0 ? (
                <span className="text-zinc-500">Aucun commercial actif</span>
              ) : (
                salespersons.map((s) => (
                  <label key={s.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/50 dark:hover:bg-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assigningSalespersonIds.includes(s.id)}
                      onChange={() => {
                        setAssigningSalespersonIds((prev) =>
                          prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                        );
                      }}
                      className="accent-blue-600 rounded w-4 h-4"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-zinc-950 dark:text-white">{s.full_name}</span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">@{s.username} • {s.location || 'Kinshasa'}</span>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAssignSalespersons}
                disabled={isSubmittingAssign}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs transition-all cursor-pointer disabled:opacity-50 shadow-[0_0_20px_rgba(37,99,235,0.20)]"
              >
                {isSubmittingAssign ? 'Mise à jour...' : 'Confirmer l\'Affectation'}
              </button>
              <button
                onClick={() => setAssigningPlaque(null)}
                className="py-3 px-5 studio-subcard text-zinc-700 dark:text-zinc-300 rounded-2xl font-bold text-xs hover:opacity-80"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Créer un Compte Commercial */}
      {isCreateSalesModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="studio-card p-6 md:p-8 max-w-lg w-full flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-black text-zinc-950 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Icons.UserPlus size={18} className="text-blue-600 dark:text-blue-400" />
                  Créer un Compte Commercial Mobile
                </h3>
                <p className="text-xs text-zinc-600 dark:text-gray-300 mt-0.5">
                  Ce commercial pourra se connecter sur l'app mobile Onbora avec ces identifiants.
                </p>
              </div>
              <button onClick={() => setIsCreateSalesModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <Icons.Close size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSalesperson} className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-zinc-700 dark:text-gray-300">Prénom *</label>
                  <input
                    type="text"
                    placeholder="Ex: Dieudonné"
                    value={newSalesFirstName}
                    onChange={(e) => setNewSalesFirstName(e.target.value)}
                    className="px-3.5 py-2.5"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-zinc-700 dark:text-gray-300">Nom de famille *</label>
                  <input
                    type="text"
                    placeholder="Ex: Mukendi"
                    value={newSalesLastName}
                    onChange={(e) => setNewSalesLastName(e.target.value)}
                    className="px-3.5 py-2.5"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-zinc-700 dark:text-gray-300">Identifiant Mobile (Username) *</label>
                  <input
                    type="text"
                    placeholder="Ex: dieudonne_m"
                    value={newSalesUsername}
                    onChange={(e) => setNewSalesUsername(e.target.value)}
                    className="px-3.5 py-2.5 font-bold"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-zinc-700 dark:text-gray-300">Mot de passe temporaire *</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newSalesPassword}
                    onChange={(e) => setNewSalesPassword(e.target.value)}
                    className="px-3.5 py-2.5"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-zinc-700 dark:text-gray-300">Téléphone Mobile</label>
                  <input
                    type="text"
                    value={newSalesPhone}
                    onChange={(e) => setNewSalesPhone(e.target.value)}
                    className="px-3.5 py-2.5"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-zinc-700 dark:text-gray-300">Secteur / Ville</label>
                  <input
                    type="text"
                    value={newSalesLocation}
                    onChange={(e) => setNewSalesLocation(e.target.value)}
                    className="px-3.5 py-2.5"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-700 dark:text-gray-300">Plaque d'affectation initiale</label>
                <select
                  value={newSalesPlaqueId}
                  onChange={(e) => setNewSalesPlaqueId(e.target.value ? Number(e.target.value) : '')}
                  className="px-3.5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-xs font-bold"
                >
                  <option value="">-- Aucune plaque (Affectation ultérieure) --</option>
                  {plaques.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name} ({p.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  disabled={isSubmittingNewSales}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs transition-all cursor-pointer disabled:opacity-50 shadow-[0_0_20px_rgba(37,99,235,0.20)]"
                >
                  {isSubmittingNewSales ? 'Création...' : 'Créer le Compte Commercial'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateSalesModalOpen(false)}
                  className="py-3 px-5 studio-subcard text-zinc-700 dark:text-zinc-300 rounded-2xl font-bold text-xs hover:opacity-80"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmation Révocation Compte Commercial */}
      {revokingSalesperson && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="studio-card p-6 md:p-8 max-w-md w-full flex flex-col gap-4 shadow-2xl border-2 border-red-500/30">
            <div className="flex items-center gap-3 text-red-500">
              <Icons.AlertTriangle size={24} />
              <h3 className="text-base font-black uppercase text-zinc-950 dark:text-white">
                Révoquer ce commercial ?
              </h3>
            </div>

            <p className="text-xs text-zinc-600 dark:text-gray-300 leading-relaxed">
              Êtes-vous sûr de vouloir révoquer le compte de <strong>{revokingSalesperson.full_name}</strong> (@{revokingSalesperson.username}) ? Son accès à l'application mobile Onbora sera immédiatement coupé.
            </p>

            <div className="flex gap-2 mt-2">
              <button
                onClick={handleRevokeSalesperson}
                disabled={isRevoking}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs transition-all cursor-pointer disabled:opacity-50 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
              >
                {isRevoking ? 'Révocation...' : 'Oui, Révoquer l\'Accès'}
              </button>
              <button
                onClick={() => setRevokingSalesperson(null)}
                className="py-3 px-5 studio-subcard text-zinc-700 dark:text-zinc-300 rounded-2xl font-bold text-xs hover:opacity-80"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Enregistrer la Zone Tracée (KML) & Affecter les Commerciaux */}
      {isSaveDrawnModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="studio-card p-6 md:p-8 max-w-lg w-full flex flex-col gap-4 shadow-2xl border-2 border-blue-600/30">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Icons.Target size={20} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-black uppercase text-zinc-950 dark:text-white">
                  Valider la Zone KML & Notifier l'App Mobile
                </h3>
              </div>
              <button
                onClick={() => setIsSaveDrawnModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <Icons.Close size={16} />
              </button>
            </div>

            <div className="bg-blue-600/10 border border-blue-600/20 p-3.5 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
                <Icons.MapPin size={16} />
                <span>Polygone tracé : {drawingPoints.length} coordonnées GPS</span>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadKml(drawingPoints, drawnPlaqueName, drawnPlaqueCode)}
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer flex items-center gap-1"
              >
                <Icons.Download size={12} />
                Télécharger .kml
              </button>
            </div>

            <form onSubmit={handleSaveDrawnPlaque} className="flex flex-col gap-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-zinc-700 dark:text-gray-300">Code Plaque *</label>
                  <input
                    type="text"
                    value={drawnPlaqueCode}
                    onChange={(e) => setDrawnPlaqueCode(e.target.value.toUpperCase())}
                    placeholder="Ex: KIN-GOMBE-EST"
                    className="px-3.5 py-2.5 font-black uppercase"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-zinc-700 dark:text-gray-300">Ville</label>
                  <input
                    type="text"
                    value={drawnPlaqueCity}
                    onChange={(e) => setDrawnPlaqueCity(e.target.value)}
                    className="px-3.5 py-2.5"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-700 dark:text-gray-300">Nom du secteur géographique *</label>
                <input
                  type="text"
                  value={drawnPlaqueName}
                  onChange={(e) => setDrawnPlaqueName(e.target.value)}
                  placeholder="Ex: Gombe Centre & Quartier Ambassades"
                  className="px-3.5 py-2.5"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-zinc-700 dark:text-gray-300">
                    Commerciaux à affecter & notifier immédiatement
                  </label>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold">
                    {drawnSalespersonIds.length} sélectionné(s)
                  </span>
                </div>

                <div className="max-h-36 overflow-y-auto flex flex-col gap-1.5 studio-subcard p-2.5 rounded-2xl">
                  {salespersons.length === 0 ? (
                    <span className="text-[10px] text-zinc-500">Aucun commercial actif</span>
                  ) : (
                    salespersons.map((s) => (
                      <label key={s.id} className="flex items-center justify-between p-2 hover:bg-white/50 dark:hover:bg-zinc-800/50 rounded-xl cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={drawnSalespersonIds.includes(s.id)}
                            onChange={() => {
                              setDrawnSalespersonIds((prev) =>
                                prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                              );
                            }}
                            className="accent-blue-600 rounded"
                          />
                          <div className="flex flex-col">
                            <span className="font-extrabold text-zinc-950 dark:text-white">{s.full_name}</span>
                            <span className="text-[10px] text-zinc-500">@{s.username} • {s.location}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          s.is_available ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                        }`}>
                          {s.is_available ? 'Sur le terrain' : 'Occupé'}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  disabled={isSavingDrawnPlaque}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs transition-all cursor-pointer disabled:opacity-50 shadow-[0_0_20px_rgba(37,99,235,0.30)] flex items-center justify-center gap-2"
                >
                  <Icons.CheckCircle size={14} />
                  {isSavingDrawnPlaque ? 'Enregistrement & Push...' : 'Créer, Générer KML & Notifier'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsSaveDrawnModalOpen(false)}
                  className="py-3 px-5 studio-subcard text-zinc-700 dark:text-zinc-300 rounded-2xl font-bold text-xs hover:opacity-80"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
