import React, { useState, useMemo } from 'react';
import { Project, SearchState } from '../types';
import { MapPin, Hash, Search, X, ChevronDown, ChevronUp, RotateCcw, PanelLeftClose, PanelLeftOpen, Home, Check, Calendar, Percent } from 'lucide-react';

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
    const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
    const [areaSearchQuery, setAreaSearchQuery] = useState("");

    const uniqueCodes = useMemo(() => {
        return Array.from(new Set(allProjects.map(p => p.code).filter(Boolean))).sort();
    }, [allProjects]);

    const filteredUniqueCodes = useMemo(() => {
        if (!areaSearchQuery) return uniqueCodes;
        const lowerQuery = areaSearchQuery.toLowerCase();
        return uniqueCodes.filter(code => code.toLowerCase().includes(lowerQuery));
    }, [uniqueCodes, areaSearchQuery]);

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

    const handleLaunchDateChange = (year: string, month: string) => {
        if (!year) {
            setSearchState(prev => ({ ...prev, minLaunchDate: null }));
            return;
        }
        const m = month || '01';
        setSearchState(prev => ({ ...prev, minLaunchDate: `${year}.${m}` }));
    };

    const currentLaunchYear = searchState.minLaunchDate ? searchState.minLaunchDate.split('.')[0] : '';
    const currentLaunchMonth = searchState.minLaunchDate ? searchState.minLaunchDate.split('.')[1] : '';

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

                <div className="flex flex-col gap-5 w-full items-center overflow-y-auto custom-scrollbar no-scrollbar flex-1 pb-4">
                    {/* Search Mode Icon */}
                    <div className="flex flex-col items-center gap-1.5 group cursor-default">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border transition-all ${searchState.searchMode === 'location' ? 'bg-scbx text-white border-scbx' : 'bg-black text-white border-black'}`}>
                            {searchState.searchMode === 'location' ? <MapPin className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
                        </div>
                        <span className="text-[10px] font-bold text-gray-400">Mode</span>
                    </div>

                    <div className="w-8 h-px bg-gray-200/50"></div>

                    {/* Type Filter Icon */}
                    <div className="flex flex-col items-center gap-1.5 relative group">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border transition-all ${searchState.typeFilter.length > 0 ? 'bg-black text-white border-black' : 'bg-white text-gray-300 border-gray-200'}`}>
                            <Home className="w-5 h-5" />
                        </div>
                        {searchState.typeFilter.length > 0 && (
                             <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-scbx text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                                {searchState.typeFilter.length}
                             </span>
                        )}
                        <span className="text-[10px] font-bold text-gray-400">Type</span>
                    </div>

                    {/* Launch Date Icon - Now Persistent */}
                    <div className="flex flex-col items-center gap-1.5 relative group">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border transition-all ${searchState.minLaunchDate ? 'bg-black text-white border-black' : 'bg-white text-gray-300 border-gray-200'}`}>
                            <Calendar className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400">Launch</span>
                    </div>

                    {/* Sold % Icon - Now Persistent */}
                    <div className="flex flex-col items-center gap-1.5 relative group">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border transition-all ${searchState.maxSoldPercent < 100 ? 'bg-black text-white border-black' : 'bg-white text-gray-300 border-gray-200'}`}>
                            <Percent className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400">Sold %</span>
                    </div>

                    {/* Area/Code Icon */}
                    <div className="flex flex-col items-center gap-1.5 relative group">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border transition-all ${searchState.codeFilter.length > 0 ? 'bg-black text-white border-black' : 'bg-white text-gray-300 border-gray-200'}`}>
                            <Hash className="w-5 h-5" />
                        </div>
                        {searchState.codeFilter.length > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-scbx text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                                {searchState.codeFilter.length}
                            </span>
                        )}
                        <span className="text-[10px] font-bold text-gray-400">Area</span>
                    </div>
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

    return (
        <aside className="w-full h-full flex flex-col bg-transparent">
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

                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-1.5">
                    <div className="flex items-center gap-2">
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

                        <div className="w-px h-7 bg-gray-100"></div>

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

                <section className="animate-fadeInUp delay-100">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Launch Date (Since)</h3>
                         {searchState.minLaunchDate && (
                            <button onClick={() => setSearchState(prev => ({...prev, minLaunchDate: null}))} className="text-[10px] text-gray-500 underline hover:text-black">Clear</button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <select
                                value={currentLaunchYear}
                                onChange={(e) => handleLaunchDateChange(e.target.value, currentLaunchMonth)}
                                className={`w-full appearance-none pl-3 pr-8 py-2 border rounded-lg text-xs font-bold bg-white focus:outline-none focus:ring-1 focus:ring-black cursor-pointer transition-all ${
                                    currentLaunchYear ? 'border-black text-black' : 'border-gray-200 text-gray-500'
                                }`}
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
                                className={`w-full appearance-none pl-3 pr-6 py-2 border rounded-lg text-xs font-bold bg-white focus:outline-none focus:ring-1 focus:ring-black cursor-pointer transition-all ${
                                    !currentLaunchYear ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed' :
                                    currentLaunchMonth ? 'border-black text-black' : 'border-gray-200 text-gray-500'
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
                </section>

                {/* Sold % Slider Filter */}
                <section className="animate-fadeInUp delay-150">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sold % Threshold</h3>
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
                </section>

                {searchState.searchMode === 'location' && (
                    <section>
                         <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filter by Code</h3>
                            {searchState.codeFilter.length > 0 && (
                                <button onClick={() => setSearchState(prev => ({...prev, codeFilter: []}))} className="text-[10px] text-gray-500 underline hover:text-black">Clear</button>
                            )}
                        </div>
                        
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