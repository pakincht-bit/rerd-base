// ... (imports remain the same)
import React, { useState, useMemo, useEffect } from 'react';
import { Project } from '../types';
import { X, Info, Home, Activity, LayoutDashboard, TrendingUp } from 'lucide-react';

interface ProjectDetailPanelProps {
    project: Project | null;
    onClose: () => void;
    className?: string; // Add className prop for dynamic positioning
}

// Fixed Color Palette for Types (Updated to Green/Purple Theme)
const TYPE_COLORS: Record<string, string> = {
    'Townhouse': '#84CC16', // Green
    'ทาวน์โฮม': '#84CC16',
    'ทาวน์เฮ้าส์': '#84CC16',

    'Commercial': '#A855F7', // Purple
    'อาคารพาณิชย์': '#A855F7',

    'Condo': '#06B6D4', // Cyan (Complementary)
    'คอนโด': '#06B6D4',

    'Single Detached House': '#10B981', // Emerald
    'บ้านเดี่ยว': '#10B981',

    'Semi-Detached House': '#F59E0B', // Amber
    'บ้านแฝด': '#F59E0B',

    'Land': '#6B7280',
    'ที่ดิน': '#6B7280'
};

const FALLBACK_COLORS = ['#84CC16', '#A855F7', '#06B6D4', '#F59E0B'];

const getColor = (type: string, index: number) => {
    // Try direct match
    if (TYPE_COLORS[type]) return TYPE_COLORS[type];
    // Try partial match (e.g. "Townhouse 2 Storey")
    const foundKey = Object.keys(TYPE_COLORS).find(k => type.includes(k));
    if (foundKey) return TYPE_COLORS[foundKey];
    // Fallback
    return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
};

const ProjectDetailPanel: React.FC<ProjectDetailPanelProps> = ({ project, onClose, className }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'trends'>('overview');
    const [hoveredPoint, setHoveredPoint] = useState<{ x: number, y: number, value: number, label: string, type: string } | null>(null);

    // Default positioning if no className provided
    const positionClass = className || "md:left-[450px] left-4";

    const renderOverview = () => (
        <div className="space-y-8 animate-fadeInUp pb-10">
            {/* Key Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/50 p-4 rounded-2xl border border-gray-100 shadow-sm backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                        <Activity className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Sold %</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800 flex items-baseline gap-2">
                        {project!.percentSold}%
                        <span className="text-xs font-medium text-gray-500">
                            ({project!.soldUnits.toLocaleString()} / {project!.totalUnits.toLocaleString()})
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-green-500 h-full rounded-full" style={{ width: `${project!.percentSold}%` }}></div>
                    </div>
                </div>

                {/* Sale Speed Card */}
                <div className="bg-white/50 p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Sale Speed</span>
                    </div>
                    <div className="flex items-end justify-between">
                        <div>
                            <div className="text-2xl font-bold text-indigo-600 leading-none mb-1">{project!.saleSpeed6m}</div>
                            <div className="text-[10px] text-gray-500 font-medium">Units/mo (6M)</div>
                        </div>
                        <div className="h-8 w-px bg-gray-200 mx-1"></div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-gray-600 leading-none mb-1">{project!.saleSpeed}</div>
                            <div className="text-[10px] text-gray-400 font-medium">All Time</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Units Table (Reordered & Grouped) */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                    <Home className="w-4 h-4 text-scbx" /> Unit Mix Analysis
                </h3>
                <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm bg-white/50 backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-[11px] whitespace-nowrap">
                            <thead>
                                {/* Column Headers */}
                                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                                    <th className="px-3 py-3 text-left">Type</th>
                                    <th className="px-2 py-3 text-center">Launch</th>
                                    <th className="px-3 py-3 text-right border-r border-gray-200/50">Price</th>

                                    <th className="px-2 py-3 text-right">Area</th>
                                    <th className="px-2 py-3 text-right border-r border-gray-200/50">Land</th>

                                    <th className="px-2 py-3 text-right">Spd 6m</th>
                                    <th className="px-2 py-3 text-right">Speed</th>
                                    <th className="px-2 py-3 text-right">Sold %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {project!.subUnits.map((u, i) => (
                                    <tr key={i} className="hover:bg-white/80 transition-colors">
                                        {/* Group 1: Product Info */}
                                        <td className="px-3 py-2.5 font-medium text-gray-800 max-w-[100px] truncate" title={u.type}>{u.type}</td>
                                        <td className="px-2 py-2.5 text-center text-gray-500 font-mono">{u.launchDate}</td>
                                        {/* Updated font-bold to font-medium */}
                                        <td className="px-3 py-2.5 text-right text-gray-800 font-medium font-mono border-r border-gray-100">{u.priceStr}</td>

                                        {/* Group 2: Size */}
                                        <td className="px-2 py-2.5 text-right text-gray-600 font-mono">{u.usableArea}</td>
                                        <td className="px-2 py-2.5 text-right text-gray-600 font-mono border-r border-gray-100">{u.landArea}</td>

                                        {/* Group 3: Sales */}
                                        <td className="px-2 py-2.5 text-right text-gray-600 font-mono">{u.saleSpeed6m}</td>
                                        <td className="px-2 py-2.5 text-right text-gray-600 font-mono">{u.saleSpeed}</td>
                                        <td className="px-2 py-2.5 text-right font-mono">
                                            <div className="flex flex-col items-end">
                                                <span className="font-bold text-gray-800">{Math.round(u.percentSold)}%</span>
                                                <span className="text-[9px] text-gray-400">({u.soldUnits}/{u.totalUnits})</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Main Info - Updated Layout (Label Left, Value Right) */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                    <Info className="w-4 h-4 text-scbx" /> Project Information
                </h3>
                <div className="bg-white/50 rounded-2xl border border-gray-100 p-5 shadow-sm backdrop-blur-sm">
                    <div className="grid grid-cols-[100px_1fr] gap-y-3 text-sm items-center">

                        <div className="text-gray-500 font-medium">Price Range</div>
                        {/* Updated font-bold to font-medium */}
                        <div className="font-medium text-gray-800">{project!.priceRange}</div>

                        <div className="h-px bg-gray-100 col-span-2 my-1"></div>

                        <div className="text-gray-500 font-medium">Launch Date</div>
                        <div className="font-medium text-gray-800">{project!.subUnits[0]?.launchDate || '-'}</div>

                        <div className="h-px bg-gray-100 col-span-2 my-1"></div>

                        <div className="text-gray-500 font-medium">Developer</div>
                        <div className="font-medium text-gray-800">{project!.developer}</div>

                        <div className="h-px bg-gray-100 col-span-2 my-1"></div>

                        <div className="text-gray-500 font-medium">Location Code</div>
                        <div className="font-mono font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded w-fit text-xs">
                            {project!.code}
                        </div>

                        <div className="h-px bg-gray-100 col-span-2 my-1"></div>

                        <div className="text-gray-500 font-medium">GPS</div>
                        <div className="font-mono text-gray-600 text-xs">
                            {project!.lat.toFixed(5)}, {project!.lng.toFixed(5)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderTrends = () => {
        if (!project) return null;

        // 1. Extract All Period Keys from all SubUnits
        const allHistoryKeys = new Set<string>();
        project.subUnits.forEach(u => {
            if (u.history) {
                Object.keys(u.history).forEach(k => allHistoryKeys.add(k));
            }
        });

        // Separate 12M vs Regular keys
        const periodicKeys = Array.from(allHistoryKeys).filter(k => !k.includes('(12M)') && !k.includes('(12m)')).sort();
        const movingAvgKeys = Array.from(allHistoryKeys).filter(k => k.includes('(12M)') || k.includes('(12m)')).sort();

        // 2. Prepare Data Grouped by Type
        const typeGroups: Record<string, { periodicData: number[], movingAvgData: number[], currentSpeed: number, currentSpeed6m: number }> = {};

        project.subUnits.forEach(u => {
            if (!typeGroups[u.type]) {
                typeGroups[u.type] = {
                    periodicData: new Array(periodicKeys.length).fill(0),
                    movingAvgData: new Array(movingAvgKeys.length).fill(0),
                    currentSpeed: 0,
                    currentSpeed6m: 0
                };
            }
            // Aggregate speeds
            typeGroups[u.type].currentSpeed += parseFloat(u.saleSpeed) || 0;
            typeGroups[u.type].currentSpeed6m += parseFloat(u.saleSpeed6m) || 0;

            // Aggregate periodic history
            periodicKeys.forEach((key, idx) => {
                if (u.history && u.history[key] !== undefined) {
                    typeGroups[u.type].periodicData[idx] += u.history[key];
                }
            });

            // Aggregate moving avg history
            movingAvgKeys.forEach((key, idx) => {
                if (u.history && u.history[key] !== undefined) {
                    typeGroups[u.type].movingAvgData[idx] += u.history[key];
                }
            });
        });

        const seriesData1 = Object.keys(typeGroups).map((type, idx) => {
            const group = typeGroups[type];
            // Trend 1: History... + [Current Speed (6M)] as the last point? 
            // The request says "H2.65 - Current". 
            // In the screenshot, "Current" seems to match the latest 6m value or similar.
            // Let's perform a merge: [...periodic values, currentSpeed6m]
            return {
                type,
                color: getColor(type, idx),
                data: [...group.periodicData, group.currentSpeed6m]
            };
        });

        const seriesData2 = Object.keys(typeGroups).map((type, idx) => {
            const group = typeGroups[type];
            // Trend 2: 12M History... + [6M Avg]
            return {
                type,
                color: getColor(type, idx),
                data: [...group.movingAvgData, group.currentSpeed6m]
            };
        });

        // 2. Chart Config
        const labels1 = [...periodicKeys, 'Current'];
        const labels2 = [...movingAvgKeys, '6M Avg'];

        // Determine Max Y for scaling (across both charts to keep scale consistent if desired, or separate)
        const allValues = [
            ...seriesData1.flatMap(s => s.data),
            ...seriesData2.flatMap(s => s.data)
        ];
        const maxY = Math.max(...allValues, 0.5) * 1.2; // Add 20% headroom

        // Chart Dimensions - Increased Width for larger panel
        const width = 600;
        const height = 180;
        const padding = { top: 30, right: 30, bottom: 40, left: 40 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;

        const renderChart = (title: string, xLabels: string[], isTrend2: boolean = false) => {
            const currentSeriesData = isTrend2 ? seriesData2 : seriesData1;

            return (
                <div className="bg-white/50 p-5 rounded-3xl border border-gray-100 shadow-sm relative backdrop-blur-sm">
                    <div className="flex items-start gap-2 mb-4">
                        {/* Updated Trend Colors: Trend 1 uses Primary Purple (SCBX), Trend 2 uses Secondary Teal */}
                        <div className={`w-1 h-5 rounded-full ${isTrend2 ? 'bg-teal-500' : 'bg-scbx'}`}></div>
                        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                    </div>

                    <div className="relative">
                        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible font-sans">
                            {/* Grid Lines (Y-Axis) */}
                            {[0, 0.33, 0.66, 1].map(ratio => {
                                const y = padding.top + chartH * ratio;
                                const val = maxY * (1 - ratio);
                                return (
                                    <g key={ratio}>
                                        <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f3f4f6" strokeWidth="1" />
                                        <text x={padding.left - 8} y={y + 3} fontSize="9" fill="#9ca3af" textAnchor="end">{val.toFixed(1)}</text>
                                    </g>
                                );
                            })}
                            {/* Y Axis Label */}
                            <text
                                x={10}
                                y={height / 2}
                                transform={`rotate(-90, 10, ${height / 2})`}
                                fontSize="9"
                                fill="#6b7280"
                                textAnchor="middle"
                                fontWeight="bold"
                            >
                                Sale Speed (Units/Month)
                            </text>

                            {/* X Axis Labels */}
                            {xLabels.map((lbl, i) => {
                                const x = padding.left + (i / (xLabels.length - 1)) * chartW;
                                return (
                                    <g key={i}>
                                        <text x={x} y={height - padding.bottom + 15} fontSize="9" fill="#6b7280" textAnchor="middle">{lbl}</text>
                                        <line x1={x} y1={height - padding.bottom} x2={x} y2={height - padding.bottom + 5} stroke="#e5e7eb" strokeWidth="1" />
                                    </g>
                                );
                            })}

                            {/* Lines & Points */}
                            {currentSeriesData.map((s) => {
                                const pointsStr = s.data.map((val, i) => {
                                    const x = padding.left + (i / (s.data.length - 1)) * chartW;
                                    const y = padding.top + (1 - val / maxY) * chartH;
                                    return `${x},${y}`;
                                }).join(' ');

                                return (
                                    <g key={s.type}>
                                        <polyline
                                            points={pointsStr}
                                            fill="none"
                                            stroke={s.color}
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        {s.data.map((val, i) => {
                                            const x = padding.left + (i / (s.data.length - 1)) * chartW;
                                            const y = padding.top + (1 - val / maxY) * chartH;
                                            return (
                                                <circle
                                                    key={i}
                                                    cx={x}
                                                    cy={y}
                                                    r="4"
                                                    fill="white"
                                                    stroke={s.color}
                                                    strokeWidth="2"
                                                    className="cursor-pointer hover:r-6 transition-all duration-200"
                                                    onMouseEnter={() => setHoveredPoint({ x: x, y: y, value: val, label: xLabels[i], type: s.type })}
                                                    onMouseLeave={() => setHoveredPoint(null)}
                                                />
                                            );
                                        })}
                                    </g>
                                );
                            })}
                        </svg>

                        {/* Custom Tooltip */}
                        {hoveredPoint && (
                            <div
                                className="absolute z-50 bg-gray-900 text-white text-[10px] rounded px-2 py-1 pointer-events-none shadow-xl transform -translate-x-1/2 -translate-y-full mt-[-8px]"
                                style={{ left: hoveredPoint.x, top: hoveredPoint.y }}
                            >
                                <div className="font-bold mb-0.5">{hoveredPoint.label}</div>
                                <div className="flex items-center gap-1 whitespace-nowrap">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[hoveredPoint.type] || '#fff' }}></span>
                                    <span>{hoveredPoint.type}: {hoveredPoint.value.toFixed(2)}</span>
                                </div>
                                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
                            </div>
                        )}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap justify-center gap-3 mt-2 border-t border-gray-100 pt-3">
                        {currentSeriesData.map(s => (
                            <div key={s.type} className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                <div className="w-3 h-1 rounded-full" style={{ backgroundColor: s.color }}></div>
                                <div className="w-2 h-2 rounded-full border border-white shadow-sm -ml-2" style={{ backgroundColor: s.color }}></div>
                                <span className="text-[10px] font-bold text-gray-600">{s.type}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        };

        return (
            <div className="space-y-6 animate-fadeInUp pb-10">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-scbx" /> Sale Speed Trend Analysis
                    </h2>
                </div>

                {renderChart("Trend 1: Period Trends (H2.65 - Current)", labels1)}
                {renderChart("Trend 2: Moving Average Trends (12M & 6M)", labels2, true)}

                <div className="text-[10px] text-gray-400 text-center mt-4">
                    * Data estimated based on project launch averages and current 6-month performance.
                </div>
            </div>
        );
    };

    return (
        <div
            className={`
                absolute top-24 bottom-4 z-30
                ${positionClass}
                w-[min(calc(100%-32px),700px)]
                bg-white/75 backdrop-blur-2xl shadow-2xl rounded-3xl border border-white/50
                flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] origin-left
                ${project ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 -translate-x-4 scale-95 pointer-events-none'}
            `}
        >
            {project && (
                <div key={project.projectId} className="flex flex-col h-full w-full">
                    {/* Combined Header & Tabs Container */}
                    <div className="bg-white/50 backdrop-blur-md rounded-t-3xl border-b border-gray-100 sticky top-0 z-10 shrink-0">
                        {/* Title Row */}
                        <div className="flex items-start justify-between p-6 pb-4">
                            <div className="flex-1 min-w-0 pr-4">
                                <h2 className="text-xl font-bold text-gray-900 leading-tight truncate">{project.name}</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-gray-100/80 text-gray-500 hover:text-gray-900 transition-colors shrink-0 -mt-2 -mr-2"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs Row */}
                        <div className="px-6 flex gap-6">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`flex items-center gap-2 pb-3 text-sm font-bold transition-all relative ${activeTab === 'overview' ? 'text-scbx' : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4" /> Overview
                                {activeTab === 'overview' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-scbx rounded-t-full animate-fadeInUp"></div>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('trends')}
                                className={`flex items-center gap-2 pb-3 text-sm font-bold transition-all relative ${activeTab === 'trends' ? 'text-scbx' : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                <TrendingUp className="w-4 h-4" /> Sale Speed Trend
                                {activeTab === 'trends' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-scbx rounded-t-full animate-fadeInUp"></div>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
                        {activeTab === 'overview' ? renderOverview() : renderTrends()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDetailPanel;