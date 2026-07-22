import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UploadCloud, X, Loader, RefreshCw, Maximize2, Minimize2, Database } from 'lucide-react';
import { Project, SearchState, NearbyPlace } from './types';
import IconSidebar, { SidebarTab } from './components/IconSidebar';
import FeedbackWidget from './components/FeedbackWidget';
import MapComponent from './components/Map';
import ProjectDetailPanel from './components/ProjectDetailPanel';
import ResultsPanel from './components/FilterModal';
import ExportDashboard from './components/ExportDashboard';
import FloatingFilterBar from './components/FloatingFilterBar';
import WelcomeModal from './components/WelcomeModal';
import AuthModal from './components/AuthModal';
import { useAuth } from './services/AuthContext';
import { parseCSV, parseCSVFromText } from './services/csvService';
import { fetchBookmarks, addBookmark, removeBookmark } from './services/bookmarkService';
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
    const { user, profile, signOut } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);

    const [projects, setProjects] = useState<Project[]>([]);
    const [fileName, setFileName] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('');

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
        priceSegment: null,
        developerFilter: []
    });

    const [unifiedSearchInput, setUnifiedSearchInput] = useState('13.7563, 100.5018');

    const [showUploadModal, setShowUploadModal] = useState(true);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<SidebarTab>('projects');
    const [placeCounts, setPlaceCounts] = useState({ mall: 0, hospital: 0, school: 0, hotel: 0 });
    const [visibleLayers, setVisibleLayers] = useState({ projects: true, mall: false, hospital: false, school: false, hotel: false });
    const [focusMode, setFocusMode] = useState(false);
    const [rulerActive, setRulerActive] = useState(false);
    const [rulerPoints, setRulerPoints] = useState<{ a: [number, number] | null; b: [number, number] | null }>({ a: null, b: null });
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [excludedProjectIds, setExcludedProjectIds] = useState<Set<string>>(new Set());
    const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

    // Fetch bookmarks when user signs in
    useEffect(() => {
        if (user) {
            fetchBookmarks(user.id).then(ids => {
                setBookmarkedIds(new Set(ids));
            });
        } else {
            setBookmarkedIds(new Set());
        }
    }, [user]);

    const toggleBookmark = useCallback(async (projectId: string) => {
        if (!user) {
            setShowAuthModal(true);
            return;
        }
        const isCurrentlyBookmarked = bookmarkedIds.has(projectId);
        // Optimistic update
        setBookmarkedIds(prev => {
            const next = new Set(prev);
            if (isCurrentlyBookmarked) {
                next.delete(projectId);
            } else {
                next.add(projectId);
            }
            return next;
        });
        // Persist to Supabase
        const success = isCurrentlyBookmarked
            ? await removeBookmark(user.id, projectId)
            : await addBookmark(user.id, projectId);
        if (!success) {
            // Revert on failure
            setBookmarkedIds(prev => {
                const next = new Set(prev);
                if (isCurrentlyBookmarked) {
                    next.add(projectId);
                } else {
                    next.delete(projectId);
                }
                return next;
            });
        }
    }, [user, bookmarkedIds]);

    useEffect(() => {
        const hasSeenWelcome = localStorage.getItem('radia_welcome_v2');
        if (!hasSeenWelcome) {
            setShowWelcomeModal(true);
        }
    }, []);

    // Hotkey: R to toggle ruler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
            if (e.key === 'r' || e.key === 'R') {
                setRulerActive(prev => !prev);
                setRulerPoints({ a: null, b: null });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const toggleLayer = (layer: keyof typeof visibleLayers) => {
        setVisibleLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Ensure light mode is always active
    useEffect(() => {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }, []);

    const projectsWithDistance = useMemo(() => {
        return projects.map(p => ({
            ...p,
            distance: calculateDistance(searchState.lat, searchState.lng, p.lat, p.lng)
        }));
    }, [projects, searchState.lat, searchState.lng]);

    const sortProjects = useCallback((data: Project[]) => {
        return [...data].sort((a, b) => {
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
    }, [searchState.sortBy]);

    const projectsInView = useMemo(() => {
        let data = [...projectsWithDistance];

        if (searchState.searchMode === 'location') {
            data = data.filter(p => (p.distance || 0) <= searchState.radius);
        }

        if (searchState.typeFilter.length > 0) {
            data = data.filter(p => p.subUnits.some(u => searchState.typeFilter.includes(u.type)));
        }

        if (searchState.developerFilter.length > 0) {
            data = data.filter(p => searchState.developerFilter.includes(p.developer));
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
                return projectMin < range.max && projectMax >= range.min;
            });
        }

        return data;
    }, [projects, searchState.lat, searchState.lng, searchState.radius, searchState.typeFilter, searchState.developerFilter, searchState.minPrice, searchState.maxPrice, searchState.minLaunchDate, searchState.maxSoldPercent, searchState.priceSegment, searchState.searchMode]);

    const filteredProjects = useMemo(() => {
        let data = [...projectsInView];
        // Apply manual exclusions
        if (excludedProjectIds.size > 0) {
            data = data.filter(p => !excludedProjectIds.has(p.projectId));
        }
        if (searchState.codeFilter.length > 0) {
            data = data.filter(p => searchState.codeFilter.includes(p.code));
        }
        return sortProjects(data);
    }, [projectsInView, searchState.codeFilter, sortProjects, excludedProjectIds]);

    const bookmarkedProjects = useMemo(() => {
        const bookmarked = projectsWithDistance.filter(p => bookmarkedIds.has(p.projectId));
        return sortProjects(bookmarked);
    }, [projectsWithDistance, bookmarkedIds, sortProjects]);

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
            if (data.length === 0) {
                alert('No valid projects found in this CSV. Check that it has ID or Code, Latitude/Lat, and Longitude/Lon columns.');
                return;
            }
            setProjects(data);
            setFileName(file.name);
            const initialLat = data[0].lat;
            const initialLng = data[0].lng;
            setSearchState(prev => ({ ...prev, lat: initialLat, lng: initialLng }));
            setUnifiedSearchInput(`${initialLat.toFixed(5)}, ${initialLng.toFixed(5)}`);
            setShowUploadModal(false);
        } catch (err) {
            alert('Failed to parse CSV');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadDemo = async () => {
        setLoading(true);
        setLoadingText('Loading demo data...');
        try {
            const res = await fetch('/demo-data.csv');
            const text = await res.text();
            const data = parseCSVFromText(text);
            setProjects(data);
            setFileName('demo-data.csv');
            if (data.length > 0) {
                const initialLat = data[0].lat;
                const initialLng = data[0].lng;
                setSearchState(prev => ({ ...prev, lat: initialLat, lng: initialLng, radius: 5 }));
                setUnifiedSearchInput(`${initialLat.toFixed(5)}, ${initialLng.toFixed(5)}`);
                setShowUploadModal(false);
            }
        } catch (err) {
            alert('Failed to load demo data');
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
                setSearchState(prev => {
                    // Small hack to ensure MapUpdater re-triggers even if coords match exactly, 
                    // because the user might have dragged the map and wants to re-center.
                    const newLat = prev.lat === lat ? lat + 0.0000000000001 : lat;
                    return { ...prev, lat: newLat, lng };
                });
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
            developerFilter: [],
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
            link.download = `Radia_Dashboard_Summary.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error("Export failed", err);
        } finally {
            setLoading(false);
        }
    };

    // Layout constants
    const ICON_SIDEBAR_WIDTH = 64;
    const PROPERTY_LIST_WIDTH = 360;

    return (
        <div className="flex flex-col h-screen text-[#222] dark:text-gray-100 overflow-hidden bg-gray-50 dark:bg-gray-950 relative transition-colors duration-300">
            {/* Background Map — full screen */}
            <div className="absolute inset-0 z-0">
                <MapComponent
                    center={[searchState.lat, searchState.lng]}
                    projects={filteredProjects}
                    bookmarkedProjects={bookmarkedProjects}
                    radius={searchState.radius}
                    searchMode={searchState.searchMode}
                    hoveredProjectId={hoveredProjectId}
                    activeProject={activeProject}
                    onMarkerClick={handleProjectSelect}
                    nearbyPlaces={nearbyPlaces}
                    activePlace={activePlace}
                    visibleLayers={visibleLayers}
                    rulerActive={rulerActive}
                    rulerPoints={rulerPoints}
                    setRulerPoints={setRulerPoints}
                    bookmarkedIds={bookmarkedIds}
                    onToggleBookmark={toggleBookmark}
                    isSignedIn={!!user}
                    onSignInClick={() => setShowAuthModal(true)}
                    onExcludeProject={(id) => {
                        setExcludedProjectIds(prev => {
                            const next = new Set(prev);
                            next.add(id);
                            return next;
                        });
                        showToast('Project hidden from analysis');
                    }}
                />
            </div>

            {/* Focus Mode Toggle — always visible */}
            <button
                onClick={() => setFocusMode(prev => !prev)}
                className="fixed bottom-4 right-4 z-50 w-10 h-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-xl shadow-premium border border-gray-100/50 dark:border-gray-700/50 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white active:opacity-80 transition-colors"
                title={focusMode ? 'Exit focus mode' : 'Focus mode'}
            >
                {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Icon Sidebar — far left */}
            <div className={`transition-opacity duration-300 ${focusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <IconSidebar
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    counts={{ projects: filteredProjects.length, ...placeCounts }}
                    visibleLayers={visibleLayers}
                    onToggleLayer={toggleLayer}
                    onFeedbackClick={() => setShowFeedbackModal(true)}
                    onWhatsNewClick={() => setShowWelcomeModal(true)}
                    user={user}
                    profile={profile}
                    onSignInClick={() => setShowAuthModal(true)}
                    onSignOut={signOut}
                />
            </div>

            {/* Export Report button — top right */}
            <div className={`fixed top-4 right-4 z-40 transition-opacity duration-300 ${focusMode ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
                <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-xl shadow-premium border border-gray-100/50 dark:border-gray-700/50 px-2 py-1.5 panel-grain">
                    {fileName && (
                        <div className="flex items-center px-2">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mr-1.5">Data:</span>
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate max-w-[100px]">{fileName}</span>
                            <button onClick={() => setShowUploadModal(true)} className="ml-1.5 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-scbx transition-colors">
                                <RefreshCw className="w-3 h-3" />
                            </button>
                            <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 ml-2"></div>
                        </div>
                    )}
                    <button
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-scbx text-white font-display font-normal hover:bg-scbxHover active:opacity-80 transition-colors group text-xs shadow-[inset_0_1px_8px_rgba(255,255,255,0.2),inset_0_-1px_4px_rgba(0,0,0,0.15)]"
                    >
                        <span>Export report</span>
                    </button>
                </div>
            </div>

            {/* Property List Panel — next to icon sidebar */}
            <div
                className={`absolute top-3 bottom-3 z-10 bg-white dark:bg-gray-900 shadow-premium-lg border border-gray-100/50 dark:border-gray-700/50 rounded-lg flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] overflow-hidden panel-grain ${focusMode ? 'opacity-0 pointer-events-none -translate-x-full' : 'opacity-100 translate-x-0'}`}
                style={{ left: ICON_SIDEBAR_WIDTH + 20, width: PROPERTY_LIST_WIDTH }}
            >
                <ResultsPanel
                    projects={filteredProjects}
                    bookmarkedProjects={bookmarkedProjects}
                    totalCount={filteredProjects.length}
                    searchState={searchState}
                    setSearchState={setSearchState}
                    onProjectClick={handleProjectSelect}
                    onProjectHover={(id) => setHoveredProjectId(id)}
                    selectedProjectId={selectedProject?.projectId || null}
                    onPlacesFetched={setNearbyPlaces}
                    onPlaceClick={handlePlaceSelect}
                    activeTab={activeTab}
                    onPlaceCounts={setPlaceCounts}
                    excludedCount={excludedProjectIds.size}
                    onExcludeProject={(id) => {
                        setExcludedProjectIds(prev => {
                            const next = new Set(prev);
                            next.add(id);
                            return next;
                        });
                        showToast('Project hidden from analysis');
                    }}
                    onRestoreAll={() => {
                        setExcludedProjectIds(new Set());
                        showToast('All hidden projects restored');
                    }}
                    bookmarkedIds={bookmarkedIds}
                    onToggleBookmark={toggleBookmark}
                    isSignedIn={!!user}
                    onSignInClick={() => setShowAuthModal(true)}
                />
            </div>

            {/* Project Details Panel (Conditional on selection) */}
            <div className={`transition-opacity duration-300 ${focusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <ProjectDetailPanel
                    project={selectedProject}
                    onClose={() => setSelectedProject(null)}
                    className={`left-3 md:left-[452px]`}
                    isBookmarked={selectedProject ? bookmarkedIds.has(selectedProject.projectId) : false}
                    onToggleBookmark={() => {
                        if (selectedProject) toggleBookmark(selectedProject.projectId);
                    }}
                />
            </div>

            {/* Floating Filter Bar — bottom center */}
            <div className={`transition-opacity duration-300 ${focusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <FloatingFilterBar
                    searchState={searchState}
                    setSearchState={setSearchState}
                    availableTypes={availableTypes}
                    allProjects={projects}
                    unifiedSearchInput={unifiedSearchInput}
                    setUnifiedSearchInput={setUnifiedSearchInput}
                    handleSearchAction={handleSearchAction}
                    handleResetFilters={handleResetFilters}
                    rulerActive={rulerActive}
                    onToggleRuler={() => {
                        setRulerActive(prev => !prev);
                        setRulerPoints({ a: null, b: null });
                    }}
                />
            </div>

            {/* Upload Modal Overlay */}
            {showUploadModal && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-xl shadow-premium-lg w-full max-w-md p-8 relative border border-white/50 dark:border-gray-700/50 animate-in zoom-in-95 duration-200">
                        {projects.length > 0 && (
                            <button onClick={() => setShowUploadModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-black transition">
                                <X className="w-6 h-6" />
                            </button>
                        )}
                        <h3 className="text-2xl font-medium text-gray-900 dark:text-gray-100 mb-6 text-center tracking-tight">Import Data</h3>
                        <div className="bg-white/50 dark:bg-gray-800/50 rounded-2xl p-10 border-2 border-dashed border-gray-300 dark:border-gray-600 text-center hover:bg-white/80 dark:hover:bg-gray-700/80 hover:border-scbx transition-all cursor-pointer relative group">
                            <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <div className="bg-white dark:bg-gray-700 p-4 rounded-full inline-block shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                <UploadCloud className="w-8 h-8 text-scbx" />
                            </div>
                            <p className="text-base font-medium text-gray-800 dark:text-gray-200">Click to upload CSV</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">or drag and drop file here</p>
                        </div>
                        <div className="relative flex items-center my-5">
                            <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
                            <span className="px-3 text-xs text-gray-400 font-medium">or</span>
                            <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
                        </div>
                        <button
                            onClick={handleLoadDemo}
                            className="w-full h-12 rounded-xl bg-scbx text-white font-display font-normal hover:bg-scbxHover active:opacity-80 transition-all text-sm shadow-[inset_0_1px_8px_rgba(255,255,255,0.2),inset_0_-1px_4px_rgba(0,0,0,0.15)] flex items-center justify-center gap-2"
                        >
                            <Database className="w-4 h-4" />
                            <span>Try with sample data</span>
                        </button>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-2">Explore 42 fictional projects across Bangkok</p>
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

            {loading && (
                <div className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-md flex items-center justify-center">
                    <div className="bg-white/75 dark:bg-gray-900/75 backdrop-blur-2xl p-8 rounded-xl shadow-premium-lg flex flex-col items-center border border-white/50 dark:border-gray-700/50">
                        <Loader className="w-12 h-12 text-scbx animate-spin mb-4" />
                        <span className="text-base font-bold text-gray-800 dark:text-gray-200">{loadingText}</span>
                    </div>
                </div>
            )}

            {toastMessage && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] bg-gray-900 dark:bg-gray-800 text-white px-5 py-3 rounded-xl shadow-premium-lg text-sm flex items-center justify-center font-bold tracking-tight animate-in slide-in-from-bottom-5 fade-in duration-300">
                    {toastMessage}
                </div>
            )}

            {showFeedbackModal && (
                <FeedbackWidget 
                    onClose={() => setShowFeedbackModal(false)}
                    onFeedbackSubmitted={(hasDescription: boolean) => {
                        if (!hasDescription) {
                            setShowFeedbackModal(false);
                            showToast("Thanks for your feedback");
                        }
                    }}
                />
            )}

            {showWelcomeModal && (
                <WelcomeModal onClose={() => {
                    localStorage.setItem('radia_welcome_v2', 'true');
                    setShowWelcomeModal(false);
                }} />
            )}

            {showAuthModal && (
                <AuthModal onClose={() => setShowAuthModal(false)} />
            )}
        </div>
    );
};

export default App;