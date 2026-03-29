import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SearchState, Project } from '../types';
import { MapPin, Hash, Search, ChevronDown, Home, Calendar, Percent, DollarSign, RotateCcw, Check, LocateFixed, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingFilterBarProps {
    searchState: SearchState;
    setSearchState: React.Dispatch<React.SetStateAction<SearchState>>;
    availableTypes: string[];
    allProjects: Project[];
    unifiedSearchInput: string;
    setUnifiedSearchInput: (val: string) => void;
    handleSearchAction: () => void;
    handleResetFilters: () => void;
    rulerActive: boolean;
    onToggleRuler: () => void;
}

type PopoverId = 'type' | 'launch' | 'sold' | 'price' | 'code' | 'developer' | null;

const FloatingFilterBar: React.FC<FloatingFilterBarProps> = ({
    searchState,
    setSearchState,
    availableTypes,
    allProjects,
    unifiedSearchInput,
    setUnifiedSearchInput,
    handleSearchAction,
    handleResetFilters,
    rulerActive,
    onToggleRuler,
}) => {
    const [activePopover, setActivePopover] = useState<PopoverId>(null);
    const [areaSearchQuery, setAreaSearchQuery] = useState('');
    const [devSearchQuery, setDevSearchQuery] = useState('');
    const barRef = useRef<HTMLDivElement>(null);

    // Close popover on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (barRef.current && !barRef.current.contains(e.target as Node)) {
                setActivePopover(null);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const togglePopover = (id: PopoverId) => {
        setActivePopover(prev => prev === id ? null : id);
    };

    // ─── Computed Data ───
    const uniqueCodes = useMemo(() => {
        return Array.from(new Set(allProjects.map(p => p.code).filter(Boolean))).sort();
    }, [allProjects]);

    const filteredUniqueCodes = useMemo(() => {
        if (!areaSearchQuery) return uniqueCodes;
        const q = areaSearchQuery.toLowerCase();
        return uniqueCodes.filter(code => code.toLowerCase().includes(q));
    }, [uniqueCodes, areaSearchQuery]);

    const uniqueDevelopers = useMemo(() => {
        return Array.from(new Set(allProjects.map(p => p.developer).filter(Boolean))).sort();
    }, [allProjects]);

    const filteredDevelopers = useMemo(() => {
        if (!devSearchQuery) return uniqueDevelopers;
        const q = devSearchQuery.toLowerCase();
        return uniqueDevelopers.filter(d => d.toLowerCase().includes(q));
    }, [uniqueDevelopers, devSearchQuery]);

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const visibleCodes = useMemo(() => {
        if (searchState.searchMode === 'code') return uniqueCodes;
        const codes = new Set<string>();
        allProjects.forEach(p => {
            if (!p.code) return;
            const dist = getDistance(searchState.lat, searchState.lng, p.lat, p.lng);
            if (dist <= searchState.radius) codes.add(p.code);
        });
        return Array.from(codes).sort();
    }, [allProjects, searchState.lat, searchState.lng, searchState.radius, searchState.searchMode, uniqueCodes]);

    const availableYears = useMemo(() => {
        const years = new Set<string>();
        allProjects.forEach(p => {
            p.subUnits.forEach(u => {
                if (u.launchDate && u.launchDate !== '-') {
                    const [year] = u.launchDate.split('.');
                    if (year) years.add(year);
                }
            });
        });
        return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
    }, [allProjects]);

    const currentLaunchYear = searchState.minLaunchDate ? searchState.minLaunchDate.split('.')[0] : '';
    const currentLaunchMonth = searchState.minLaunchDate ? searchState.minLaunchDate.split('.')[1] : '';

    // ─── Handlers ───
    const handleModeSwitch = (mode: 'location' | 'code') => {
        let newCodeFilter: string[] = [];
        if (mode === 'code') {
            newCodeFilter = searchState.codeFilter;
            if (newCodeFilter.length === 0 && uniqueCodes.length > 0) {
                newCodeFilter = [uniqueCodes[0]];
            }
        }
        setSearchState(prev => ({ ...prev, searchMode: mode, codeFilter: newCodeFilter }));
    };

    const handleRadiusChange = (r: number) => {
        setSearchState(prev => ({ ...prev, radius: r }));
    };

    const handleTypeToggle = (type: string) => {
        setSearchState(prev => {
            const current = prev.typeFilter;
            const updated = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
            return { ...prev, typeFilter: updated };
        });
    };

    const handleCodeToggle = (code: string) => {
        setSearchState(prev => {
            const current = prev.codeFilter || [];
            const updated = current.includes(code) ? current.filter(c => c !== code) : [...current, code];
            return { ...prev, codeFilter: updated };
        });
    };

    const handleLaunchDateChange = (year: string, month: string) => {
        if (!year) {
            setSearchState(prev => ({ ...prev, minLaunchDate: null }));
            return;
        }
        const m = month || '01';
        setSearchState(prev => ({ ...prev, minLaunchDate: `${year}.${m}` }));
    };

    const handleDeveloperToggle = (dev: string) => {
        setSearchState(prev => {
            const current = prev.developerFilter || [];
            const updated = current.includes(dev) ? current.filter(d => d !== dev) : [...current, dev];
            return { ...prev, developerFilter: updated };
        });
    };

    // ─── Active filter indicators ───
    const hasTypeFilter = searchState.typeFilter.length > 0;
    const hasLaunchFilter = searchState.minLaunchDate !== null;
    const hasSoldFilter = searchState.maxSoldPercent < 100;
    const hasPriceFilter = searchState.minPrice !== null || searchState.maxPrice !== null;
    const hasCodeFilter = searchState.codeFilter.length > 0;
    const hasDeveloperFilter = searchState.developerFilter.length > 0;
    const hasAnyFilter = hasTypeFilter || hasLaunchFilter || hasSoldFilter || hasPriceFilter || hasCodeFilter || hasDeveloperFilter;

    const allFilterButtons = [
        { id: 'type' as const, icon: Home, label: 'Property Type', active: hasTypeFilter, count: searchState.typeFilter.length },
        { id: 'launch' as const, icon: Calendar, label: 'Launch Date', active: hasLaunchFilter },
        { id: 'sold' as const, icon: Percent, label: 'Sold %', active: hasSoldFilter },
        { id: 'price' as const, icon: DollarSign, label: 'Price Range', active: hasPriceFilter },
        { id: 'code' as const, icon: Hash, label: 'Area Code', active: hasCodeFilter, count: searchState.codeFilter.length },
        { id: 'developer' as const, icon: Building2, label: 'Developer', active: hasDeveloperFilter, count: searchState.developerFilter.length },
    ];

    // In area mode, the code filter button moves to container 1, so exclude it from container 2
    const filterButtons = searchState.searchMode === 'code'
        ? allFilterButtons.filter(fb => fb.id !== 'code')
        : allFilterButtons;

    // Popover content renderers
    const renderPopoverContent = (id: PopoverId) => {
        switch (id) {
            case 'type':
                return (
                    <div className="p-4 w-[340px]">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xs font-medium text-gray-400">Property Type</h3>
                            {hasTypeFilter && (
                                <button onClick={() => setSearchState(prev => ({ ...prev, typeFilter: [] }))} className="text-[10px] text-gray-500 underline hover:text-black">Clear</button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {availableTypes.map(t => {
                                const isSelected = searchState.typeFilter.includes(t);
                                return (
                                    <button
                                        key={t}
                                        onClick={() => handleTypeToggle(t)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${isSelected
                                            ? 'bg-scbx text-white border-scbx shadow-md'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            case 'launch':
                return (
                    <div className="p-4 w-[280px]">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xs font-medium text-gray-400">Launch Date (Since)</h3>
                            {hasLaunchFilter && (
                                <button onClick={() => setSearchState(prev => ({ ...prev, minLaunchDate: null }))} className="text-[10px] text-gray-500 underline hover:text-black">Clear</button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <select
                                    value={currentLaunchYear}
                                    onChange={(e) => handleLaunchDateChange(e.target.value, currentLaunchMonth)}
                                    className={`w-full appearance-none pl-3 pr-8 py-2 border rounded-lg text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-scbx cursor-pointer transition-all ${currentLaunchYear ? 'border-scbx text-gray-900' : 'border-gray-200 text-gray-500'}`}
                                >
                                    <option value="">Year...</option>
                                    {availableYears.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                            <div className="relative w-20">
                                <select
                                    value={currentLaunchMonth}
                                    onChange={(e) => handleLaunchDateChange(currentLaunchYear, e.target.value)}
                                    disabled={!currentLaunchYear}
                                    className={`w-full appearance-none pl-3 pr-6 py-2 border rounded-lg text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-black cursor-pointer transition-all ${!currentLaunchYear ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed' :
                                        currentLaunchMonth ? 'border-scbx text-gray-900' : 'border-gray-200 text-gray-500'
                                    }`}
                                >
                                    {Array.from({ length: 12 }, (_, i) => {
                                        const m = (i + 1).toString().padStart(2, '0');
                                        return <option key={m} value={m}>{m}</option>
                                    })}
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                );
            case 'sold':
                return (
                    <div className="p-4 w-[280px]">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xs font-medium text-gray-400">Sold % Threshold</h3>
                            <span className="text-xs font-bold text-scbx">≤ {searchState.maxSoldPercent}%</span>
                        </div>
                        <div className="px-1">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={searchState.maxSoldPercent}
                                onChange={(e) => setSearchState(prev => ({ ...prev, maxSoldPercent: parseInt(e.target.value) }))}
                                className="w-full h-1.5 custom-range cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, #000 0%, #000 ${searchState.maxSoldPercent}%, #e5e7eb ${searchState.maxSoldPercent}%, #e5e7eb 100%)`
                                }}
                            />
                            <div className="flex justify-between mt-1 text-[10px] text-gray-400 font-medium">
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                            </div>
                        </div>
                    </div>
                );
            case 'price':
                return (
                    <div className="p-4 w-[280px]">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xs font-medium text-gray-400">Price Range (MB)</h3>
                            {hasPriceFilter && (
                                <button onClick={() => setSearchState(prev => ({ ...prev, minPrice: null, maxPrice: null }))} className="text-[10px] text-gray-500 underline hover:text-black">Clear</button>
                            )}
                        </div>
                        <div className="flex gap-2 items-center">
                            <div className="flex-1">
                                <input
                                    type="number"
                                    placeholder="Min"
                                    value={searchState.minPrice ?? ''}
                                    onChange={(e) => setSearchState(prev => ({ ...prev, minPrice: e.target.value ? parseFloat(e.target.value) : null }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-scbx focus:border-scbx transition-all"
                                />
                            </div>
                            <span className="text-gray-400 text-xs font-bold">-</span>
                            <div className="flex-1">
                                <input
                                    type="number"
                                    placeholder="Max"
                                    value={searchState.maxPrice ?? ''}
                                    onChange={(e) => setSearchState(prev => ({ ...prev, maxPrice: e.target.value ? parseFloat(e.target.value) : null }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-scbx focus:border-scbx transition-all"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'code': {
                const codes = searchState.searchMode === 'location' ? visibleCodes : filteredUniqueCodes;
                // Group codes by first letter
                const grouped: Record<string, string[]> = {};
                codes.forEach(code => {
                    const letter = (code[0] || '#').toUpperCase();
                    if (!grouped[letter]) grouped[letter] = [];
                    grouped[letter].push(code);
                });
                const sortedLetters = Object.keys(grouped).sort();

                return (
                    <div className="p-4 w-[340px]">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xs font-medium text-gray-400">Filter by Code</h3>
                            {hasCodeFilter && (
                                <button onClick={() => setSearchState(prev => ({ ...prev, codeFilter: [] }))} className="text-[10px] text-gray-500 underline hover:text-black">Clear</button>
                            )}
                        </div>
                        <div className="relative mb-2">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={areaSearchQuery}
                                onChange={(e) => setAreaSearchQuery(e.target.value)}
                                placeholder="Search code..."
                                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 outline-none focus:border-gray-300 focus:bg-white transition-all placeholder:font-normal"
                            />
                        </div>
                        <div className="max-h-[280px] overflow-y-auto custom-scrollbar space-y-1">
                            {sortedLetters.map(letter => (
                                <div key={letter} className="flex items-start gap-2">
                                    <span className="text-[10px] font-bold text-gray-300 w-4 shrink-0 pt-1.5 text-center select-none">{letter}</span>
                                    <div className="flex flex-wrap gap-1 flex-1">
                                        {grouped[letter].map(code => {
                                            const isSelected = searchState.codeFilter.includes(code);
                                            return (
                                                <button
                                                    key={code}
                                                    onClick={() => handleCodeToggle(code)}
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${isSelected
                                                        ? 'bg-scbx text-white border-scbx shadow-sm'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                                    }`}
                                                >
                                                    {code}
                                                    {isSelected && <Check className="w-3 h-3 ml-1 inline" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            {codes.length === 0 && (
                                <div className="text-xs text-gray-400 italic p-2">No codes found</div>
                            )}
                        </div>
                    </div>
                );
            }
            case 'developer': {
                // Group developers by first letter
                const devGrouped: Record<string, string[]> = {};
                filteredDevelopers.forEach(dev => {
                    const letter = (dev[0] || '#').toUpperCase();
                    if (!devGrouped[letter]) devGrouped[letter] = [];
                    devGrouped[letter].push(dev);
                });
                const devLetters = Object.keys(devGrouped).sort();

                return (
                    <div className="p-4 w-[340px]">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xs font-medium text-gray-400">Filter by Developer</h3>
                            {hasDeveloperFilter && (
                                <button onClick={() => setSearchState(prev => ({ ...prev, developerFilter: [] }))} className="text-[10px] text-gray-500 underline hover:text-black">Clear</button>
                            )}
                        </div>
                        <div className="relative mb-2">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={devSearchQuery}
                                onChange={(e) => setDevSearchQuery(e.target.value)}
                                placeholder="Search developer..."
                                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 outline-none focus:border-gray-300 focus:bg-white transition-all placeholder:font-normal"
                            />
                        </div>
                        <div className="max-h-[280px] overflow-y-auto custom-scrollbar space-y-1">
                            {devLetters.map(letter => (
                                <div key={letter} className="flex items-start gap-2">
                                    <span className="text-[10px] font-bold text-gray-300 w-4 shrink-0 pt-1.5 text-center select-none">{letter}</span>
                                    <div className="flex flex-wrap gap-1 flex-1">
                                        {devGrouped[letter].map(dev => {
                                            const isSelected = searchState.developerFilter.includes(dev);
                                            return (
                                                <button
                                                    key={dev}
                                                    onClick={() => handleDeveloperToggle(dev)}
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${isSelected
                                                        ? 'bg-scbx text-white border-scbx shadow-sm'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                                    }`}
                                                >
                                                    {dev}
                                                    {isSelected && <Check className="w-3 h-3 ml-1 inline" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            {filteredDevelopers.length === 0 && (
                                <div className="text-xs text-gray-400 italic p-2">No developers found</div>
                            )}
                        </div>
                    </div>
                );
            }
            default:
                return null;
        }
    };

    return (
        <div ref={barRef} className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-end gap-2">
                {/* Container 1: Location / Area mode */}
                <div className="flex items-center gap-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-xl shadow-premium border border-gray-100/50 dark:border-gray-700/50 px-2 h-[46px]">
                    {/* Search Mode Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg relative">
                        {['location', 'code'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => handleModeSwitch(mode as 'location' | 'code')}
                                className={`px-3 h-8 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1.5 relative z-10 ${searchState.searchMode === mode ? 'text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                            >
                                {searchState.searchMode === mode && (
                                    <motion.div
                                        layoutId="modeIndicator"
                                        className="absolute inset-0 bg-scbx rounded-lg shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-1px_1px_rgba(0,0,0,0.1)]"
                                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-1.5">
                                    {mode === 'location' ? <MapPin className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
                                    {mode === 'location' ? 'Location' : 'Area'}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Divider */}
                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                    {/* Coordinate Input */}
                    {searchState.searchMode === 'location' ? (
                        <div className="flex items-center gap-1">
                            <input
                                type="text"
                                value={unifiedSearchInput}
                                onChange={(e) => setUnifiedSearchInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchAction()}
                                className="w-[140px] h-8 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 outline-none px-2.5 transition-colors focus:bg-gray-200 dark:focus:bg-gray-700"
                                placeholder="Lat, Lng"
                            />
                            <button onClick={handleSearchAction} title="Reposition to coordinates" className="w-8 h-8 bg-white dark:bg-gray-800 text-scbx rounded-lg flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95">
                                <LocateFixed className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <div className="relative group/tip">
                            <button
                                onClick={() => togglePopover('code')}
                                className={`h-8 rounded-lg flex items-center justify-center gap-1.5 px-2.5 transition-all relative ${activePopover === 'code'
                                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                    : hasCodeFilter
                                        ? 'bg-scbx/10 text-scbx'
                                        : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                            >
                                <Hash className="w-4 h-4" />
                                <span className="text-[11px] font-bold">
                                    {searchState.codeFilter.length === 0
                                        ? 'Select areas'
                                        : searchState.codeFilter.length > 2
                                            ? `${searchState.codeFilter.slice(0, 2).join(', ')} +${searchState.codeFilter.length - 2}`
                                            : searchState.codeFilter.join(', ')}
                                </span>
                                {hasCodeFilter && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-scbx rounded-full ring-2 ring-white dark:ring-gray-900"></span>
                                )}
                            </button>
                            {/* Tooltip */}
                            {activePopover !== 'code' && (
                                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 shadow-lg">
                                    Area Code
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                                </div>
                            )}
                            {/* Popover */}
                            <AnimatePresence>
                                {activePopover === 'code' && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                                        transition={{ duration: 0.15, ease: 'easeOut' }}
                                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-xl shadow-premium border border-gray-100/50 dark:border-gray-700/50"
                                    >
                                        {renderPopoverContent('code')}
                                        <div className="absolute -bottom-1.5 w-3 h-3 bg-white dark:bg-gray-900 border-b border-r border-gray-100/50 dark:border-gray-700/50 rotate-45 left-1/2 -translate-x-1/2" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                </div>

                {/* Container 2: Filters */}
                <div className="flex items-center gap-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-xl shadow-premium border border-gray-100/50 dark:border-gray-700/50 px-2 h-[46px]">
                    {/* Radius Pills (only in location mode) */}
                    {searchState.searchMode === 'location' && (
                        <>
                            <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg relative">
                                {[1, 3, 5, 10].map(r => (
                                    <button
                                        key={r}
                                        onClick={() => handleRadiusChange(r)}
                                        className={`px-2.5 h-8 rounded-lg text-[11px] font-bold transition-colors relative z-10 flex items-center whitespace-nowrap min-w-[40px] justify-center ${searchState.radius === r
                                            ? 'text-white'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                        }`}
                                    >
                                        {searchState.radius === r && (
                                            <motion.div
                                                layoutId="radiusIndicator"
                                                className="absolute inset-0 bg-scbx rounded-lg shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-1px_1px_rgba(0,0,0,0.1)]"
                                                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                            />
                                        )}
                                        <span className="relative z-10">{r} km</span>
                                    </button>
                                ))}
                            </div>
                            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>
                        </>
                    )}

                    {/* Filter Icons — each with its own popover */}
                    <div className="flex items-center gap-0.5">
                        {filterButtons.map((fb, idx) => (
                            <div key={fb.id} className="relative group/tip">
                                <button
                                    onClick={() => togglePopover(fb.id)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all relative ${activePopover === fb.id
                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                        : fb.active
                                            ? 'bg-scbx/10 text-scbx'
                                            : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300'
                                    }`}
                                >
                                    <fb.icon className="w-4 h-4" />
                                    {fb.active && (
                                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-scbx rounded-full ring-2 ring-white dark:ring-gray-900"></span>
                                    )}
                                </button>
                                {/* Tooltip */}
                                {activePopover !== fb.id && (
                                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 shadow-lg">
                                        {fb.label}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                                    </div>
                                )}
                                {/* Popover positioned above the icon */}
                                <AnimatePresence>
                                    {activePopover === fb.id && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: 8, x: idx >= 3 ? 0 : "-50%" }}
                                            animate={{ opacity: 1, scale: 1, y: 0, x: idx >= 3 ? 0 : "-50%" }}
                                            exit={{ opacity: 0, scale: 0.95, y: 8, x: idx >= 3 ? 0 : "-50%" }}
                                            transition={{ duration: 0.15, ease: 'easeOut' }}
                                            className={`absolute bottom-full mb-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-xl shadow-premium border border-gray-100/50 dark:border-gray-700/50 ${idx >= 3 ? 'right-0' : 'left-1/2'}`}
                                        >
                                            {renderPopoverContent(fb.id)}
                                            {/* Triangle Arrow */}
                                            <div 
                                                className={`absolute -bottom-1.5 w-3 h-3 bg-white dark:bg-gray-900 border-b border-r border-gray-100/50 dark:border-gray-700/50 rotate-45 ${
                                                    idx >= 3 ? 'right-2.5' : 'left-1/2 -translate-x-1/2'
                                                }`}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>

                    {/* Reset */}
                    {hasAnyFilter && (
                        <>
                            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                            <button
                                onClick={handleResetFilters}
                                title="Reset all filters"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                        </>
                    )}
                </div>

                {/* Container 3: Ruler Tool */}
                <div className="relative group/ruler">
                    <button
                        onClick={onToggleRuler}
                        className={`w-[64px] h-[46px] rounded-xl flex items-center justify-center transition-all duration-200 border shadow-premium backdrop-blur-2xl ${
                            rulerActive
                                ? 'bg-scbx/10 border-scbx/30'
                                : 'bg-white/90 dark:bg-gray-900/90 border-gray-100/50 dark:border-gray-700/50'
                        }`}
                        style={{ clipPath: 'inset(-100% -100% 0 -100%)' }}
                        title={rulerActive ? 'Disable ruler (R)' : 'Measure distance (R)'}
                    >
                        <span className={`text-7xl leading-none rotate-45 transition-transform duration-300 ease-out drop-shadow-md ${rulerActive ? '-translate-y-3' : 'translate-y-1 group-hover/ruler:-translate-y-3'}`}>📏</span>
                    </button>
                    {/* Tooltip */}
                    {!rulerActive && (
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover/ruler:opacity-100 transition-opacity duration-150 shadow-lg">
                            Measure (R)
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                        </div>
                    )}
                </div>
        </div>
    );
};

export default FloatingFilterBar;
