import React, { useState, useRef, useEffect } from 'react';
import { Building2, ShoppingBag, Stethoscope, GraduationCap, Eye, EyeOff, Bed, MessageSquare, Gift, MoreHorizontal } from 'lucide-react';

export type SidebarTab = 'projects' | 'mall' | 'hospital' | 'school' | 'hotel';

interface IconSidebarProps {
    activeTab: SidebarTab;
    onTabChange: (tab: SidebarTab) => void;
    counts: { projects: number; mall: number; hospital: number; school: number; hotel: number };
    visibleLayers: { projects: boolean; mall: boolean; hospital: boolean; school: boolean; hotel: boolean };
    onToggleLayer: (layer: 'projects' | 'mall' | 'hospital' | 'school' | 'hotel') => void;
    onFeedbackClick?: () => void;
    onWhatsNewClick?: () => void;
}

const tabs: { id: SidebarTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'projects', label: 'Projects', icon: Building2 },
    { id: 'mall', label: 'Malls', icon: ShoppingBag },
    { id: 'hospital', label: 'Hospitals', icon: Stethoscope },
    { id: 'school', label: 'Schools', icon: GraduationCap },
    { id: 'hotel', label: 'Hotels', icon: Bed },
];

const IconSidebar: React.FC<IconSidebarProps> = ({ activeTab, onTabChange, counts, visibleLayers, onToggleLayer, onFeedbackClick, onWhatsNewClick }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const hasFooterMenu = onWhatsNewClick || onFeedbackClick;

    return (
        <aside className="fixed top-3 left-3 bottom-3 w-[64px] z-30 flex flex-col items-center bg-white dark:bg-gray-900 backdrop-blur-xl border border-gray-100/50 dark:border-gray-700/50 rounded-lg shadow-premium-lg panel-grain transition-colors duration-300">
            {/* Logo */}
            <div className="pt-3 pb-4 flex items-center justify-center">
                <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
                    <img src="/logo.svg" alt="Radia" className="w-10 h-10 object-cover" />
                </div>
            </div>

            {/* Divider */}
            <div className="w-7 h-px bg-gray-200/60 dark:bg-gray-700/60 mb-3"></div>

            {/* Tab Icons */}
            <div className="flex-1 flex flex-col items-center justify-center gap-1.5 w-full px-1.5">
                {tabs.map((tab, idx) => {
                    const isActive = activeTab === tab.id;
                    const isVisible = visibleLayers[tab.id];
                    const count = counts[tab.id];
                    return (
                        <React.Fragment key={tab.id}>
                            {idx === 1 && (
                                <div className="w-7 h-px bg-gray-200/60 dark:bg-gray-700/60 my-1"></div>
                            )}
                            <div className="relative group w-full flex flex-col items-center">
                            {/* Active Edge Highlight */}
                            <div className={`
                                absolute left-[-6px] w-[3px] bg-scbx rounded-r-full transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]
                                ${isActive ? 'top-1 bottom-1 opacity-100 scale-y-100' : 'top-1/2 bottom-1/2 opacity-0 scale-y-0'}
                            `} />

                            <button
                                onClick={() => onTabChange(tab.id)}
                                className={`
                                    w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 relative
                                    ${isActive
                                        ? 'bg-scbx/10 text-scbx dark:bg-scbx/20 dark:text-scbx'
                                        : isVisible
                                            ? 'bg-transparent text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300'
                                            : 'bg-transparent text-gray-300 dark:text-gray-600'
                                    }
                                `}
                            >
                                <tab.icon className="w-5 h-5" />

                                {/* Count badge — top-left */}
                                {count > 0 && (
                                    <span className={`absolute -top-1 -left-1 min-w-[16px] h-4 px-1 rounded-full text-[8px] flex items-center justify-center font-bold shadow-sm ring-1 ring-white dark:ring-gray-900 ${isActive ? 'bg-scbx text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                        {count > 99 ? '99+' : count}
                                    </span>
                                )}

                                {/* Eye toggle — top-right, always visible */}
                                <span
                                    onClick={(e) => { e.stopPropagation(); onToggleLayer(tab.id); }}
                                    className={`
                                        absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center cursor-pointer
                                        transition-all duration-150
                                        ${isVisible
                                            ? 'bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ring-1 ring-gray-200 dark:ring-gray-600'
                                            : 'bg-red-50 dark:bg-red-900/30 text-red-400 hover:text-red-600 ring-1 ring-red-200 dark:ring-red-800'
                                        }
                                    `}
                                    title={isVisible ? `Hide ${tab.label}` : `Show ${tab.label}`}
                                >
                                    {isVisible
                                        ? <Eye className="w-2 h-2" />
                                        : <EyeOff className="w-2 h-2" />
                                    }
                                </span>
                            </button>

                            {/* Tooltip */}
                            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[11px] font-bold rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-xl z-50">
                                {tab.label}
                                {!isVisible && <span className="text-gray-400 dark:text-gray-500 ml-1">(hidden)</span>}
                                <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-gray-900 dark:border-r-gray-100"></div>
                            </div>
                        </div>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Divider */}
            {hasFooterMenu && (
                <div className="w-7 h-px bg-gray-200/60 dark:bg-gray-700/60 mb-2"></div>
            )}

            {/* More Menu */}
            {hasFooterMenu && (
                <div className="relative group/more mb-4" ref={menuRef}>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${isMenuOpen ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {/* Tooltip for the More button when menu is closed */}
                    {!isMenuOpen && (
                        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[11px] font-bold rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover/more:opacity-100 transition-opacity duration-200 shadow-xl z-50">
                            More Options
                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-gray-900 dark:border-r-gray-100"></div>
                        </div>
                    )}
                    
                    {/* Popover Menu */}
                    {isMenuOpen && (
                        <div className="absolute left-full ml-4 bottom-0 w-48 bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-gray-100/50 dark:border-gray-700/50 rounded-xl shadow-premium-lg p-1.5 flex flex-col z-[100] overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200">
                            {onWhatsNewClick && (
                                <button
                                    onClick={() => { onWhatsNewClick(); setIsMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-scbx/5 dark:hover:bg-scbx/20 text-gray-700 dark:text-gray-300 hover:text-scbx transition-colors"
                                >
                                    <Gift className="w-4 h-4" />
                                    <span className="text-xs font-bold">What's New</span>
                                </button>
                            )}
                            {onFeedbackClick && (
                                <button
                                    onClick={() => { onFeedbackClick(); setIsMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-scbx/5 dark:hover:bg-scbx/20 text-gray-700 dark:text-gray-300 hover:text-scbx transition-colors"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    <span className="text-xs font-bold">Feedback Center</span>
                                </button>
                            )}
                            {/* Triangle Arrow for the popover */}
                            <div className="absolute bottom-[14px] -left-1.5 w-3 h-3 bg-white/95 dark:bg-gray-900/95 border-b border-l border-gray-100/50 dark:border-gray-700/50 rotate-45" />
                        </div>
                    )}
                </div>
            )}
        </aside>
    );
};

export default IconSidebar;
