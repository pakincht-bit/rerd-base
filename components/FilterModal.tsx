import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Project, SearchState, NearbyPlace } from '../types';
import { ChevronDown, MapPin, CheckCircle2, TrendingUp, SearchX, Calendar, Building2, ShoppingBag, Stethoscope, GraduationCap, Star, Loader2, AlertCircle } from 'lucide-react';

interface ResultsPanelProps {
    projects: Project[];
    totalCount: number;
    searchState: SearchState;
    setSearchState: React.Dispatch<React.SetStateAction<SearchState>>;
    onProjectClick: (p: Project) => void;
    onProjectHover: (id: string | null) => void;
    selectedProjectId: string | null;
    // New props for lifting state and handling interactions
    onPlacesFetched?: (places: NearbyPlace[]) => void;
    onPlaceClick?: (place: NearbyPlace) => void;
}

// Helper for Distance Calculation
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// List of Overpass Mirrors to rotate through
const OVERPASS_SERVERS = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

const ResultsPanel: React.FC<ResultsPanelProps> = ({ 
    projects,
    totalCount,
    searchState,
    setSearchState,
    onProjectClick,
    onProjectHover,
    selectedProjectId,
    onPlacesFetched,
    onPlaceClick
}) => {
    const [activeTab, setActiveTab] = useState<'projects' | 'mall' | 'hospital' | 'school'>('projects');
    const [placeSortBy, setPlaceSortBy] = useState<'distance' | 'rating'>('distance');
    
    // Data State
    const [placesData, setPlacesData] = useState<Record<string, NearbyPlace[]>>({
        mall: [],
        hospital: [],
        school: []
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    // Cache to prevent refetching same location
    const lastFetchRef = useRef<{lat: number, lng: number, radius: number} | null>(null);

    // Auto-scroll to selected project when selection changes
    useEffect(() => {
        if (selectedProjectId && activeTab === 'projects') {
            const element = document.getElementById(`project-card-${selectedProjectId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [selectedProjectId, activeTab]);

    // Fetch OSM Data (Loads ALL categories at once when location changes)
    useEffect(() => {
        let isMounted = true;
        
        // Debounce execution to avoid rate limits when sliding or typing quickly
        const timeoutId = setTimeout(() => {
            const fetchAllPlaces = async () => {
                const { lat, lng, radius } = searchState;

                // Check if we need to fetch (only if location/radius changed)
                if (lastFetchRef.current && 
                    lastFetchRef.current.lat === lat && 
                    lastFetchRef.current.lng === lng && 
                    lastFetchRef.current.radius === radius) {
                    return;
                }

                setIsLoading(true);
                setErrorMsg(null);
                setPlacesData({ mall: [], hospital: [], school: [] }); // Clear previous data
                
                // Notify parent to clear map markers temporarily
                if (onPlacesFetched) onPlacesFetched([]);

                try {
                    const radiusMeters = radius * 1000;
                    
                    // Combined Query for Malls, Hospitals, and Schools
                    const query = `
                        [out:json][timeout:25];
                        (
                          node["shop"~"mall|department_store",i](around:${radiusMeters},${lat},${lng});
                          way["shop"~"mall|department_store",i](around:${radiusMeters},${lat},${lng});
                          relation["shop"~"mall|department_store",i](around:${radiusMeters},${lat},${lng});
                          
                          node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
                          way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
                          relation["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
                          
                          node["amenity"~"school|university|college",i](around:${radiusMeters},${lat},${lng});
                          way["amenity"~"school|university|college",i](around:${radiusMeters},${lat},${lng});
                          relation["amenity"~"school|university|college",i](around:${radiusMeters},${lat},${lng});
                        );
                        out body center;
                    `;

                    let data = null;
                    let success = false;

                    // Server Rotation Logic
                    for (const server of OVERPASS_SERVERS) {
                        if (!isMounted) break;
                        try {
                            const response = await fetch(server, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded'
                                },
                                body: 'data=' + encodeURIComponent(query)
                            });

                            if (response.ok) {
                                data = await response.json();
                                success = true;
                                break; // Success! Exit loop
                            } else if (response.status === 429) {
                                console.warn(`Rate limit (429) on ${server}, trying next mirror...`);
                                continue;
                            } else {
                                console.warn(`Error ${response.status} on ${server}, trying next mirror...`);
                                continue;
                            }
                        } catch (err) {
                            console.warn(`Connection failed to ${server}`, err);
                            continue;
                        }
                    }

                    if (!success || !data) {
                        throw new Error("Unable to fetch data from all Overpass mirrors. Please try again later.");
                    }

                    if (!isMounted) return;

                    const newPlaces: Record<string, NearbyPlace[]> = {
                        mall: [],
                        hospital: [],
                        school: []
                    };

                    const MALL_REGEX = /mall|department_store/i;
                    const HOSPITAL_REGEX = /hospital/i;
                    const SCHOOL_REGEX = /school|university|college/i;

                    const allPlacesFlat: NearbyPlace[] = [];
                    const seenIds = new Set<string>();

                    if (data && data.elements) {
                        data.elements.forEach((el: any) => {
                            // Prevent duplicates
                            if (seenIds.has(String(el.id))) return;
                            seenIds.add(String(el.id));

                            const tags = el.tags || {};
                            const name = tags.name || tags["name:en"] || tags["name:th"];
                            // Skip unnamed places
                            if (!name) return;

                            const nameLower = name.toLowerCase();

                            const pLat = el.lat || el.center?.lat;
                            const pLng = el.lon || el.center?.lon;
                            
                            if(!pLat || !pLng) return;

                            const dist = calculateDistance(lat, lng, pLat, pLng);

                            // Determine Type
                            let type: 'mall' | 'hospital' | 'school' | null = null;
                            
                            // Priority check
                            if (tags.shop && MALL_REGEX.test(tags.shop)) type = 'mall';
                            else if (tags.amenity && HOSPITAL_REGEX.test(tags.amenity)) type = 'hospital';
                            else if (tags.amenity && SCHOOL_REGEX.test(tags.amenity)) type = 'school';

                            if (!type) return;

                            // --- RELAXED FILTERING LOGIC (Trust tags, exclude obvious bad ones) ---

                            // 1. Malls: Exclude convenience stores AND Markets
                            if (type === 'mall') {
                                const excludeMalls = [
                                    '7-eleven', '7-11', 'family', 'lawson', 'mini big c', 
                                    'lotus\'s go fresh', 'cj', 'tops daily', 'seven eleven', 'jiffy',
                                    'market', 'ตลาด', 'bazaar', 'night market', 'walking street', 'floating market',
                                    'shop', 'store' // Generic names
                                ];
                                if (excludeMalls.some(ex => nameLower.includes(ex))) return;
                            }

                            // 2. Hospitals: Exclude Animal Hospitals and Clinics
                            if (type === 'hospital') {
                                 const excludeHospital = ['animal', 'pet', 'dental', 'clinic', 'คลินิก', 'รักษาสัตว์', 'ทำฟัน', 'ทันตกรรม'];
                                 if (excludeHospital.some(ex => nameLower.includes(ex))) return;
                            }

                            // 3. Schools: Exclude specialized schools (Driving, Music, etc.)
                            if (type === 'school') {
                                const excludeSchools = [
                                    'driving', 'music', 'tutor', 'language', 'dance', 
                                    'nursery', 'day care', 'gym', 'swim', 'ballet', 'yoga', 'cooking', 'art', 'football', 'soccer', 'tennis', 'badminton', 'taekwondo', 'muay thai',
                                    'บริบาล', 'กวดวิชา', 'สอนขับรถ', 'ดนตรี', 'ภาษา', 'เต้น', 'ว่ายน้ำ', 'ยิม', 'รับเลี้ยงเด็ก', 'เนอสเซอรี่'
                                ];
                                if (excludeSchools.some(ex => nameLower.includes(ex))) return;
                            }

                            const placeObj: NearbyPlace = {
                                id: String(el.id),
                                name: name,
                                type: type,
                                distance: parseFloat(dist.toFixed(2)),
                                rating: 3.5 + Math.random() * 1.5,
                                address: tags["addr:street"] ? `${tags["addr:street"]} ${tags["addr:city"] || ''}` : "Location details unavailable",
                                lat: pLat,
                                lng: pLng
                            };

                            newPlaces[type].push(placeObj);
                            allPlacesFlat.push(placeObj);
                        });
                    }

                    // Sort each category by distance
                    Object.keys(newPlaces).forEach(key => {
                        newPlaces[key].sort((a, b) => a.distance - b.distance);
                    });

                    setPlacesData(newPlaces);
                    lastFetchRef.current = { lat, lng, radius };
                    
                    // Lift state up to App component for the Map
                    if (onPlacesFetched) {
                        onPlacesFetched(allPlacesFlat);
                    }

                } catch (error) {
                    console.error("Error fetching OSM data:", error);
                    setErrorMsg("Failed to load nearby places. High traffic.");
                } finally {
                    if(isMounted) setIsLoading(false);
                }
            };
            
            fetchAllPlaces();
        }, 1000); // 1 second debounce to prevent spamming while moving map

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [searchState.lat, searchState.lng, searchState.radius]);

    // Sorting Logic for Nearby Places
    const sortedPlaces = useMemo(() => {
        if (activeTab === 'projects') return [];
        
        const items = placesData[activeTab] || [];
        return [...items].sort((a, b) => {
            if (placeSortBy === 'rating') {
                return b.rating - a.rating; // Descending
            }
            return a.distance - b.distance; // Ascending
        });
    }, [placesData, activeTab, placeSortBy]);

    const tabs = [
        { id: 'projects', label: 'Projects', icon: Building2, count: totalCount },
        { id: 'mall', label: 'Malls', icon: ShoppingBag, count: placesData.mall.length || 0 },
        { id: 'hospital', label: 'Hospitals', icon: Stethoscope, count: placesData.hospital.length || 0 },
        { id: 'school', label: 'Schools', icon: GraduationCap, count: placesData.school.length || 0 },
    ] as const;

    return (
        <div className="w-full h-full flex flex-col bg-transparent">
             {/* Header */}
             <div className="border-b border-gray-100/50 bg-white/60 backdrop-blur-md sticky top-0 z-20 flex flex-col rounded-t-3xl shadow-sm">
                
                {/* Tab Navigation */}
                <div className="flex items-center px-2 pt-2">
                    {tabs.map(tab => {
                         const isTabLoading = isLoading && tab.id !== 'projects';
                         return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 relative transition-all duration-300 ${
                                    activeTab === tab.id ? 'text-scbx' : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                                <span className="text-[10px] font-bold uppercase tracking-wide">{tab.label}</span>
                                
                                {/* Active Indicator */}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 w-8 h-1 bg-scbx rounded-t-full"></div>
                                )}
                                
                                {/* Badge */}
                                <span className={`absolute top-2 right-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] flex items-center justify-center font-bold transition-all ${
                                    activeTab === tab.id ? 'bg-scbx text-white' : 'bg-gray-200 text-gray-500'
                                } ${isTabLoading ? 'bg-gray-100' : ''}`}>
                                    {isTabLoading ? (
                                        <Loader2 className="w-2.5 h-2.5 animate-spin text-gray-400" />
                                    ) : (
                                        tab.id === 'projects' 
                                            ? (tab.count > 99 ? '99+' : tab.count) 
                                            : (tab.count > 30 ? '30+' : tab.count)
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Sub-Header (Sort controls) */}
                <div className="px-5 pb-3 pt-3 animate-fadeInUp flex flex-row items-center justify-between gap-2">
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-gray-900">
                            {activeTab === 'projects' ? totalCount : sortedPlaces.length}
                        </span>
                        <span className="text-sm font-medium text-gray-500">
                            {activeTab === 'projects' ? 'projects found' : 'places found'}
                        </span>
                    </div>

                    <div className="relative group w-auto min-w-[140px]">
                        {activeTab === 'projects' ? (
                            <select 
                                value={searchState.sortBy}
                                onChange={(e) => setSearchState(prev => ({ ...prev, sortBy: e.target.value as any }))}
                                className="w-full appearance-none pl-3 pr-8 h-8 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/5 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm cursor-pointer"
                            >
                                <option value="distance">Sort: Distance</option>
                                <option value="launchDate">Sort: Newest</option>
                                <option value="unitLeft">Sort: Units Left</option>
                                <option value="percentSold">Sort: % Sold</option>
                                <option value="speed6m">Sort: Speed (6M)</option>
                                <option value="priceAsc">Sort: Price (Low)</option>
                                <option value="priceDesc">Sort: Price (High)</option>
                            </select>
                        ) : (
                            <select 
                                value={placeSortBy}
                                onChange={(e) => setPlaceSortBy(e.target.value as 'distance' | 'rating')}
                                className="w-full appearance-none pl-3 pr-8 h-8 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/5 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm cursor-pointer"
                            >
                                <option value="distance">Sort: Distance</option>
                                <option value="rating">Sort: Score</option>
                            </select>
                        )}
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                 
                 {/* PROJECTS TAB */}
                 {activeTab === 'projects' && (
                     <div className="grid grid-cols-1 gap-3 animate-fadeInUp">
                        {projects.map((p, idx) => {
                            const isSelected = selectedProjectId === p.projectId;
                            const uniqueTypes = [...new Set(p.subUnits.map(u => u.type))];
                            const launchDate = p.subUnits.map(u => u.launchDate).filter(d => d && d !== '-').sort()[0] || '-';
                            const unitLeft = Math.round(p.totalUnits - p.soldUnits);

                            // Calculate display price based on filters
                            let displayPrice = p.priceRange;
                            if (searchState.typeFilter.length === 1) {
                                const selectedType = searchState.typeFilter[0];
                                const relevantPrices = p.subUnits
                                    .filter(u => u.type === selectedType && u.price > 0)
                                    .map(u => u.price);
                                
                                if (relevantPrices.length > 0) {
                                    const minPrice = Math.min(...relevantPrices);
                                    const maxPrice = Math.max(...relevantPrices);
                                    
                                    const minVal = minPrice < 1000 ? minPrice : minPrice / 1000000;
                                    const maxVal = maxPrice < 1000 ? maxPrice : maxPrice / 1000000;

                                    if (minVal === maxVal) {
                                        displayPrice = `${minVal.toFixed(2)} MB`;
                                    } else {
                                        displayPrice = `${minVal.toFixed(2)} - ${maxVal.toFixed(2)} MB`;
                                    }
                                }
                            }

                            return (
                                <div 
                                    id={`project-card-${p.projectId}`}
                                    key={p.projectId}
                                    onClick={() => onProjectClick(p)}
                                    onMouseEnter={() => onProjectHover && onProjectHover(p.projectId)}
                                    onMouseLeave={() => onProjectHover && onProjectHover(null)}
                                    className={`group relative flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-200 backdrop-blur-sm
                                        ${isSelected 
                                            ? 'bg-white shadow-lg scale-[1.01] border-l-4 border-scbx ring-1 ring-gray-100' 
                                            : 'bg-white/60 border border-white/50 hover:bg-white hover:scale-[1.01] hover:shadow-lg'
                                        }
                                    `}
                                >
                                    <div className="flex flex-col items-center justify-start pt-0.5 gap-1">
                                        <span className={`text-[10px] font-bold px-1.5 py-1 rounded-md shadow-sm min-w-[24px] text-center transition-colors
                                            ${isSelected ? 'bg-scbx text-white' : 'bg-gray-800 text-white'}
                                        `}>
                                            {idx + 1}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-400">
                                            {p.code}
                                        </span>
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                        <div>
                                            <h3 className={`font-bold text-sm truncate transition-colors ${isSelected ? 'text-scbx' : 'text-gray-800 group-hover:text-scbx'}`} title={p.name}>
                                                {p.name}
                                            </h3>
                                            <div className="text-[10px] text-gray-500 truncate mt-0.5">{p.developer}</div>
                                        </div>
                                        
                                        {/* Types Row */}
                                        <div className="flex items-center gap-1.5 overflow-hidden mt-0.5">
                                            {uniqueTypes.slice(0, 3).map(t => (
                                                <span key={t} className="bg-white/60 text-gray-500 text-[9px] px-1.5 py-0.5 rounded border border-gray-100 truncate max-w-[120px]">
                                                    {t}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Stats Row */}
                                        <div className="flex items-center gap-1 shrink-0 flex-wrap">
                                            {launchDate !== '-' && (
                                                <div className="flex items-center gap-0.5 text-[9px] text-gray-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100/50" title="Launch Date">
                                                    <Calendar size={8} /> {launchDate}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-0.5 text-[9px] text-green-700 bg-green-50/50 px-1.5 py-0.5 rounded border border-green-100/50">
                                                <CheckCircle2 size={8} /> {Math.round(parseFloat(p.percentSold))}% ({unitLeft.toLocaleString()} Left)
                                            </div>
                                            <div className="flex items-center gap-0.5 text-[9px] text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded border border-indigo-100/50">
                                                <TrendingUp size={8} /> {p.saleSpeed6m}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right min-w-fit flex flex-col items-end justify-start gap-0.5 pt-0.5">
                                        <div className="font-bold text-xs text-gray-900 whitespace-nowrap">
                                            {displayPrice}
                                        </div>
                                        {searchState.searchMode === 'location' && (
                                            <div className="text-[10px] text-gray-400 font-medium">
                                                {p.distance?.toFixed(1)} km
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {projects.length === 0 && (
                             <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="bg-white/40 p-5 rounded-full mb-4 border border-white/50 shadow-sm">
                                    <SearchX className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-700">No projects found</h3>
                                <p className="text-gray-500 text-sm mt-1">Try extending the radius or changing filters.</p>
                            </div>
                        )}
                     </div>
                 )}

                 {/* LOADING STATE (In-Body) */}
                 {activeTab !== 'projects' && isLoading && placesData[activeTab].length === 0 && (
                     <div className="flex flex-col items-center justify-center py-12 animate-fadeInUp">
                         <Loader2 className="w-8 h-8 text-scbx animate-spin mb-3" />
                         <span className="text-xs text-gray-500 font-medium">Fetching nearby places...</span>
                     </div>
                 )}

                 {/* ERROR STATE */}
                 {activeTab !== 'projects' && errorMsg && placesData[activeTab].length === 0 && (
                     <div className="flex flex-col items-center justify-center py-10 px-6 text-center animate-fadeInUp">
                         <div className="bg-red-50 p-3 rounded-full mb-3">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                         </div>
                         <span className="text-sm text-gray-700 font-bold">Data Unavailable</span>
                         <span className="text-xs text-gray-500 mt-1 max-w-[200px]">{errorMsg}</span>
                     </div>
                 )}

                 {/* OTHER TABS (Mall, Hospital, School) */}
                 {activeTab !== 'projects' && (!isLoading || placesData[activeTab].length > 0) && !errorMsg && (
                     <div className="space-y-3 animate-fadeInUp">
                         {/* Disclaimer Note */}
                         <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex items-center gap-2 mb-2">
                             <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                             <div className="text-[10px] text-amber-700 font-medium">
                                 <strong>Note:</strong> ผลลัพท์ที่ได้อาจจะไม่อัพเดท ให้ไปเช็คความถูกต้องเองเพิ่มเติม
                             </div>
                         </div>

                         {sortedPlaces.map((place) => (
                             <div 
                                key={place.id} 
                                onClick={() => onPlaceClick && onPlaceClick(place)}
                                className="bg-white/60 border border-white/50 p-4 rounded-2xl flex items-center gap-3 transition-all duration-200 backdrop-blur-sm cursor-pointer group hover:bg-white hover:shadow-lg hover:scale-[1.01]"
                            >
                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 ${
                                     activeTab === 'mall' ? 'bg-orange-100 text-orange-600' :
                                     activeTab === 'hospital' ? 'bg-red-100 text-red-600' :
                                     'bg-blue-100 text-blue-600'
                                 }`}>
                                     {activeTab === 'mall' ? <ShoppingBag size={20} /> :
                                      activeTab === 'hospital' ? <Stethoscope size={20} /> :
                                      <GraduationCap size={20} />}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                     <h3 className="font-bold text-gray-800 text-sm truncate group-hover:text-scbx transition-colors">{place.name}</h3>
                                     <div className="text-[10px] text-gray-500 mt-0.5 truncate">{place.address}</div>
                                 </div>
                                 <div className="text-right shrink-0">
                                     <div className="flex items-center justify-end gap-1 text-yellow-500 mb-1">
                                         <Star size={10} fill="currentColor" />
                                         <span className="text-xs font-bold text-gray-700">{place.rating.toFixed(1)}</span>
                                     </div>
                                     <div className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1 justify-end">
                                         <MapPin size={8} /> {place.distance.toFixed(1)} km
                                     </div>
                                 </div>
                             </div>
                         ))}
                         {sortedPlaces.length === 0 && (
                             <div className="text-center py-10 text-gray-400 text-sm">
                                 No locations found in this area.
                             </div>
                         )}
                     </div>
                 )}

            </div>
        </div>
    );
};

export default ResultsPanel;