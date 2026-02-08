import React, { useState, useEffect, useMemo } from 'react';
import { Map as MapIcon, FileText, UploadCloud, Download, Sparkles, X, FileSpreadsheet, Loader, Search, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, RefreshCw, MapPin, RotateCcw, Upload } from 'lucide-react';
import { Project, SearchState, AIAnalysisResult, NearbyPlace } from './types';
import Sidebar from './components/Sidebar';
import MapComponent from './components/Map';
import ProjectDetailPanel from './components/ProjectDetailPanel';
import ResultsPanel from './components/FilterModal';
import ExportDashboard from './components/ExportDashboard';
import { parseCSV } from './services/csvService';
import { generateMarketAnalysis } from './services/geminiService';
import html2canvas from 'html2canvas';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const App: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [fileName, setFileName] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('');

    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

    const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
    const [activePlace, setActivePlace] = useState<NearbyPlace | null>(null);

    const [searchState, setSearchState] = useState<SearchState>({
        lat: 13.7563,
        lng: 100.5018,
        radius: 3,
        searchMode: 'location',
        codeFilter: [],
        typeFilter: [],
        sortBy: 'distance',
        minPrice: null,
        maxPrice: null,
        minLaunchDate: null,
        maxSoldPercent: 100,
        priceSegment: null
    });

    const [unifiedSearchInput, setUnifiedSearchInput] = useState('13.7563, 100.5018');

    const [showUploadModal, setShowUploadModal] = useState(true);
    const [showExportModal, setShowExportModal] = useState(false);

    const projectsInView = useMemo(() => {
        let data = projects.map(p => ({
            ...p,
            distance: calculateDistance(searchState.lat, searchState.lng, p.lat, p.lng)
        }));

        if (searchState.searchMode === 'location') {
            data = data.filter(p => (p.distance || 0) <= searchState.radius);
        }

        if (searchState.typeFilter.length > 0) {
            data = data.filter(p => p.subUnits.some(u => searchState.typeFilter.includes(u.type)));
        }

        if (searchState.minPrice !== null || searchState.maxPrice !== null) {
            data = data.filter(p => {
                const validPrices = p.subUnits.map(u => u.price).filter(price => price > 0);
                if (validPrices.length === 0) return false;
                const projectMin = Math.min(...validPrices);
                const projectMax = Math.max(...validPrices);
                const meetsMin = searchState.minPrice !== null ? projectMax >= searchState.minPrice : true;
                const meetsMax = searchState.maxPrice !== null ? projectMin <= searchState.maxPrice : true;
                return meetsMin && meetsMax;
            });
        }

        if (searchState.minLaunchDate) {
            const minVal = parseFloat(searchState.minLaunchDate);
            if (!isNaN(minVal)) {
                data = data.filter(p => {
                    const validDates = p.subUnits
                        .map(u => parseFloat(u.launchDate))
                        .filter(d => !isNaN(d));

                    if (validDates.length === 0) return false;
                    return validDates.some(d => d >= minVal);
                });
            }
        }

        if (searchState.maxSoldPercent < 100) {
            data = data.filter(p => parseFloat(p.percentSold) <= searchState.maxSoldPercent);
        }

        // Price segment filter
        if (searchState.priceSegment) {
            const getSegmentRange = (seg: string): { min: number, max: number } => {
                switch (seg) {
                    case '< 0.5': return { min: 0, max: 0.5 };
                    case '0.5-1.0': return { min: 0.5, max: 1.0 };
                    case '1.0-2.0': return { min: 1.0, max: 2.0 };
                    case '2.0-3.0': return { min: 2.0, max: 3.0 };
                    case '3.0-5.0': return { min: 3.0, max: 5.0 };
                    case '5.0-10': return { min: 5.0, max: 10 };
                    case '10-20': return { min: 10, max: 20 };
                    case '> 20': return { min: 20, max: Infinity };
                    default: return { min: 0, max: Infinity };
                }
            };
            const range = getSegmentRange(searchState.priceSegment);
            data = data.filter(p => {
                const validPrices = p.subUnits.map(u => u.price).filter(price => price > 0);
                if (validPrices.length === 0) return false;
                const projectMin = Math.min(...validPrices);
                const projectMax = Math.max(...validPrices);
                // Project overlaps with segment if projectMin < range.max AND projectMax >= range.min
                return projectMin < range.max && projectMax >= range.min;
            });
        }

        return data;
    }, [projects, searchState.lat, searchState.lng, searchState.radius, searchState.typeFilter, searchState.minPrice, searchState.maxPrice, searchState.minLaunchDate, searchState.maxSoldPercent, searchState.priceSegment, searchState.searchMode]);

    const filteredProjects = useMemo(() => {
        let data = [...projectsInView];
        if (searchState.codeFilter.length > 0) {
            data = data.filter(p => searchState.codeFilter.includes(p.code));
        }
        return data.sort((a, b) => {
            if (searchState.sortBy === 'percentSold') return parseFloat(b.percentSold) - parseFloat(a.percentSold);
            if (searchState.sortBy === 'speed6m') return parseFloat(b.saleSpeed6m) - parseFloat(a.saleSpeed6m);
            if (searchState.sortBy === 'speed') return parseFloat(b.saleSpeed) - parseFloat(a.saleSpeed);
            if (searchState.sortBy === 'unitLeft') {
                const leftA = a.totalUnits - a.soldUnits;
                const leftB = b.totalUnits - b.soldUnits;
                return leftB - leftA;
            }
            if (searchState.sortBy === 'launchDate') {
                const getLaunch = (p: Project) => {
                    const dates = p.subUnits.map(u => u.launchDate).filter(d => d && d !== '-').sort();
                    return dates.length > 0 ? dates[0] : '';
                };
                const dateA = getLaunch(a);
                const dateB = getLaunch(b);
                return dateB.localeCompare(dateA);
            }
            if (searchState.sortBy === 'priceAsc' || searchState.sortBy === 'priceDesc') {
                const getPrice = (p: Project) => {
                    const prices = p.subUnits.map(u => u.price).filter(x => x > 0);
                    return prices.length > 0 ? Math.min(...prices) : 0;
                };
                const priceA = getPrice(a);
                const priceB = getPrice(b);
                if (priceA === 0 && priceB > 0) return 1;
                if (priceB === 0 && priceA > 0) return -1;
                return searchState.sortBy === 'priceAsc' ? priceA - priceB : priceB - priceA;
            }
            return (a.distance || 0) - (b.distance || 0);
        });
    }, [projectsInView, searchState.codeFilter, searchState.sortBy]);

    const availableTypes = useMemo(() => {
        const types = new Set<string>();
        projects.forEach(p => p.subUnits.forEach(u => types.add(u.type)));
        return Array.from(types).sort();
    }, [projects]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        setLoadingText('Parsing CSV...');
        try {
            const data = await parseCSV(file);
            setProjects(data);
            setFileName(file.name);
            if (data.length > 0) {
                const initialLat = data[0].lat;
                const initialLng = data[0].lng;
                setSearchState(prev => ({ ...prev, lat: initialLat, lng: initialLng }));
                setUnifiedSearchInput(`${initialLat.toFixed(5)}, ${initialLng.toFixed(5)}`);
                setShowUploadModal(false);
            }
        } catch (err) {
            alert('Failed to parse CSV');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchAction = () => {
        if (searchState.searchMode !== 'location') return;
        const query = unifiedSearchInput.trim();
        if (!query) return;
        const parts = query.split(',');
        if (parts.length === 2) {
            const lat = parseFloat(parts[0].trim());
            const lng = parseFloat(parts[1].trim());
            if (!isNaN(lat) && !isNaN(lng)) {
                setSearchState(prev => ({ ...prev, lat, lng }));
                setSelectedProject(null);
                setActivePlace(null);
            }
        }
    };

    const handleResetFilters = () => {
        setSearchState(prev => ({
            ...prev,
            radius: 3,
            codeFilter: [],
            typeFilter: [],
            minPrice: null,
            maxPrice: null,
            minLaunchDate: null,
            maxSoldPercent: 100
        }));
    };

    const handleProjectSelect = (project: Project) => {
        setActiveProject(project);
        setSelectedProject(project);
        setActivePlace(null);
    };

    const handlePlaceSelect = (place: NearbyPlace) => {
        setActivePlace(place);
        setSelectedProject(null);
        setActiveProject(null);
    };

    const downloadDashboardImage = async () => {
        const element = document.getElementById('dashboard-export-container');
        if (!element) return;
        setLoading(true);
        setLoadingText('Generating Dashboard Image...');
        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#f9fafb' });
            const link = document.createElement('a');
            link.download = `RERD_Dashboard_Summary.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error("Export failed", err);
        } finally {
            setLoading(false);
        }
    };

    const sidebarWidth = isSidebarExpanded ? 'min(calc(100% - 32px), 420px)' : '80px';
    const resultsPanelLeft = isSidebarExpanded ? 'md:left-[450px] left-4' : 'md:left-[110px] left-4';
    const detailsPanelClass = useMemo(() => {
        return isSidebarExpanded ? "xl:left-[850px] md:left-[450px] left-4" : "xl:left-[510px] md:left-[110px] left-4";
    }, [isSidebarExpanded]);

    return (
        <div className="flex flex-col h-screen text-[#222] overflow-hidden bg-gray-50 relative">
            {/* Background Map */}
            <div className="absolute inset-0 z-0">
                <MapComponent
                    center={[searchState.lat, searchState.lng]}
                    projects={filteredProjects}
                    radius={searchState.radius}
                    searchMode={searchState.searchMode}
                    hoveredProjectId={hoveredProjectId}
                    activeProject={activeProject}
                    onMarkerClick={handleProjectSelect}
                    nearbyPlaces={nearbyPlaces}
                    activePlace={activePlace}
                />
            </div>

            {/* Top Bar Navigation (Matching Screenshot Design) */}
            <header className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
                {/* Brand Pill */}
                <div className="flex items-center h-12 bg-white rounded-full shadow-lg border border-white/50 px-4 pointer-events-auto">
                    <div className="flex items-center gap-2 text-scbx font-bold text-xl select-none">
                        <MapIcon className="w-6 h-6 fill-current" />
                        <span className="tracking-tight">RERD</span>
                    </div>
                    {fileName && (
                        <div className="flex items-center ml-4 pl-4 border-l border-gray-100 min-w-0">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mr-2">Loaded:</span>
                            <span className="text-xs font-bold text-gray-800 truncate max-w-[120px]">{fileName}</span>
                            <button onClick={() => setShowUploadModal(true)} className="ml-2 p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-scbx transition-colors">
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                    {!fileName && (
                        <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-100 text-scbx hover:text-scbxHover transition-colors">
                            <Upload className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wide">Upload CSV</span>
                        </button>
                    )}
                </div>

                {/* Export Button Pill */}
                <div className="pointer-events-auto">
                    <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 h-12 px-6 bg-white rounded-full shadow-lg border border-white/50 text-gray-800 font-bold hover:bg-gray-50 transition-all hover:scale-105 active:scale-95 group">
                        <Download className="w-5 h-5 text-scbx group-hover:translate-y-0.5 transition-transform" />
                        <span className="text-sm">Export report</span>
                    </button>
                </div>
            </header>

            {/* Project Details Panel (Conditional on selection) */}
            <ProjectDetailPanel
                project={selectedProject}
                onClose={() => setSelectedProject(null)}
                className={detailsPanelClass}
            />

            {/* Sidebar (Filters) */}
            <div
                className="absolute top-24 left-4 bottom-4 z-20 transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
                style={{ width: sidebarWidth }}
            >
                <div className="h-full w-full bg-white/75 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden flex flex-col relative transition-all duration-300">
                    <Sidebar
                        searchState={searchState}
                        setSearchState={setSearchState}
                        availableTypes={availableTypes}
                        allProjects={projects}
                        unifiedSearchInput={unifiedSearchInput}
                        setUnifiedSearchInput={setUnifiedSearchInput}
                        handleSearchAction={handleSearchAction}
                        handleResetFilters={handleResetFilters}
                        isCollapsed={!isSidebarExpanded}
                        onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)}
                    />
                </div>
            </div>

            {/* Results Panel */}
            <div
                className={`
                    absolute top-24 bottom-4 z-10
                    ${resultsPanelLeft}
                    w-[min(calc(100%-16px),380px)]
                    bg-white/75 backdrop-blur-2xl shadow-2xl rounded-3xl border border-white/50
                    flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] origin-left
                    translate-x-0 opacity-100
                `}
            >
                <ResultsPanel
                    projects={filteredProjects}
                    totalCount={filteredProjects.length}
                    searchState={searchState}
                    setSearchState={setSearchState}
                    onProjectClick={handleProjectSelect}
                    onProjectHover={(id) => setHoveredProjectId(id)}
                    selectedProjectId={selectedProject?.projectId || null}
                    onPlacesFetched={setNearbyPlaces}
                    onPlaceClick={handlePlaceSelect}
                />
            </div>

            {/* Upload Modal Overlay */}
            {showUploadModal && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-md p-8 relative border border-white/50 animate-in zoom-in-95 duration-200">
                        {projects.length > 0 && (
                            <button onClick={() => setShowUploadModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-black transition">
                                <X className="w-6 h-6" />
                            </button>
                        )}
                        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Import Market Data</h3>
                        <div className="bg-white/50 rounded-2xl p-10 border-2 border-dashed border-gray-300 text-center hover:bg-white/80 hover:border-scbx transition-all cursor-pointer relative group">
                            <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <div className="bg-white p-4 rounded-full inline-block shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                <UploadCloud className="w-8 h-8 text-scbx" />
                            </div>
                            <p className="text-base font-bold text-gray-800">Click to upload CSV</p>
                            <p className="text-xs text-gray-500 mt-1">or drag and drop file here</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Export View */}
            {showExportModal && (
                <ExportDashboard
                    projects={filteredProjects}
                    radius={searchState.radius}
                    onClose={() => setShowExportModal(false)}
                    onDownload={downloadDashboardImage}
                    activeTypes={searchState.typeFilter}
                    selectedProject={selectedProject}
                />
            )}

            {/* Loading Indicator */}
            {loading && (
                <div className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-md flex items-center justify-center">
                    <div className="bg-white/75 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl flex flex-col items-center border border-white/50">
                        <Loader className="w-12 h-12 text-scbx animate-spin mb-4" />
                        <span className="text-base font-bold text-gray-800">{loadingText}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;