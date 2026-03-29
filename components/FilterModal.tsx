import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Project, SearchState, NearbyPlace } from '../types';
import { ChevronDown, TrendingUp, SearchX, Calendar, ShoppingBag, Stethoscope, GraduationCap, Star, Loader2, AlertCircle, Bed, MapPinOff } from 'lucide-react';

interface ResultsPanelProps {
    projects: Project[];
    totalCount: number;
    searchState: SearchState;
    setSearchState: React.Dispatch<React.SetStateAction<SearchState>>;
    onProjectClick: (p: Project) => void;
    onProjectHover: (id: string | null) => void;
    selectedProjectId: string | null;
    onPlacesFetched?: (places: NearbyPlace[]) => void;
    onPlaceClick?: (place: NearbyPlace) => void;
    activeTab: 'projects' | 'mall' | 'hospital' | 'school' | 'hotel';
    onPlaceCounts?: (counts: { mall: number; hospital: number; school: number; hotel: number }) => void;
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
    onPlaceClick,
    activeTab,
    onPlaceCounts
}) => {
    const [placeSortBy, setPlaceSortBy] = useState<'distance' | 'rating'>('distance');

    // Data State
    const [placesData, setPlacesData] = useState<Record<string, NearbyPlace[]>>({
        mall: [],
        hospital: [],
        school: [],
        hotel: []
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Cache to prevent refetching same location
    const lastFetchRef = useRef<{ lat: number, lng: number, radius: number } | null>(null);

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
                setPlacesData({ mall: [], hospital: [], school: [], hotel: [] }); // Clear previous data

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
                          
                          node["tourism"~"hotel|hostel|resort|motel|guest_house",i](around:${radiusMeters},${lat},${lng});
                          way["tourism"~"hotel|hostel|resort|motel|guest_house",i](around:${radiusMeters},${lat},${lng});
                          relation["tourism"~"hotel|hostel|resort|motel|guest_house",i](around:${radiusMeters},${lat},${lng});
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
                        school: [],
                        hotel: []
                    };

                    const MALL_REGEX = /mall|department_store/i;
                    const HOSPITAL_REGEX = /hospital/i;
                    const SCHOOL_REGEX = /school|university|college/i;
                    const HOTEL_REGEX = /hotel|hostel|resort|motel|guest_house/i;

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

                            if (!pLat || !pLng) return;

                            const dist = calculateDistance(lat, lng, pLat, pLng);

                            // Determine Type
                            let type: 'mall' | 'hospital' | 'school' | 'hotel' | null = null;

                            // Priority check
                            if (tags.shop && MALL_REGEX.test(tags.shop)) type = 'mall';
                            else if (tags.amenity && HOSPITAL_REGEX.test(tags.amenity)) type = 'hospital';
                            else if (tags.amenity && SCHOOL_REGEX.test(tags.amenity)) type = 'school';
                            else if (tags.tourism && HOTEL_REGEX.test(tags.tourism)) type = 'hotel';

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
                    if (isMounted) setIsLoading(false);
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
                return b.rating - a.rating;
            }
            return a.distance - b.distance;
        });
    }, [placesData, activeTab, placeSortBy]);

    // Report place counts to parent for sidebar badges
    useEffect(() => {
        if (onPlaceCounts) {
            onPlaceCounts({
                mall: placesData.mall.length,
                hospital: placesData.hospital.length,
                school: placesData.school.length,
                hotel: placesData.hotel.length,
            });
        }
    }, [placesData, onPlaceCounts]);

    return (
        <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900">
            {/* Header — Sort controls only (tabs moved to IconSidebar) */}
            <div className="border-b border-gray-100/50 dark:border-gray-700/50 bg-white dark:bg-gray-900 sticky top-0 z-20 flex flex-col">
                <div className="px-5 pb-3 pt-4 flex flex-row items-center justify-between gap-2">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-medium text-gray-900 dark:text-gray-100 tracking-tight">
                            {activeTab === 'projects' ? totalCount : sortedPlaces.length}
                        </span>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {activeTab === 'projects' ? 'projects found' : 'places found'}
                        </span>
                    </div>

                    <div className="relative group w-auto min-w-[140px]">
                        {activeTab === 'projects' ? (
                            <select
                                value={searchState.sortBy}
                                onChange={(e) => setSearchState(prev => ({ ...prev, sortBy: e.target.value as any }))}
                                className="w-full appearance-none pl-3 pr-8 h-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-black/5 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition shadow-sm cursor-pointer"
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
                                className="w-full appearance-none pl-3 pr-8 h-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-black/5 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition shadow-sm cursor-pointer"
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
            <div className="relative flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar">

                {/* PROJECTS TAB */}
                {activeTab === 'projects' && (
                    <div className="animate-fadeInUp pb-36">
                        {projects.map((p, idx) => {
                            const isSelected = selectedProjectId === p.projectId;
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
                                    className={`group relative flex items-start gap-3.5 px-3 py-3.5 cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)]
                                        ${isSelected
                                            ? 'bg-scbx/[0.04] dark:bg-scbx/[0.08]'
                                            : 'hover:bg-gray-50/70 dark:hover:bg-gray-800/30 hover:translate-x-0.5'
                                        }
                                    `}
                                >
                                    {/* Selection Indicator */}
                                    <div className={`absolute left-0 top-2 bottom-2 w-[3px] bg-gradient-to-b from-scbx to-scbx-400 rounded-r-full transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] origin-center ${isSelected ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}`} />

                                    {/* Editorial Index */}
                                    <div className="flex flex-col items-center justify-start pt-0.5 gap-0.5 min-w-[28px]">
                                        <span className={`font-mono text-xs font-medium tabular-nums transition-colors
                                            ${isSelected ? 'text-scbx' : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200'}
                                        `}>
                                            {String(idx + 1).padStart(2, '0')}
                                        </span>
                                        <span className="font-mono text-[8px] font-medium text-gray-300 dark:text-gray-600 tracking-wider uppercase">
                                            {p.code}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                        {/* Title + Developer */}
                                        <div>
                                            <h3 className={`font-medium text-[13px] leading-tight truncate tracking-tight transition-colors ${isSelected ? 'text-scbx' : 'text-gray-900 dark:text-gray-100 group-hover:text-scbx'}`} title={p.name}>
                                                {p.name}
                                            </h3>
                                            <div className="text-[9px] text-gray-400 dark:text-gray-500 truncate mt-0.5 uppercase tracking-widest font-medium">{p.developer}</div>
                                        </div>

                                        {/* Mini Progress Bar */}
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <div className="w-full h-[3px] bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-scbx to-scbx-400 rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.min(parseFloat(p.percentSold), 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-[9px] font-bold font-mono text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap min-w-[28px] text-right">
                                                {Math.round(parseFloat(p.percentSold))}%
                                            </span>
                                        </div>

                                        {/* Inline Data Row */}
                                        <div className="flex items-center gap-0 text-[9px] font-mono text-gray-400 dark:text-gray-500 flex-wrap">
                                            {launchDate !== '-' && (
                                                <>
                                                    <span className="flex items-center gap-0.5 text-gray-500 dark:text-gray-400">
                                                        <Calendar size={8} className="text-gray-400 dark:text-gray-500" />
                                                        {launchDate}
                                                    </span>
                                                    <span className="mx-1.5 text-gray-300 dark:text-gray-700">·</span>
                                                </>
                                            )}
                                            <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                                                {unitLeft.toLocaleString()} left
                                            </span>
                                            <span className="mx-1.5 text-gray-300 dark:text-gray-700">·</span>
                                            <span className="flex items-center gap-0.5 tabular-nums">
                                                <TrendingUp size={8} className="text-scbx" />
                                                <span className="text-gray-500 dark:text-gray-400">{p.saleSpeed6m}</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Price & Distance */}
                                    <div className="text-right w-[100px] shrink-0 flex flex-col items-end justify-start gap-1 pt-0.5">
                                        <div className="font-medium text-[11px] text-gray-600 dark:text-gray-400 whitespace-nowrap tracking-tight">
                                            {displayPrice}
                                        </div>
                                        {searchState.searchMode === 'location' && (
                                            <div className="text-[9px] text-gray-400 dark:text-gray-500 font-mono font-bold tracking-wider uppercase tabular-nums">
                                                {p.distance?.toFixed(1)} km
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {projects.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-24 px-6 text-center animate-fadeIn group">
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 bg-scbx dark:bg-emerald-500 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-700"></div>
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden flex items-center justify-center min-w-[80px] min-h-[80px]">
                                        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-transparent dark:from-gray-700 dark:to-transparent opacity-50"></div>
                                        <SearchX className="w-10 h-10 text-gray-400 dark:text-gray-500 relative z-10 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3" strokeWidth={1.5} />
                                    </div>
                                </div>
                                <h3 className="text-[13px] font-extrabold text-gray-800 dark:text-gray-100 uppercase tracking-widest mb-1.5">No Properties Found</h3>
                                <p className="text-gray-400 dark:text-gray-500 text-[11px] leading-relaxed max-w-[240px] font-medium">
                                    We couldn't find any projects matching your current filters. Try expanding your search area or removing some filters.
                                </p>
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
                    <div className="animate-fadeInUp pb-36">
                        {/* Disclaimer Note */}
                        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/50 px-4 py-2 flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <div className="text-[10px] text-amber-800 dark:text-amber-400 font-medium">
                                ข้อมูลในระบบอาจไม่ใช่ข้อมูลล่าสุด โปรดตรวจสอบความถูกต้องจากสถานที่จริงหรือแหล่งข้อมูลอ้างอิงอีกครั้ง
                            </div>
                        </div>

                        {sortedPlaces.map((place) => (
                            <div
                                key={place.id}
                                onClick={() => onPlaceClick && onPlaceClick(place)}
                                className="group relative flex items-start gap-3.5 px-3 py-3.5 cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] hover:bg-gray-50/70 dark:hover:bg-gray-800/30 hover:translate-x-0.5"
                            >
                                {/* Place Icon */}
                                <div className="flex flex-col items-center justify-start pt-1 min-w-[28px]">
                                    <div className={`flex items-center justify-center transition-colors opacity-80 group-hover:opacity-100 group-hover:scale-110 duration-300
                                        ${activeTab === 'mall' ? 'text-orange-500' :
                                            activeTab === 'hospital' ? 'text-red-500' :
                                                activeTab === 'school' ? 'text-blue-500' :
                                                    'text-purple-500'
                                        }`}>
                                        {activeTab === 'mall' ? <ShoppingBag size={16} strokeWidth={2} /> :
                                            activeTab === 'hospital' ? <Stethoscope size={16} strokeWidth={2} /> :
                                                activeTab === 'school' ? <GraduationCap size={16} strokeWidth={2} /> :
                                                    <Bed size={16} strokeWidth={2} />}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 flex flex-col gap-1.5 pt-0.5">
                                    <div>
                                        <h3 className="font-medium text-[13px] leading-tight truncate tracking-tight transition-colors text-gray-900 dark:text-gray-100 group-hover:text-scbx group-hover:dark:text-scbx" title={place.name}>
                                            {place.name}
                                        </h3>
                                        <div className="text-[9px] text-gray-400 dark:text-gray-500 truncate mt-0.5 tracking-wide">{place.address}</div>
                                    </div>
                                </div>

                                {/* Score & Distance */}
                                <div className="text-right w-[80px] shrink-0 flex flex-col items-end justify-start gap-1 pt-0.5">
                                    <div className="flex items-center gap-1 font-medium text-[11px] text-gray-600 dark:text-gray-400 whitespace-nowrap tracking-tight">
                                        <Star size={10} fill="currentColor" className="text-yellow-500 dark:text-yellow-600" />
                                        <span>{place.rating.toFixed(1)}</span>
                                    </div>
                                    <div className="text-[9px] text-gray-400 dark:text-gray-500 font-mono font-bold tracking-wider uppercase tabular-nums">
                                        {place.distance.toFixed(1)} km
                                    </div>
                                </div>
                            </div>
                        ))}
                        {sortedPlaces.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-24 px-6 text-center animate-fadeIn group">
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 bg-gray-400 dark:bg-gray-600 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-700"></div>
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden flex items-center justify-center min-w-[80px] min-h-[80px]">
                                        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-transparent dark:from-gray-700 dark:to-transparent opacity-50"></div>
                                        <MapPinOff className="w-10 h-10 text-gray-400 dark:text-gray-500 relative z-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" strokeWidth={1.5} />
                                    </div>
                                </div>
                                <h3 className="text-[13px] font-extrabold text-gray-800 dark:text-gray-100 uppercase tracking-widest mb-1.5">No Places Found</h3>
                                <p className="text-gray-400 dark:text-gray-500 text-[11px] leading-relaxed max-w-[240px] font-medium">
                                    We couldn't find any {activeTab === 'mall' ? 'malls' : activeTab === 'hospital' ? 'hospitals' : activeTab === 'school' ? 'schools' : 'hotels'} in this area. Try selecting a different location.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                </div>

                {/* Bottom fade gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/80 dark:from-gray-900 dark:via-gray-900/80 to-transparent pointer-events-none z-10" />
            </div>
        </div>
    );
};

export default ResultsPanel;