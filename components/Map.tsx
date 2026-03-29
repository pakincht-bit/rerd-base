import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMap, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { NearbyPlace, Project } from '../types';


// Fix Leaflet's default icon issue with Webpack/Vite/ESM
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: iconUrl,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Define Base Hues for Alphabets to ensure consistent tones
const LETTER_HUES: Record<string, number> = {
    'A': 0,   // Red
    'B': 210, // Blue
    'C': 120, // Green
    'D': 30,  // Orange
    'E': 270, // Purple
    'F': 300, // Magenta
    'G': 180, // Cyan
    'H': 45,  // Amber
    'I': 240, // Indigo
    'J': 90,  // Lime
    'K': 330, // Rose
    'L': 200, // Azure
    'M': 280, // Violet
    'N': 15,  // Red-Orange
    'O': 150, // Teal
    'P': 260, // Deep Purple
    'Q': 60,  // Yellow
    'R': 340, // Crimson
    'S': 195, // Sky
    'T': 100, // Green-Yellow
    'U': 225, // Blue-Indigo
    'V': 315, // Pink
    'W': 25,  // Brown
    'X': 0,   // Gray/Red
    'Y': 50,  // Gold
    'Z': 0    // Black
};

const getBaseHue = (letter: string) => {
    const upper = letter.charAt(0).toUpperCase();
    if (LETTER_HUES[upper] !== undefined) return LETTER_HUES[upper];
    // Fallback hash for other chars
    return (upper.charCodeAt(0) * 57) % 360;
};

// Generate Color: Same Hue for same letter, varied lightness/text for number
const generateCodeColor = (code: string): { bg: string, text: string } => {
    if (!code) return { bg: '#6B7280', text: 'white' };
    
    // Extract letter and number
    const match = code.match(/^([A-Za-z]+)(\d*)/);
    const letter = match ? match[1] : code.charAt(0);
    // Default to 0 if no number found
    const number = match && match[2] ? parseInt(match[2], 10) : 0;
    
    const baseHue = getBaseHue(letter);
    
    // Strategy for Distinction:
    // 1. Lightness Alternation: Even numbers = Light (Dark Text), Odd numbers = Dark (Light Text)
    //    This creates high contrast between sequential codes (e.g. A1 vs A2).
    const isEven = number % 2 === 0;
    
    // Add noise to lightness (0-15%)
    const noise = (number * 17) % 15;
    
    let lightness, textColor;
    if (isEven) {
        // Light Background: 70-85%
        lightness = 70 + noise;
        textColor = '#111827'; // Dark Gray
    } else {
        // Dark Background: 30-45%
        lightness = 30 + noise;
        textColor = '#FFFFFF'; // White
    }
    
    // Saturation: Keep relatively high for vibrancy (65-90%)
    const saturation = 65 + ((number * 7) % 25);
    
    // Hue Shift: Small wobble (+/- 10 deg) to differentiate further without changing color family
    const hueShift = ((number * 3) % 20) - 10;
    const hue = (baseHue + hueShift + 360) % 360;
    
    return { 
        bg: `hsl(${hue}, ${saturation}%, ${lightness}%)`, 
        text: textColor 
    };
};

interface MapProps {
    center: [number, number];
    projects: Project[];
    radius: number;
    searchMode: 'location' | 'code';
    onMarkerClick: (project: Project) => void;
    hoveredProjectId: string | null;
    activeProject: Project | null;
    nearbyPlaces?: NearbyPlace[];
    activePlace?: NearbyPlace | null;
    visibleLayers: { projects: boolean; mall: boolean; hospital: boolean; school: boolean; hotel: boolean };
    rulerActive: boolean;
    rulerPoints: { a: [number, number] | null; b: [number, number] | null };
    setRulerPoints: React.Dispatch<React.SetStateAction<{ a: [number, number] | null; b: [number, number] | null }>>;
}

// Component to handle map movements
const MapUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [center[0], center[1], zoom, map]);
    return null;
};



// Component to fix rendering issues by invalidating size on resize
const MapResizer: React.FC = () => {
    const map = useMap();
    
    useEffect(() => {
        // 1. Force invalidate immediately on mount
        map.invalidateSize();

        // 2. Use ResizeObserver to detect container size changes
        const resizeObserver = new ResizeObserver(() => {
            map.invalidateSize();
        });

        const container = map.getContainer();
        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
        };
    }, [map]);

    return null;
};

const ProjectFlyTo: React.FC<{ project: Project | null; place: NearbyPlace | null | undefined }> = ({ project, place }) => {
    const map = useMap();
    useEffect(() => {
        if (project) {
            map.flyTo([project.lat, project.lng], 16, {
                animate: true,
                duration: 1.5
            });
        } else if (place) {
            map.flyTo([place.lat, place.lng], 16, {
                animate: true,
                duration: 1.5
            });
        }
    }, [project, place, map]);
    return null;
};

// Right-click event listener (renders nothing, just captures contextmenu events)
const MapContextMenuListener: React.FC<{
    onContextMenu: (data: { lat: number; lng: number; x: number; y: number }) => void;
    onClose: () => void;
}> = ({ onContextMenu, onClose }) => {
    const map = useMap();

    useEffect(() => {
        map.on('movestart', onClose);
        map.on('zoomstart', onClose);
        map.on('click', onClose);
        return () => {
            map.off('movestart', onClose);
            map.off('zoomstart', onClose);
            map.off('click', onClose);
        };
    }, [map, onClose]);

    useMapEvents({
        contextmenu(e) {
            e.originalEvent.preventDefault();
            const point = map.latLngToContainerPoint(e.latlng);
            onContextMenu({ lat: e.latlng.lat, lng: e.latlng.lng, x: point.x, y: point.y });
        },
    });

    return null;
};

// Ruler click handler – captures map clicks to place point A then B
const RulerClickHandler: React.FC<{
    rulerPoints: { a: [number, number] | null; b: [number, number] | null };
    setRulerPoints: React.Dispatch<React.SetStateAction<{ a: [number, number] | null; b: [number, number] | null }>>;
}> = ({ rulerPoints, setRulerPoints }) => {
    useMapEvents({
        click(e) {
            const point: [number, number] = [e.latlng.lat, e.latlng.lng];
            if (!rulerPoints.a) {
                // Place point A
                setRulerPoints({ a: point, b: null });
            } else if (!rulerPoints.b) {
                // Place point B
                setRulerPoints(prev => ({ ...prev, b: point }));
            } else {
                // Reset and start new measurement
                setRulerPoints({ a: point, b: null });
            }
        },
    });
    return null;
};

const createUserIcon = () => {
    const html = `
        <div class="relative flex items-center justify-center w-8 h-8 -ml-4 -mt-4">
            <div class="absolute w-full h-full bg-[#1B333C] rounded-full opacity-30 animate-ping"></div>
            <div class="relative w-full h-full bg-[#1B333C] rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
        </div>`;
    return L.divIcon({ html, className: 'custom-div-icon', iconSize: [32, 32], iconAnchor: [16, 16] });
};

// Custom Place Icon (Mall, Hospital, School)
const createPlaceIcon = (type: string, isHovered: boolean) => {
    let iconSvg = '';
    let bgColor = '';
    let textColor = '';

    if (type === 'mall') {
        bgColor = '#ffedd5'; // orange-100
        textColor = '#ea580c'; // orange-600
        iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`;
    } else if (type === 'hospital') {
        bgColor = '#fee2e2'; // red-100
        textColor = '#dc2626'; // red-600
        iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2a2 2 0 0 0-2 2v2H4v6h5v6h6v-6h5V6h-5V4a2 2 0 0 0-2-2Z"/></svg>`;
    } else if (type === 'school') { // school
        bgColor = '#dbeafe'; // blue-100
        textColor = '#2563eb'; // blue-600
        iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`;
    } else { // hotel
        bgColor = '#f3e8ff'; // purple-100
        textColor = '#9333ea'; // purple-600
        iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`;
    }

    const scaleClass = isHovered ? "scale-125 z-50 ring-2 ring-white" : "scale-100";

    const html = `
        <div 
            class="flex items-center justify-center w-7 h-7 rounded-full shadow-md border-2 border-white transition-all duration-200 ${scaleClass}"
            style="background-color: ${bgColor}; color: ${textColor};"
        >
            ${iconSvg}
        </div>
    `;

    return L.divIcon({ html, className: 'custom-place-icon', iconSize: [28, 28], iconAnchor: [14, 14] });
};


// Custom Project Numbered Icon with Color
const createProjectIcon = (index: number, isHovered: boolean, bgColor: string, textColor: string) => {
    const baseClass = "inner-marker font-bold text-sm px-2 py-1 rounded-lg shadow-md border transition-all cursor-pointer whitespace-nowrap overflow-hidden min-w-[32px] text-center flex items-center justify-center";
    
    // Scale on hover
    const scaleClass = isHovered ? "scale-125 z-50 ring-2 ring-white" : "";
    
    // Determine border color for contrast against map. 
    // White border pops on dark bg. On light bg, white border is subtle, but clean.
    const borderColor = 'white';

    const html = `
        <div 
            class="${baseClass} ${scaleClass}" 
            style="background-color: ${bgColor}; color: ${textColor}; border-color: ${borderColor};"
        >
            ${index + 1}
        </div>`;
    return L.divIcon({ html, className: 'custom-label-icon', iconSize: [0, 0], iconAnchor: [16, 10] });
};

const MapComponent: React.FC<MapProps> = ({ 
    center, 
    projects, 
    radius, 
    searchMode, 
    onMarkerClick, 
    hoveredProjectId, 
    activeProject,
    nearbyPlaces = [],
    activePlace,
    visibleLayers,
    rulerActive,
    rulerPoints,
    setRulerPoints
}) => {


    // Generate colors for each code
    const codeColorMap = useMemo(() => {
        const map: Record<string, { bg: string, text: string }> = {};
        projects.forEach(p => {
            if (p.code && !map[p.code]) {
                map[p.code] = generateCodeColor(p.code);
            }
        });
        return map;
    }, [projects]);

    const getCodeColor = (code: string) => codeColorMap[code] || { bg: '#6B7280', text: 'white' };

    // Calculate Unique Codes for Legend
    const uniqueCodes = useMemo(() => {
        if (!visibleLayers.projects) return [];
        const codes = new Set(projects.map(p => p.code).filter(Boolean));
        return Array.from(codes).sort((a: string, b: string) => {
             const matchA = a.match(/^([A-Za-z]+)(\d*)/);
             const matchB = b.match(/^([A-Za-z]+)(\d*)/);
             if (matchA && matchB) {
                 if (matchA[1] !== matchB[1]) return matchA[1].localeCompare(matchB[1]);
                 return parseInt(matchA[2] || '0') - parseInt(matchB[2] || '0');
             }
             return a.localeCompare(b);
        });
    }, [projects, visibleLayers.projects]);


    // Context menu state (lifted out of MapContainer so popup renders outside Leaflet)
    const [ctxMenu, setCtxMenu] = useState<{ lat: number; lng: number; x: number; y: number } | null>(null);
    const [ctxCopied, setCtxCopied] = useState(false);
    const closeCtxMenu = useCallback(() => setCtxMenu(null), []);
    const handleCtxOpen = useCallback((data: { lat: number; lng: number; x: number; y: number }) => {
        setCtxMenu(data);
        setCtxCopied(false);
    }, []);
    const handleCtxCopy = useCallback(() => {
        if (!ctxMenu) return;
        const text = `${ctxMenu.lat.toFixed(6)}, ${ctxMenu.lng.toFixed(6)}`;
        navigator.clipboard.writeText(text).then(() => {
            setCtxCopied(true);
            setTimeout(() => setCtxMenu(null), 800);
        });
    }, [ctxMenu]);

    // Haversine for ruler
    const rulerDistance = useMemo(() => {
        if (!rulerPoints.a || !rulerPoints.b) return null;
        const [lat1, lon1] = rulerPoints.a;
        const [lat2, lon2] = rulerPoints.b;
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }, [rulerPoints]);



    return (
        <div className={`relative w-full h-full ${rulerActive ? 'ruler-active-cursor' : ''}`}>
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }} zoomControl={false}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                />
                
                <MapUpdater center={center} zoom={searchMode === 'code' ? 12 : 14} />

                <MapResizer />
                <ProjectFlyTo project={activeProject} place={activePlace} />
                <MapContextMenuListener onContextMenu={handleCtxOpen} onClose={closeCtxMenu} />

                {searchMode === 'location' && (
                    <>
                        <Marker position={center} icon={createUserIcon()} zIndexOffset={1000} />
                        <Circle 
                            center={center} 
                            radius={radius * 1000} 
                            pathOptions={{ color: '#222', fillColor: '#222', fillOpacity: 0.05, weight: 1.5, dashArray: '5, 5' }} 
                        />
                    </>
                )}

                {/* Render Nearby Places (Malls, Hospitals, Schools) */}
                {nearbyPlaces.map((place) => {
                    if (!visibleLayers[place.type]) return null;
                    const isHovered = activePlace?.id === place.id;
                    return (
                        <Marker
                            key={place.id}
                            position={[place.lat, place.lng]}
                            icon={createPlaceIcon(place.type, isHovered)}
                            zIndexOffset={isHovered ? 800 : 50}
                        >
                             <Tooltip direction="top" offset={[0, -15]} opacity={1}>
                                <div className="text-center">
                                    <span className="font-bold text-gray-900 block text-xs whitespace-nowrap">{place.name}</span>
                                    <span className="text-[10px] text-gray-500 capitalize">{place.type}</span>
                                </div>
                            </Tooltip>
                        </Marker>
                    );
                })}

                {/* Render Projects */}
                {visibleLayers.projects && projects.map((p, idx) => {
                    const isHovered = hoveredProjectId === p.projectId;
                    const colors = getCodeColor(p.code);

                    // In location mode, skip project marker if it overlaps with center pin
                    if (searchMode === 'location' &&
                        p.lat.toFixed(4) === center[0].toFixed(4) &&
                        p.lng.toFixed(4) === center[1].toFixed(4)) {
                        return null;
                    }

                    const icon = createProjectIcon(idx, isHovered, colors.bg, colors.text);

                    return (
                        <Marker 
                            key={p.projectId} 
                            position={[p.lat, p.lng]} 
                            icon={icon}
                            zIndexOffset={isHovered ? 1000 : 100}
                            eventHandlers={{
                                click: () => onMarkerClick(p),
                                mouseover: (e) => {
                                    const icon = e.target.getElement();
                                    if(icon) icon.classList.add('marker-hover');
                                },
                                mouseout: (e) => {
                                    const icon = e.target.getElement();
                                    if(icon) icon.classList.remove('marker-hover');
                                }
                            }}
                        >
                             <Tooltip direction="top" offset={[0, -20]} opacity={1}>
                                <div className="text-center px-1">
                                    <span className="font-bold text-gray-900 block text-sm whitespace-nowrap">{p.name}</span>
                                    <span className="text-[10px] text-gray-500 block">{p.developer}</span>
                                    <span className="text-[10px] font-bold text-scbx block mt-0.5">{p.priceRange}</span>
                                </div>
                            </Tooltip>
                        </Marker>
                    );
                })}

                {/* Ruler overlays */}
                {rulerActive && (
                    <>
                        <RulerClickHandler rulerPoints={rulerPoints} setRulerPoints={setRulerPoints} />
                        {rulerPoints.a && (
                            <Marker position={rulerPoints.a} icon={L.divIcon({
                                html: `<div class="w-3 h-3 rounded-full bg-white border-2 border-gray-800 shadow-md" style="transform: translate(-50%, -50%)"></div>`,
                                className: 'ruler-point-icon', iconSize: [0, 0], iconAnchor: [0, 0],
                            })} zIndexOffset={2000} />
                        )}
                        {rulerPoints.b && (
                            <Marker position={rulerPoints.b} icon={L.divIcon({
                                html: `<div class="w-3 h-3 rounded-full bg-white border-2 border-gray-800 shadow-md" style="transform: translate(-50%, -50%)"></div>`,
                                className: 'ruler-point-icon', iconSize: [0, 0], iconAnchor: [0, 0],
                            })} zIndexOffset={2000} />
                        )}
                        {rulerPoints.a && rulerPoints.b && rulerDistance !== null && (() => {
                            const [lat1, lng1] = rulerPoints.a!;
                            const [lat2, lng2] = rulerPoints.b!;
                            const totalDist = rulerDistance;

                            // Calculate tick interval based on total distance
                            let tickInterval: number;
                            if (totalDist <= 0.5) tickInterval = 0.1;
                            else if (totalDist <= 2) tickInterval = 0.5;
                            else if (totalDist <= 5) tickInterval = 1;
                            else if (totalDist <= 20) tickInterval = 2;
                            else tickInterval = 5;

                            // Direction vector
                            const dLat = lat2 - lat1;
                            const dLng = lng2 - lng1;
                            const len = Math.sqrt(dLat * dLat + dLng * dLng);
                            // Perpendicular (for tick marks)
                            const perpLat = -dLng / len;
                            const perpLng = dLat / len;
                            const tickSize = len * 0.015; // tick length relative to line
                            const smallTickSize = tickSize * 0.5;

                            // Generate ticks
                            const ticks: { pos: [number, number]; isMajor: boolean; dist: number }[] = [];
                            const numSmallTicks = Math.floor(totalDist / (tickInterval / 5));
                            for (let i = 0; i <= numSmallTicks; i++) {
                                const frac = (i * (tickInterval / 5)) / totalDist;
                                if (frac > 1.01) break;
                                const clampedFrac = Math.min(frac, 1);
                                const lat = lat1 + dLat * clampedFrac;
                                const lng = lng1 + dLng * clampedFrac;
                                const isMajor = (i % 5 === 0);
                                ticks.push({ pos: [lat, lng], isMajor, dist: clampedFrac * totalDist });
                            }

                            // Major tick labels (at each major interval)
                            const majorTicks = ticks.filter(t => t.isMajor && t.dist > 0.001 && t.dist < totalDist - 0.001);

                            const formatDist = (d: number) => d < 1 ? `${(d * 1000).toFixed(0)} m` : `${d.toFixed(2)} km`;

                            return (
                                <>
                                    {/* Main line */}
                                    <Polyline
                                        positions={[rulerPoints.a, rulerPoints.b]}
                                        pathOptions={{ color: '#1a1a1a', weight: 2, opacity: 0.85 }}
                                    />
                                    {/* Tick marks */}
                                    {ticks.map((tick, i) => {
                                        const size = tick.isMajor ? tickSize : smallTickSize;
                                        return (
                                            <Polyline
                                                key={`tick-${i}`}
                                                positions={[
                                                    [tick.pos[0] + perpLat * size, tick.pos[1] + perpLng * size],
                                                    [tick.pos[0] - perpLat * size, tick.pos[1] - perpLng * size],
                                                ]}
                                                pathOptions={{ color: '#1a1a1a', weight: tick.isMajor ? 1.5 : 1, opacity: 0.7 }}
                                            />
                                        );
                                    })}
                                    {/* "0" label at start */}
                                    <Marker
                                        position={rulerPoints.a}
                                        icon={L.divIcon({
                                            html: `<div class="text-[11px] font-bold text-gray-700 whitespace-nowrap ruler-label-stroke" style="transform: translate(-50%, 6px)">0</div>`,
                                            className: 'ruler-distance-label', iconSize: [0, 0], iconAnchor: [0, 0],
                                        })}
                                        zIndexOffset={2500}
                                        interactive={false}
                                    />
                                    {/* Interval labels */}
                                    {majorTicks.map((tick, i) => (
                                        <Marker
                                            key={`label-${i}`}
                                            position={tick.pos as [number, number]}
                                            icon={L.divIcon({
                                                html: `<div class="text-[11px] font-bold text-gray-700 whitespace-nowrap ruler-label-stroke" style="transform: translate(-50%, 6px)">${formatDist(tick.dist)}</div>`,
                                                className: 'ruler-distance-label', iconSize: [0, 0], iconAnchor: [0, 0],
                                            })}
                                            zIndexOffset={2500}
                                            interactive={false}
                                        />
                                    ))}
                                    {/* Total distance label at end */}
                                    <Marker
                                        position={rulerPoints.b}
                                        icon={L.divIcon({
                                            html: `<div class="text-[11px] font-bold text-gray-700 whitespace-nowrap ruler-label-stroke" style="transform: translate(-50%, 6px)">${formatDist(totalDist)}</div>`,
                                            className: 'ruler-distance-label', iconSize: [0, 0], iconAnchor: [0, 0],
                                        })}
                                        zIndexOffset={2500}
                                        interactive={false}
                                    />
                                </>
                            );
                        })()}
                    </>
                )}
            </MapContainer>



            {/* Code Legend - Right Side Vertical (Visible only if projects are enabled) */}
            {visibleLayers.projects && uniqueCodes.length > 0 && (
                <div className="absolute top-1/2 -translate-y-1/2 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md p-4 rounded-2xl shadow-premium border border-white/50 dark:border-gray-700/50 z-[400] max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col gap-2 min-w-[100px]">
                    {uniqueCodes.map(code => {
                        const colors = getCodeColor(code);
                        return (
                            <div key={code} className="flex items-center gap-3">
                                <span 
                                    className="w-4 h-4 rounded-md shadow-sm shrink-0 border border-black/10 flex items-center justify-center text-[8px] font-bold" 
                                    style={{ backgroundColor: colors.bg, color: colors.text }}
                                >
                                    {/* Optional: Add dot or letter inside legend color box for reference */}
                                </span>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">{code}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Right-click coordinate popup (rendered outside MapContainer) */}
            {ctxMenu && (
                <div
                    className="absolute z-[1000] bg-white/95 backdrop-blur-xl rounded-xl shadow-premium border border-gray-100/50 py-2 px-3 min-w-[180px]"
                    style={{ left: ctxMenu.x, top: ctxMenu.y, transform: 'translate(-50%, -100%) translateY(-8px)' }}
                >
                    <div className="text-[10px] font-medium text-gray-400 mb-1">Coordinates</div>
                    <div className="text-xs font-mono text-gray-700 mb-2">
                        {ctxMenu.lat.toFixed(6)}, {ctxMenu.lng.toFixed(6)}
                    </div>
                    <button
                        onClick={handleCtxCopy}
                        className={`w-full text-[11px] font-bold py-1.5 rounded-lg transition-all ${
                            ctxCopied
                                ? 'bg-green-50 text-green-600 border border-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                        }`}
                    >
                        {ctxCopied ? '✓ Copied!' : 'Copy Coordinates'}
                    </button>
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-gray-100/50 rotate-45" />
                </div>
            )}

            {/* Ruler instruction banner */}
            {rulerActive && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-premium border border-gray-100/50 dark:border-gray-700/50 px-5 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-scbx/10 flex items-center justify-center shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1B333C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/>
                            <path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>
                        </svg>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-gray-800 dark:text-gray-200">
                            {!rulerPoints.a ? 'Click map to place Point A' : !rulerPoints.b ? 'Click map to place Point B' : 'Click to start a new measurement'}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                            {!rulerPoints.a ? 'Set the starting point' : !rulerPoints.b ? 'Set the destination point' : 'Distance shown on the line'}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapComponent;