import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, useMap, useMapEvents, Popup, ScaleControl, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Loader2, Flag } from 'lucide-react';
import { Location, AnalysisResult, PlaceItem, ViewMode, RouteOption } from '../types';

// Fix for default Leaflet marker icons in ESM/CDN environments
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconShadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: iconUrl,
    shadowUrl: iconShadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Destination Icon (Red)
const DestinationIcon = L.divIcon({
  className: 'custom-dest-marker',
  html: `
    <div style="
      color: #dc2626;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#dc2626" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [4, 32],
  popupAnchor: [0, -32]
});

interface MapViewProps {
  center: Location;
  destination: Location | null;
  radius: number;
  onLocationSelect: (loc: Location, isDestination?: boolean) => void;
  analysis?: AnalysisResult | null;
  isLoading?: boolean;
  viewMode: ViewMode;
  selectedRoute?: RouteOption | null;
}

// ----------------------------------------------------------------------
// Geodesic Math Helper
// ----------------------------------------------------------------------
const calculateDestination = (lat: number, lng: number, distanceMeters: number, bearingDegrees: number) => {
  const R = 6371e3; // Earth radius (meters)
  const rad = (x: number) => x * Math.PI / 180;
  const deg = (x: number) => x * 180 / Math.PI;

  const lat1 = rad(lat);
  const lng1 = rad(lng);
  const brng = rad(bearingDegrees);
  const angularDistance = distanceMeters / R; 

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
    Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(brng)
  );

  let lng2 = lng1 + Math.atan2(
    Math.sin(brng) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
  );

  lng2 = (lng2 + 3 * Math.PI) % (2 * Math.PI) - Math.PI;

  return { lat: deg(lat2), lng: deg(lng2) };
};

// ----------------------------------------------------------------------
// Icon Generators
// ----------------------------------------------------------------------
const createCategoryIcon = (color: string, iconSvg: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      ">
        ${iconSvg}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

const icons = {
  residential: createCategoryIcon('#2563eb', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'),
  convenience: createCategoryIcon('#ea580c', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>'),
  shopping: createCategoryIcon('#9333ea', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>'),
  food: createCategoryIcon('#16a34a', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>'),
  transport: createCategoryIcon('#0891b2', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>'),
  recreation: createCategoryIcon('#059669', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10v.2A3 3 0 0 1 8.9 16v0H5v0h0a3 3 0 0 1-1-5.8V10a3 3 0 0 1 5.3-2.1"/><path d="M7 16v6"/><path d="M13 19v3"/><path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .9-1.7l-2.6-5a1 1 0 0 0-1.7 0l-2.6 5a1 1 0 0 0 .9 1.7h.2l-3 3.3"/></svg>'),
  public_service: createCategoryIcon('#475569', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>'),
};


// ----------------------------------------------------------------------
// Components
// ----------------------------------------------------------------------

const LocationSelector: React.FC<{ 
  onSelect: (loc: Location, isDest?: boolean) => void;
  viewMode: ViewMode;
}> = ({ onSelect, viewMode }) => {
  useMapEvents({
    click(e) {
      if (viewMode !== 'route') {
        onSelect({ lat: e.latlng.lat, lng: e.latlng.lng }, false);
      }
    },
    contextmenu(e) {
      if (viewMode === 'route') {
        onSelect({ lat: e.latlng.lat, lng: e.latlng.lng }, true);
      }
    }
  });
  return null;
};

const MapRecenter: React.FC<{ center: Location }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.lat, center.lng], map.getZoom());
  }, [center, map]);
  return null;
};

const GeodesicCircle: React.FC<{ center: Location; radius: number; pathOptions: L.PathOptions }> = ({ center, radius, pathOptions }) => {
  const points = useMemo(() => {
    const pts = [];
    const steps = 120;
    for(let i = 0; i <= steps; i++) {
       const angle = (i * 360) / steps;
       const dest = calculateDestination(center.lat, center.lng, radius, angle);
       pts.push([dest.lat, dest.lng] as [number, number]);
    }
    return pts;
  }, [center, radius]);

  return <Polygon positions={points} pathOptions={pathOptions} interactive={false} />;
};

const DistanceMarkers: React.FC<{ center: Location; radius: number }> = ({ center, radius }) => {
  const km = (radius / 1000).toFixed(1);
  const labelText = `${km} km`;

  const createLabelIcon = (text: string) => {
    return L.divIcon({
      className: 'custom-label-border-none', 
      html: `<div class="bg-white/90 px-2 py-0.5 rounded shadow-sm text-xs font-bold border border-slate-300 whitespace-nowrap text-slate-700 w-max transform -translate-x-1/2 -translate-y-1/2">${text}</div>`,
      iconSize: [0, 0], 
      iconAnchor: [0, 0]
    });
  };

  const north = calculateDestination(center.lat, center.lng, radius, 0);
  const east = calculateDestination(center.lat, center.lng, radius, 90);
  const south = calculateDestination(center.lat, center.lng, radius, 180);
  const west = calculateDestination(center.lat, center.lng, radius, 270);

  const rangeRings = [];
  if (radius > 5000) {
    for (let r = 5000; r < radius; r += 5000) {
       rangeRings.push(
         <GeodesicCircle
           key={`ring-${r}`}
           center={center}
           radius={r}
           pathOptions={{ 
             color: '#64748b', 
             fill: false, 
             weight: 1, 
             dashArray: '5, 10',
             opacity: 0.6 
           }}
         />
       );
    }
  }

  return (
    <>
      {rangeRings}
      <Polyline 
        positions={[[center.lat, center.lng], [east.lat, east.lng]]}
        pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '6, 6', opacity: 0.8 }}
      />
      <Marker position={[north.lat, north.lng]} icon={createLabelIcon(labelText)} interactive={false} />
      <Marker position={[east.lat, east.lng]} icon={createLabelIcon(labelText)} interactive={false} />
      <Marker position={[south.lat, south.lng]} icon={createLabelIcon(labelText)} interactive={false} />
      <Marker position={[west.lat, west.lng]} icon={createLabelIcon(labelText)} interactive={false} />
    </>
  );
};

// ----------------------------------------------------------------------
// Marker & Heatmap Logic
// ----------------------------------------------------------------------

const PlaceMarker: React.FC<{ item: PlaceItem; icon: L.DivIcon }> = ({ item, icon }) => {
  const map = useMap();
  
  const handleFlyTo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.lat && item.lng) {
      map.flyTo([item.lat, item.lng], 17, { animate: true, duration: 1.5 });
    }
  };

  return (
    <Marker position={[item.lat!, item.lng!]} icon={icon}>
      <Popup>
        <div className="font-sans min-w-[200px]">
          <strong className="text-sm block mb-1 text-slate-800">{item.name}</strong>
          {item.rating && (
            <div className="flex items-center gap-1 mb-2">
              <span className="text-amber-500 font-bold text-sm">★ {item.rating.toFixed(1)}</span>
              {item.reviews && <span className="text-xs text-slate-400">({item.reviews} reviews)</span>}
            </div>
          )}
          <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded inline-block mb-3">
            ห่าง {item.distance}
          </span>
          <div className="grid grid-cols-2 gap-2 mt-1">
             <button 
               onClick={handleFlyTo}
               className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 py-1.5 px-2 rounded font-medium border border-indigo-200 transition-colors"
             >
               ไปที่นี่
             </button>
             <a 
               href={`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`}
               target="_blank" 
               rel="noopener noreferrer" 
               className="text-xs bg-white text-slate-600 hover:bg-slate-50 py-1.5 px-2 rounded font-medium border border-slate-200 text-center transition-colors flex items-center justify-center gap-1"
             >
               Google Maps
             </a>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

const AnalyzedPlaceMarkers: React.FC<{ analysis: AnalysisResult | null | undefined }> = ({ analysis }) => {
  const map = useMap();
  const [clusteringAvailable, setClusteringAvailable] = useState(false);

  useEffect(() => {
    const L_Global = (window as any).L;
    if (L_Global && L_Global.markerClusterGroup) {
      setClusteringAvailable(true);
    }
  }, []);

  const allMarkers = useMemo(() => {
    if (!analysis) return [];
    
    const markers: { item: PlaceItem; icon: L.DivIcon }[] = [];
    const add = (items: PlaceItem[], icon: L.DivIcon) => {
      items?.forEach(item => {
        if (item.lat && item.lng) {
          markers.push({ item, icon });
        }
      });
    };

    add(analysis.residential, icons.residential);
    add(analysis.convenience, icons.convenience);
    add(analysis.shopping, icons.shopping);
    add(analysis.food, icons.food);
    add(analysis.transport, icons.transport);
    add(analysis.recreation, icons.recreation);
    add(analysis.public_service, icons.public_service);

    return markers;
  }, [analysis]);

  useEffect(() => {
    if (!analysis || !clusteringAvailable) return;

    const L_Global = (window as any).L;
    if (!L_Global || !L_Global.markerClusterGroup) return;

    const markerGroup = L_Global.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      removeOutsideVisibleBounds: true,
      animate: true
    });

    allMarkers.forEach(({ item, icon }) => {
      if (item.lat && item.lng) {
        const container = document.createElement('div');
        container.className = "font-sans min-w-[200px]";
        
        const stars = item.rating ? `
          <div class="flex items-center gap-1 mb-2">
            <span class="text-amber-500 font-bold text-sm">★ ${item.rating.toFixed(1)}</span>
            <span class="text-xs text-slate-400">(${item.reviews || 0} reviews)</span>
          </div>
        ` : '';

        container.innerHTML = `
            <strong class="text-sm block mb-1 text-slate-800">${item.name}</strong>
            ${stars}
            <span class="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded inline-block mb-3">
              ห่าง ${item.distance}
            </span>
            <div class="grid grid-cols-2 gap-2 mt-1">
               <button id="zoom-btn" class="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 py-1.5 px-2 rounded font-medium border border-indigo-200 transition-colors">
                 ไปที่นี่
               </button>
               <a href="https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}" target="_blank" rel="noopener noreferrer" class="text-xs bg-white text-slate-600 hover:bg-slate-50 py-1.5 px-2 rounded font-medium border border-slate-200 text-center transition-colors flex items-center justify-center gap-1">
                 Google Maps
               </a>
            </div>
        `;

        const zoomBtn = container.querySelector('#zoom-btn');
        if (zoomBtn) {
            zoomBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              map.flyTo([item.lat!, item.lng!], 17, { animate: true, duration: 1.5 });
            });
        }

        const marker = L_Global.marker([item.lat, item.lng], { icon: icon }).bindPopup(container);
        markerGroup.addLayer(marker);
      }
    });

    map.addLayer(markerGroup);

    return () => {
      map.removeLayer(markerGroup);
    };
  }, [analysis, map, clusteringAvailable, allMarkers]);

  if (clusteringAvailable) return null;

  return (
    <>
      {allMarkers.map(({ item, icon }, idx) => (
        <PlaceMarker key={`${item.name}-${idx}`} item={item} icon={icon} />
      ))}
    </>
  );
};

const HeatmapLayer: React.FC<{ analysis: AnalysisResult | null }> = ({ analysis }) => {
  const map = useMap();

  useEffect(() => {
    if (!analysis) return;
    const points: [number, number, number][] = [];
    const extract = (items: PlaceItem[]) => {
      items.forEach(item => {
        if (item.lat && item.lng) {
          let intensity = item.popularity || 0.5;
          if (item.rating && item.rating > 4.5) intensity += 0.2;
          points.push([item.lat, item.lng, Math.min(intensity, 1.0)]);
        }
      });
    };

    extract(analysis.residential);
    extract(analysis.convenience);
    extract(analysis.shopping);
    extract(analysis.food);
    extract(analysis.transport);
    extract(analysis.recreation);
    extract(analysis.public_service);

    const L_Global = (window as any).L;
    if (!L_Global || !L_Global.heatLayer) return;

    const heat = L_Global.heatLayer(points, {
        radius: 35,
        blur: 20,
        maxZoom: 15,
        gradient: {
            0.1: '#3b82f6',
            0.3: '#06b6d4',
            0.5: '#22c55e',
            0.7: '#eab308',
            1.0: '#ef4444'
        }
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [analysis, map]);

  return null;
};

const MapLoadingOverlay = () => (
  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] pointer-events-none">
      <div className="bg-white/95 backdrop-blur px-6 py-4 rounded-2xl shadow-2xl border border-indigo-100 flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300">
           <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
           <div className="text-center">
             <p className="text-slate-800 font-bold text-sm">กำลังทำงาน...</p>
             <p className="text-slate-500 text-xs">กรุณารอสักครู่</p>
           </div>
      </div>
  </div>
);

const RouteVisualizer: React.FC<{ route: RouteOption }> = ({ route }) => {
    const map = useMap();

    useEffect(() => {
        if (route && route.coordinates && route.coordinates.length > 0) {
            // Fit bounds to show the entire route
            const bounds = L.latLngBounds(route.coordinates);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [route, map]);

    if (!route.coordinates || route.coordinates.length === 0) return null;

    return (
        <Polyline 
            positions={route.coordinates}
            pathOptions={{ 
                color: '#4f46e5', // Indigo-600
                weight: 6,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
            }}
        />
    );
};

const MapView: React.FC<MapViewProps> = ({ center, destination, radius, onLocationSelect, analysis, isLoading, viewMode, selectedRoute }) => {
  return (
    <div className="h-full w-full z-0 relative">
      <MapContainer 
        center={[center.lat, center.lng]} 
        zoom={13} 
        scrollWheelZoom={true} 
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <ScaleControl position="bottomleft" metric={true} imperial={false} />
        
        <LocationSelector onSelect={onLocationSelect} viewMode={viewMode} />
        <MapRecenter center={center} />

        {/* --- Layers based on ViewMode --- */}

        {/* 1. Radius & Markers Mode (Analysis) */}
        {(viewMode === 'markers' || viewMode === 'heatmap') && (
          <>
            <DistanceMarkers center={center} radius={radius} />
            <GeodesicCircle 
              center={center} 
              radius={radius}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 2 }}
            />
          </>
        )}
        
        {viewMode === 'markers' && <AnalyzedPlaceMarkers analysis={analysis} />}
        {viewMode === 'heatmap' && <HeatmapLayer analysis={analysis} />}

        {/* 2. Route Mode */}
        {viewMode === 'route' && destination && (
           <>
              <Marker position={[destination.lat, destination.lng]} icon={DestinationIcon}>
                 <Popup>จุดหมายปลายทาง (Destination)</Popup>
              </Marker>
              
              {/* Show the selected precise route if available, otherwise fallback to simple line */}
              {selectedRoute && selectedRoute.coordinates ? (
                 <RouteVisualizer route={selectedRoute} />
              ) : (
                // Fallback straight line if no route calculated yet or API failed
                 <Polyline 
                    positions={[[center.lat, center.lng], [destination.lat, destination.lng]]}
                    pathOptions={{ 
                    color: '#94a3b8', 
                    weight: 4, 
                    opacity: 0.5, 
                    dashArray: '10, 10'
                    }}
                 />
              )}
           </>
        )}

        {/* Center Marker (Always visible as Origin) */}
        <Marker position={[center.lat, center.lng]}>
             <Popup>
                จุดเริ่มต้น (Origin)<br/>
                Lat: {center.lat.toFixed(4)}<br/>
                Lng: {center.lng.toFixed(4)}
             </Popup>
        </Marker>

      </MapContainer>
      
      {isLoading && <MapLoadingOverlay />}

      {/* Enhanced Instruction Overlay */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-full shadow-lg border border-slate-200 flex items-center gap-2.5 transition-all duration-300">
           {viewMode === 'route' ? (
              <>
                <div className="relative flex h-2.5 w-2.5">
                  {!destination && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${destination ? 'bg-indigo-500' : 'bg-red-500'}`}></span>
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {destination ? 'คลิกขวาเพื่อเปลี่ยนจุดปลายทาง' : 'คลิกขวาบนแผนที่เพื่อกำหนดปลายทาง'}
                </span>
              </>
           ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-slate-600">คลิกบนแผนที่เพื่อเปลี่ยนจุดศูนย์กลาง</span>
              </>
           )}
        </div>
      </div>
    </div>
  );
};

export default MapView;
