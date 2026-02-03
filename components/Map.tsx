import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { NearbyPlace, Project } from '../types';
import { Layers, Building2, ShoppingBag, Stethoscope, GraduationCap, Check, Eye, EyeOff, LocateFixed } from 'lucide-react';

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

// Component to capture map instance
const MapRegister: React.FC<{ setMap: (map: L.Map) => void }> = ({ setMap }) => {
    const map = useMap();
    useEffect(() => {
        setMap(map);
    }, [map, setMap]);
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

const createUserIcon = () => {
    const html = `
        <div class="relative flex items-center justify-center w-8 h-8 -ml-4 -mt-4">
            <div class="absolute w-full h-full bg-[#00A950] rounded-full opacity-30 animate-ping"></div>
            <div class="relative w-full h-full bg-[#00A950] rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white">
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
    } else { // school
        bgColor = '#dbeafe'; // blue-100
        textColor = '#2563eb'; // blue-600
        iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`;
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
    activePlace
}) => {
    const [visibleLayers, setVisibleLayers] = useState({
        projects: true,
        mall: true,
        hospital: true,
        school: true
    });
    const [isLayerControlOpen, setIsLayerControlOpen] = useState(false);
    const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

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

    const toggleLayer = (layer: keyof typeof visibleLayers) => {
        setVisibleLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
    };

    const handleRecenter = () => {
        if (mapInstance && searchMode === 'location') {
            // Explicitly calculate bounds based on radius (km) to ensure robust centering
            const lat = center[0];
            const lng = center[1];
            // 1 deg lat ~= 111.32 km
            const latOffset = radius / 111.32;
            // 1 deg lng ~= 111.32 * cos(lat) km
            const lngOffset = radius / (111.32 * Math.cos(lat * (Math.PI / 180)));
            
            const southWest = L.latLng(lat - latOffset, lng - lngOffset);
            const northEast = L.latLng(lat + latOffset, lng + lngOffset);
            const bounds = L.latLngBounds(southWest, northEast);

            mapInstance.flyToBounds(bounds, { 
                animate: true, 
                duration: 1.0, 
                padding: [50, 50] // Padding to ensure the circle isn't touching the edges
            });
        }
    };

    return (
        <div className="relative w-full h-full">
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }} zoomControl={false}>
                <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <MapUpdater center={center} zoom={searchMode === 'code' ? 12 : 14} />
                <MapRegister setMap={setMapInstance} />
                <MapResizer />
                <ProjectFlyTo project={activeProject} place={activePlace} />

                {searchMode === 'location' && (
                    <>
                        <Marker position={center} icon={createUserIcon()} zIndexOffset={1000} />
                        <Circle 
                            center={center} 
                            radius={radius * 1000} 
                            pathOptions={{ color: '#222', fillColor: '#222', fillOpacity: 0.05, weight: 1, dashArray: '5, 5' }} 
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

                    return (
                        <Marker 
                            key={p.projectId} 
                            position={[p.lat, p.lng]} 
                            icon={createProjectIcon(idx, isHovered, colors.bg, colors.text)}
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
            </MapContainer>

            {/* Controls Container - Top Right - Increased Z-Index */}
            <div className="absolute top-24 right-4 z-[1000] flex flex-col items-end gap-2">
                
                {/* Recenter Button (Only in Location Mode) */}
                {searchMode === 'location' && (
                     <button 
                        onClick={handleRecenter}
                        className="w-10 h-10 bg-white rounded-xl shadow-lg border border-gray-100 flex items-center justify-center hover:bg-gray-50 text-gray-700 transition-colors animate-in slide-in-from-right-4 duration-300 cursor-pointer active:scale-95"
                        title="Recenter Map to Radius"
                    >
                        <LocateFixed className="w-5 h-5 text-scbx" />
                    </button>
                )}

                {/* Layer Control Button */}
                <div className="relative flex flex-col items-end">
                    <button 
                        onClick={() => setIsLayerControlOpen(!isLayerControlOpen)}
                        className="w-10 h-10 bg-white rounded-xl shadow-lg border border-gray-100 flex items-center justify-center hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer active:scale-95"
                        title="Toggle Layers"
                    >
                        <Layers className="w-5 h-5" />
                    </button>

                    {isLayerControlOpen && (
                        <div className="mt-2 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/50 w-48 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex flex-col gap-1">
                                {/* Project Toggle */}
                                <button 
                                    onClick={() => toggleLayer('projects')}
                                    className={`flex items-center justify-between p-2 rounded-lg transition-colors ${visibleLayers.projects ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-md bg-gray-800 text-white flex items-center justify-center">
                                            <Building2 size={14} />
                                        </div>
                                        <span className={`text-xs font-bold ${visibleLayers.projects ? 'text-gray-800' : 'text-gray-400'}`}>Projects</span>
                                    </div>
                                    {visibleLayers.projects ? <Eye size={14} className="text-gray-600" /> : <EyeOff size={14} className="text-gray-400" />}
                                </button>

                                <div className="h-px bg-gray-200 my-1"></div>

                                {/* Mall Toggle */}
                                <button 
                                    onClick={() => toggleLayer('mall')}
                                    className={`flex items-center justify-between p-2 rounded-lg transition-colors ${visibleLayers.mall ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center">
                                            <ShoppingBag size={14} />
                                        </div>
                                        <span className={`text-xs font-bold ${visibleLayers.mall ? 'text-gray-800' : 'text-gray-400'}`}>Malls</span>
                                    </div>
                                    {visibleLayers.mall ? <Check size={14} className="text-orange-600" /> : <div className="w-3.5 h-3.5 rounded border border-gray-300"></div>}
                                </button>

                                {/* Hospital Toggle */}
                                <button 
                                    onClick={() => toggleLayer('hospital')}
                                    className={`flex items-center justify-between p-2 rounded-lg transition-colors ${visibleLayers.hospital ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-md bg-red-100 text-red-600 flex items-center justify-center">
                                            <Stethoscope size={14} />
                                        </div>
                                        <span className={`text-xs font-bold ${visibleLayers.hospital ? 'text-gray-800' : 'text-gray-400'}`}>Hospitals</span>
                                    </div>
                                    {visibleLayers.hospital ? <Check size={14} className="text-red-600" /> : <div className="w-3.5 h-3.5 rounded border border-gray-300"></div>}
                                </button>

                                {/* School Toggle */}
                                <button 
                                    onClick={() => toggleLayer('school')}
                                    className={`flex items-center justify-between p-2 rounded-lg transition-colors ${visibleLayers.school ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center">
                                            <GraduationCap size={14} />
                                        </div>
                                        <span className={`text-xs font-bold ${visibleLayers.school ? 'text-gray-800' : 'text-gray-400'}`}>Schools</span>
                                    </div>
                                    {visibleLayers.school ? <Check size={14} className="text-blue-600" /> : <div className="w-3.5 h-3.5 rounded border border-gray-300"></div>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Code Legend - Right Side Vertical (Visible only if projects are enabled) */}
            {visibleLayers.projects && uniqueCodes.length > 0 && (
                <div className="absolute bottom-8 right-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 z-[400] max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col gap-2 min-w-[100px]">
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
                                <span className="text-xs font-bold text-gray-700 whitespace-nowrap">{code}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MapComponent;