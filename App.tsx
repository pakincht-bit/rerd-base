import React, { useState, useEffect, useMemo } from 'react';
import { Map, FileText, UploadCloud, Download, Sparkles, X, FileSpreadsheet, Loader, Search, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, RefreshCw, MapPin, RotateCcw } from 'lucide-react';
import { Project, SearchState, AIAnalysisResult, NearbyPlace } from './types';
import Sidebar from './components/Sidebar';
import MapComponent from './components/Map';
import ProjectDetailPanel from './components/ProjectDetailPanel';
import ResultsPanel from './components/FilterModal'; // Renamed import for clarity context, though file remains FilterModal
import ExportDashboard from './components/ExportDashboard';
import { parseCSV } from './services/csvService';
import { generateMarketAnalysis } from './services/geminiService';
import { HiddenAIReportTemplate } from './components/HiddenExportTemplates';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import L from 'leaflet';

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
    
    // Toggle States (Renamed for clarity)
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true); // Left Panel (Filters)

    const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    // State for nearby places (Malls, Hospitals, Schools)
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
        maxPrice: null
    });

    const [unifiedSearchInput, setUnifiedSearchInput] = useState('13.7563, 100.5018');

    const [showUploadModal, setShowUploadModal] = useState(true);
    const [showExportModal, setShowExportModal] = useState(false);
    const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);

    // 1. Projects In View (Filter Logic based on Search Mode)
    const projectsInView = useMemo(() => {
        let data = projects.map(p => ({
            ...p,
            distance: calculateDistance(searchState.lat, searchState.lng, p.lat, p.lng)
        }));

        // Filter Logic branching based on Search Mode
        if (searchState.searchMode === 'location') {
            // Location Mode: Strict Radius Filter
            data = data.filter(p => (p.distance || 0) <= searchState.radius);
        } else {
            // Code Mode: Ignore Radius, show all projects initially (will be filtered by codeFilter in next step)
            // No operation needed here, data includes all projects
        }

        // Filter by Type
        if (searchState.typeFilter.length > 0) {
            data = data.filter(p => p.subUnits.some(u => searchState.typeFilter.includes(u.type)));
        }

        // Filter by Price
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

        return data;
    }, [projects, searchState.lat, searchState.lng, searchState.radius, searchState.typeFilter, searchState.minPrice, searchState.maxPrice, searchState.searchMode]);

    // 2. Final Filtered Projects (Code Filter + Sort)
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
                return leftB - leftA; // Descending: Most units left first
            }
            if (searchState.sortBy === 'launchDate') {
                const getLaunch = (p: Project) => {
                     const dates = p.subUnits.map(u => u.launchDate).filter(d => d && d !== '-');
                     if (dates.length === 0) return '';
                     return dates.sort()[0]; 
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
                // Also reset active place when moving location
                setActivePlace(null);
                return;
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
            maxPrice: null
        }));
    };

    const handleProjectSelect = (project: Project) => {
        setActiveProject(project);
        setSelectedProject(project);
        setActivePlace(null); // Clear place selection if a project is selected
    };

    const handlePlaceSelect = (place: NearbyPlace) => {
        setActivePlace(place);
        setSelectedProject(null); // Clear project selection if a place is selected
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

    // --- Dynamic Layout Logic ---
    const sidebarWidth = isSidebarExpanded ? 'min(calc(100% - 32px), 420px)' : '80px';
    const resultsPanelLeft = isSidebarExpanded ? 'md:left-[450px] left-4' : 'md:left-[110px] left-4';
    const detailsPanelClass = useMemo(() => {
        return isSidebarExpanded ? "xl:left-[850px] md:left-[450px] left-4" : "xl:left-[510px] md:left-[110px] left-4";
    }, [isSidebarExpanded]);

    return (
        <div className="flex flex-col h-screen text-[#222] overflow-hidden bg-gray-50 relative">
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

            {/* Header / Top Bar */}
            <header 
                className="fixed top-4 left-4 h-18 bg-white/75 backdrop-blur-2xl border border-white/50 shadow-xl rounded-2xl z-50 flex items-center justify-between px-6 transition-all duration-300"
                style={{ width: 'min(calc(100% - 32px), 420px)' }}
            >
                <div className="flex items-center gap-2 text-scbx font-bold text-2xl select-none">
                    <Map className="w-8 h-8 fill-current drop-shadow-sm" />
                    <span className="tracking-tight">RERD</span>
                </div>
                <div className="flex items-center justify-end flex-1 gap-3">
                     {fileName && (
                        <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-3 pr-4 py-1.5 bg-transparent hover:bg-white/50 border border-transparent hover:border-white/60 rounded-full transition-all group cursor-pointer h-12">
                            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm text-scbx ml-1.5">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col items-start min-w-0">
                                <span className="text-xs font-bold text-gray-900 leading-none mb-0.5">{projects.length} Projects</span>
                                <span className="text-[10px] text-gray-500 font-medium truncate max-w-[120px] leading-none">{fileName}</span>
                            </div>
                            <div className="w-px h-6 bg-gray-300/50 mx-1"></div>
                            <div className="bg-gray-100 rounded-full p-1.5 group-hover:bg-scbx group-hover:text-white transition-colors">
                                 <RefreshCw className="w-3.5 h-3.5" />
                            </div>
                        </button>
                     )}
                </div>
            </header>

             {/* Right Top Actions */}
            <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
                 <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 h-14 px-5 bg-white/75 backdrop-blur-2xl border border-white/50 shadow-xl rounded-2xl text-gray-700 font-bold hover:bg-white transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer">
                    <Download className="w-5 h-5 text-scbx" />
                    <span>Export report</span>
                </button>
            </div>

            {projects.length === 0 ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-sm">
                    <div className="text-center space-y-6 bg-white/80 backdrop-blur-xl p-12 rounded-3xl shadow-2xl border border-white/50 max-w-lg mx-4">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-indigo-50 text-scbx shadow-inner">
                            <Map className="w-12 h-12 drop-shadow-sm" />
                        </div>
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Real Estate Dashboard</h1>
                        <p className="text-lg text-gray-600 font-medium">Upload your CSV to visualize and analyze market data</p>
                        <button onClick={() => setShowUploadModal(true)} className="bg-scbx hover:bg-scbxHover text-white px-10 py-4 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition transform hover:-translate-y-1">
                            Upload CSV
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <ProjectDetailPanel 
                        project={selectedProject} 
                        onClose={() => setSelectedProject(null)} 
                        className={detailsPanelClass}
                    />
                    
                    {/* LEFT PANEL: Sidebar (Filters & Search) */}
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

                    {/* RESULTS PANEL: Positions dynamically next to sidebar */}
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
                </>
            )}

            {showUploadModal && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white/75 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-md p-8 relative border border-white/50 animate-in zoom-in-95 duration-200">
                         {projects.length > 0 && (
                            <button onClick={() => setShowUploadModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-black transition">
                                <X className="w-6 h-6" />
                            </button>
                         )}
                        <h3 className="text-2xl font-bold text-gray-900 mb-6">Import Data</h3>
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

            {showExportModal && (
                <ExportDashboard 
                    projects={filteredProjects} 
                    radius={searchState.radius} 
                    onClose={() => setShowExportModal(false)} 
                    onDownload={downloadDashboardImage}
                    activeTypes={searchState.typeFilter}
                />
            )}

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