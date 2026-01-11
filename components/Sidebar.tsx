import React, { useState, useMemo } from 'react';
import { Project, SearchState } from '../types';
import { MapPin, Hash, Search, X, ChevronDown, ChevronUp, RotateCcw, PanelLeftClose, PanelLeftOpen, Home, Check } from 'lucide-react';

interface SidebarProps {
    searchState: SearchState;
    setSearchState: React.Dispatch<React.SetStateAction<SearchState>>;
    availableTypes: string[];
    allProjects: Project[];
    unifiedSearchInput: string;
    setUnifiedSearchInput: (val: string) => void;
    handleSearchAction: () => void;
    handleResetFilters: () => void;
    isCollapsed: boolean;
    onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    searchState, 
    setSearchState,
    availableTypes,
    allProjects,
    unifiedSearchInput,
    setUnifiedSearchInput,
    handleSearchAction,
    handleResetFilters,
    isCollapsed,
    onToggle
}) => {
    // Removed isCodeExpanded state
    const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
    const [areaSearchQuery, setAreaSearchQuery] = useState("");

    // Calculate unique codes (For Dropdown - shows ALL available codes)
    const uniqueCodes = useMemo(() => {
        return Array.from(new Set(allProjects.map(p => p.code).filter(Boolean))).sort();
    }, [allProjects]);

    // Filter unique codes based on search query
    const filteredUniqueCodes = useMemo(() => {
        if (!areaSearchQuery) return uniqueCodes;
        const lowerQuery = areaSearchQuery.toLowerCase();
        return uniqueCodes.filter(code => code.toLowerCase().includes(lowerQuery));
    }, [uniqueCodes, areaSearchQuery]);

    // Helper to calculate distance
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // Filter codes based on View (For Filter Buttons)
    const visibleCodes = useMemo(() => {
        if (searchState.searchMode === 'code') {
            return uniqueCodes;
        }
        
        const codes = new Set<string>();
        allProjects.forEach(p => {
            if (!p.code) return;
            const dist = getDistance(searchState.lat, searchState.lng, p.lat, p.lng);
            if (dist <= searchState.radius) {
                codes.add(p.code);
            }
        });
        return Array.from(codes).sort();
    }, [allProjects, searchState.lat, searchState.lng, searchState.radius, searchState.searchMode, uniqueCodes]);

    // Group visible codes by first letter
    const groupedCodes = useMemo((): Record<string, string[]> => {
        const groups: Record<string, string[]> = {};
        visibleCodes.forEach(code => {
            const letter = code.charAt(0).toUpperCase();
            if (!groups[letter]) groups[letter] = [];
            groups[letter].push(code);
        });
        return groups;
    }, [visibleCodes]);

    const handleModeSwitch = (mode: 'location' | 'code') => {
        let newCodeFilter: string[] = [];

        if (mode === 'code') {
            newCodeFilter = searchState.codeFilter;
            // Auto-select first code if switching to code mode and none selected
            if (newCodeFilter.length === 0 && uniqueCodes.length > 0) {
                newCodeFilter = [uniqueCodes[0]];
            }
        }
        
        setSearchState(prev => ({ ...prev, searchMode: mode, codeFilter: newCodeFilter }));
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

    const handleRadiusChange = (r: number) => {
        setSearchState(prev => ({ ...prev, radius: r }));
    };

    // --- Collapsed View (Mini Sidebar) ---
    if (isCollapsed) {
        return (
            <aside className="w-full h-full flex flex-col items-center py-4 bg-transparent">
                 <button 
                    onClick={onToggle}
                    className="p-3 rounded-full hover:bg-black/5 text-gray-500 hover:text-gray-900 transition-colors mb-6 border border-transparent hover:border-black/10"
                    title="Expand Filters"
                >
                    <PanelLeftOpen className="w-6 h-6" />
                </button>

                <div className="flex flex-col gap-5 w-full items-center overflow-y-auto custom-scrollbar no-scrollbar flex-1">
                    {/* Mode & Radius - Updated to Primary Color */}
                    <div className="flex flex-col items-center gap-1.5 group cursor-default">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border transition-all ${searchState.searchMode === 'location' ? 'bg-scbx text-white border-scbx' : 'bg-white text-gray-500 border-gray-200'}`}>
                            {searchState.searchMode === 'location' ? <MapPin className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
                        </div>
                         {searchState.searchMode === 'location' && (
                            <span className="text-[10px] font-bold text-gray-600 bg-white/50 px-2 py-0.5 rounded-full border border-gray-200 backdrop-blur-sm">
                                {searchState.radius}km
                            </span>
                        )}
                        {/* Show selected Code in Code Mode */}
                        {searchState.searchMode === 'code' && searchState.codeFilter.length > 0 && (
                            <span className="text-[10px] font-bold text-gray-600 bg-white/50 px-2 py-0.5 rounded-full border border-gray-200 backdrop-blur-sm">
                                {searchState.codeFilter.length > 1 ? `${searchState.codeFilter.length}` : searchState.codeFilter[0]}
                            </span>
                        )}
                    </div>

                    <div className="w-8 h-px bg-gray-200/50"></div>

                    {/* Active Types - Remains Black */}
                    <div className="flex flex-col items-center gap-1.5 relative group">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border transition-all ${searchState.typeFilter.length > 0 ? 'bg-black text-white border-black' : 'bg-white text-gray-300 border-gray-200'}`}>
                            <Home className="w-5 h-5" />
                        </div>
                        {searchState.typeFilter.length > 0 && (
                             <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-scbx text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                                {searchState.typeFilter.length}
                             </span>
                        )}
                        <span className="text-[9px] font-bold text-gray-400">Type</span>
                    </div>

                    {/* Active Codes - Only show in Location Mode */}
                    {searchState.searchMode === 'location' && (
                        <div className="flex flex-col items-center gap-1.5 relative group">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border transition-all ${searchState.codeFilter.length > 0 ? 'bg-black text-white border-black' : 'bg-white text-gray-300 border-gray-200'}`}>
                                <Hash className="w-5 h-5" />
                            </div>
                            {searchState.codeFilter.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-scbx text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                                    {searchState.codeFilter.length}
                                </span>
                            )}
                            <span className="text-[9px] font-bold text-gray-400">Area</span>
                        </div>
                    )}
                </div>

                 <button 
                    onClick={handleResetFilters}
                    className="mt-2 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors"
                    title="Reset Filters"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
            </aside>
        );
    }

    // --- Expanded View ---
    return (
        <aside className="w-full h-full flex flex-col bg-transparent">
            {/* Header (Includes Search Controls) */}
            <div className="px-6 py-4 border-b border-gray-100/50 bg-white/40 backdrop-blur-sm sticky top-0 z-10 flex flex-col gap-3">
                <div className="flex items-center justify-between w-full">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        Search projects
                    </h2>
                    <button 
                        onClick={onToggle}
                        className="p-2 rounded-full hover:bg-white/60 text-gray-400 hover:text-gray-800 transition-colors"
                        title="Collapse Panel"
                    >
                        <PanelLeftClose className="w-5 h-5" />
                    </button>
                </div>

                {/* Search & Mode Controls */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-1.5">
                    <div className="flex items-center gap-2">
                         {/* Toggle - Updated to Primary (SCBX) Color */}
                         <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
                            <button 
                                onClick={() => handleModeSwitch('location')}
                                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${searchState.searchMode === 'location' ? 'bg-scbx text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <MapPin className="w-3.5 h-3.5" /> Location
                            </button>
                            <button 
                                onClick={() => handleModeSwitch('code')}
                                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${searchState.searchMode === 'code' ? 'bg-scbx text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <Hash className="w-3.5 h-3.5" /> Area
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="w-px h-7 bg-gray-100"></div>

                        {/* Input */}
                        <div className="flex-1 min-w-0 flex items-center gap-1">
                             {searchState.searchMode === 'location' ? (
                                <>
                                    <input 
                                        type="text" 
                                        value={unifiedSearchInput}
                                        onChange={(e) => setUnifiedSearchInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchAction()}
                                        className="flex-1 min-w-0 h-9 bg-transparent text-sm font-bold text-gray-700 placeholder-gray-400 outline-none"
                                        placeholder="Lat, Lng"
                                    />
                                    {unifiedSearchInput && (
                                        <button onClick={() => setUnifiedSearchInput('')} className="p-1 text-gray-400 hover:bg-gray-100 rounded-full"><X className="w-3.5 h-3.5" /></button>
                                    )}
                                    {/* Search Button - Updated to Primary (SCBX) Color */}
                                    <button onClick={handleSearchAction} className="w-8 h-8 bg-scbx text-white rounded-lg flex items-center justify-center shadow-sm hover:bg-scbxHover transition-colors"><Search className="w-3.5 h-3.5" /></button>
                                </>
                             ) : (
                                <div className="flex-1 relative">
                                    <button 
                                        onClick={() => {
                                            if (!isAreaDropdownOpen) setAreaSearchQuery('');
                                            setIsAreaDropdownOpen(!isAreaDropdownOpen);
                                        }}
                                        className="w-full h-9 bg-transparent text-sm font-bold text-gray-700 outline-none appearance-none cursor-pointer flex items-center justify-between px-2 hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        <span className="truncate pr-4 text-left">
                                            {searchState.codeFilter.length === 0 
                                                ? 'Select Areas...' 
                                                : searchState.codeFilter.length > 3 
                                                    ? `${searchState.codeFilter.slice(0, 3).join(', ')} +${searchState.codeFilter.length - 3}`
                                                    : searchState.codeFilter.join(', ')}
                                        </span>
                                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isAreaDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isAreaDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-30" onClick={() => setIsAreaDropdownOpen(false)}></div>
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-40 max-h-[300px] overflow-y-auto custom-scrollbar p-2 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                                                
                                                {/* Search Input inside Dropdown */}
                                                <div className="sticky top-0 bg-white z-10 pb-2 px-1 border-b border-gray-50 mb-1">
                                                     <div className="relative">
                                                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input 
                                                            type="text"
                                                            value={areaSearchQuery}
                                                            onChange={(e) => setAreaSearchQuery(e.target.value)}
                                                            placeholder="Search..."
                                                            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none focus:border-gray-300 focus:bg-white transition-all"
                                                            autoFocus
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                     </div>
                                                </div>

                                                 <div className="flex flex-col gap-1">
                                                    <div className="flex items-center justify-between px-2 py-1.5 mb-1 border-b border-gray-100">
                                                         <span className="text-[10px] font-bold text-gray-400 uppercase">Available Areas ({filteredUniqueCodes.length})</span>
                                                         {searchState.codeFilter.length > 0 && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setSearchState(prev => ({...prev, codeFilter: []})); }}
                                                                className="text-[10px] text-red-500 font-bold hover:underline"
                                                            >
                                                                Clear
                                                            </button>
                                                         )}
                                                    </div>
                                                    {filteredUniqueCodes.map(code => {
                                                         const isSelected = searchState.codeFilter.includes(code);
                                                         return (
                                                            <button
                                                                key={code}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCodeToggle(code);
                                                                }}
                                                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                                                    isSelected 
                                                                    ? 'bg-black text-white shadow-sm' 
                                                                    : 'text-gray-600 hover:bg-gray-50'
                                                                }`}
                                                            >
                                                                <span>{code}</span>
                                                                {isSelected && <Check className="w-3.5 h-3.5" />}
                                                            </button>
                                                         )
                                                     })}
                                                     {filteredUniqueCodes.length === 0 && (
                                                        <div className="p-3 text-center text-xs text-gray-400 italic">No area found</div>
                                                     )}
                                                 </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                             )}
                        </div>
                    </div>
                </div>

                {/* Radius Buttons - Moved Here */}
                {searchState.searchMode === 'location' && (
                    <div className="flex items-center gap-2 pt-1 animate-fadeInUp">
                        {[1, 3, 5, 10].map(r => (
                            <button
                                key={r}
                                onClick={() => handleRadiusChange(r)}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border text-center ${
                                    searchState.radius === r 
                                    ? 'bg-black text-white border-black shadow-md' 
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                                }`}
                            >
                                {r} km
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                
                {/* 1. Property Type Section - Remains Black */}
                <section className="animate-fadeInUp">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Property Type</h3>
                        {searchState.typeFilter.length > 0 && (
                            <button onClick={() => setSearchState(prev => ({...prev, typeFilter: []}))} className="text-[10px] text-gray-500 underline hover:text-black">Clear</button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {availableTypes.map(t => {
                            const isSelected = searchState.typeFilter.includes(t);
                            return (
                                <button
                                    key={t}
                                    onClick={() => handleTypeToggle(t)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                        isSelected 
                                        ? 'bg-black text-white border-black shadow-md' 
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    {t}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* 2. Code Area Tags - Remains Black */}
                {searchState.searchMode === 'location' && (
                    <section>
                         <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filter by Code</h3>
                            {searchState.codeFilter.length > 0 && (
                                <button onClick={() => setSearchState(prev => ({...prev, codeFilter: []}))} className="text-[10px] text-gray-500 underline hover:text-black">Clear</button>
                            )}
                        </div>
                        
                        {/* Remove max-height constraint to show all codes */}
                        <div>
                            <div className="flex flex-col gap-3">
                                {visibleCodes.length === 0 && (
                                    <div className="text-xs text-gray-400 italic">No codes in selected area.</div>
                                )}
                                {Object.entries(groupedCodes).sort((a, b) => a[0].localeCompare(b[0])).map(([letter, codes]: [string, string[]]) => (
                                    <div key={letter} className="flex items-start gap-2">
                                        <div className="w-4 pt-1.5 flex justify-center shrink-0">
                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{letter}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 flex-1">
                                            {codes.map(code => {
                                                const isSelected = searchState.codeFilter.includes(code);
                                                return (
                                                    <button
                                                        key={code}
                                                        onClick={() => handleCodeToggle(code)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                            isSelected 
                                                            ? 'bg-black text-white border-black shadow-md' 
                                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                                        }`}
                                                    >
                                                        {code}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;