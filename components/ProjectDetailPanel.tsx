// ... (imports remain the same)
import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { X, Copy, Check } from 'lucide-react';

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

const AnimatedCounter = ({ value, decimals = 0, duration = 1200 }: { value: number, decimals?: number, duration?: number }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number | null = null;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);
            
            // easeOutExpo for a really snappy, premium stop
            const easeOut = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);
            
            setCount(value * easeOut);

            if (percentage < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        // Start animation after a tiny delay so the panel slide-in isn't interrupted
        const timeout = setTimeout(() => {
            animationFrame = requestAnimationFrame(animate);
        }, 150);

        return () => {
            clearTimeout(timeout);
            if (animationFrame) cancelAnimationFrame(animationFrame);
        };
    }, [value, duration]);

    return <>{(count || 0).toFixed(decimals)}</>;
};

const ProjectDetailPanel: React.FC<ProjectDetailPanelProps> = ({ project, onClose, className }) => {
    const [hoveredPoint, setHoveredPoint] = useState<{ x: number, y: number, pointIndex: number, label: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCopyCoords = () => {
        if (!project) return;
        const coords = `${project.lat.toFixed(5)}, ${project.lng.toFixed(5)}`;
        navigator.clipboard.writeText(coords).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    // Default positioning if no className provided
    const positionClass = className || "md:left-[450px] left-4";

    const renderOverview = () => (
        <>
            {/* Key Stats Grid */}
            <div className="grid grid-cols-2 gap-4 animate-fadeInUp" style={{ animationFillMode: 'both', animationDelay: '50ms' }}>
                <div className="bg-[#f8faf9] dark:bg-gray-800/50 px-6 py-5 rounded-3xl flex flex-col justify-center">
                    <div>
                        <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Sold Ratio</div>
                        <div className="text-[32px] font-light font-display text-gray-900 dark:text-gray-100 flex items-baseline gap-2 leading-none tracking-tight">
                            <AnimatedCounter value={Number(project!.percentSold) || 0} decimals={1} />%
                            <span className="text-[11px] font-medium text-gray-400 tracking-wide">
                                ({project!.soldUnits.toLocaleString()} / {project!.totalUnits.toLocaleString()})
                            </span>
                        </div>
                    </div>
                </div>

                {/* Sale Speed Card */}
                <div className="bg-[#f8faf9] dark:bg-gray-800/50 px-6 py-5 rounded-3xl flex flex-col justify-center">
                    <div>
                        <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Sale Speed</div>
                        <div className="flex items-baseline gap-2">
                            <div className="text-[32px] font-light font-display text-gray-900 dark:text-gray-100 leading-none tracking-tight">
                                <AnimatedCounter value={Number(project!.saleSpeed) || 0} decimals={2} />
                            </div>
                            <div className="text-[11px] text-gray-400 font-medium">Units/mo</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="animate-fadeInUp" style={{ animationFillMode: 'both', animationDelay: '150ms' }}>
                <div className="flex items-center gap-2 mb-4 pl-2">
                    <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 tracking-tight">Unit Mix Analysis</h2>
                </div>
                <div className="bg-[#f8faf9] dark:bg-gray-800/30 rounded-3xl overflow-hidden py-4">
                <div className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs whitespace-nowrap">
                            <thead>
                                {/* Column Headers */}
                                <tr className="bg-gray-50/80 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 text-[11px] font-medium tracking-wide">
                                    <th className="px-4 py-3 text-left">Type</th>
                                    <th className="px-2 py-3 text-center">Launch</th>
                                    <th className="px-4 py-3 text-right">Price (MB)</th>

                                    <th className="px-2 py-3 text-right">Area</th>
                                    <th className="px-4 py-3 text-right">Land</th>

                                    <th className="px-2 py-3 text-right">Sale Speed</th>
                                    <th className="px-2 py-3 text-right">Speed</th>
                                    <th className="px-4 py-3 text-right">Sold %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                {project!.subUnits.map((u, i) => (
                                    <tr key={i} className="transition-all duration-300">
                                        {/* Group 1: Product Info */}
                                        <td className="px-4 py-3.5 font-medium text-gray-800 dark:text-gray-200 max-w-[100px] truncate" title={u.type}>{u.type}</td>
                                        <td className="px-2 py-3.5 text-center text-gray-800 dark:text-gray-200">{u.launchDate}</td>
                                        <td className="px-4 py-3.5 text-right text-gray-800 dark:text-gray-200 font-medium">{u.priceStr.replace(/ ?MB$/, '')}</td>

                                        {/* Group 2: Size */}
                                        <td className="px-2 py-3.5 text-right text-gray-800 dark:text-gray-200">{u.usableArea}</td>
                                        <td className="px-4 py-3.5 text-right text-gray-800 dark:text-gray-200">{u.landArea}</td>

                                        {/* Group 3: Sales */}
                                        <td className="px-2 py-3.5 text-right text-scbx font-bold">
                                            {(() => {
                                                // Get most recent period key with (12m) - matching trend graph
                                                if (u.history) {
                                                    const keys = Object.keys(u.history)
                                                        .filter(k => /^H[12]\.\d+/.test(k) && k.toLowerCase().includes('(12m)'))
                                                        .sort((a, b) => {
                                                            // Parse H1.65 (12m) or H2.66 (12m) format
                                                            const parseKey = (k: string) => {
                                                                const match = k.match(/^H([12])\.(\d+)/);
                                                                if (!match) return { half: 0, year: 0 };
                                                                return { half: parseInt(match[1]), year: parseInt(match[2]) };
                                                            };
                                                            const aVal = parseKey(a);
                                                            const bVal = parseKey(b);
                                                            // Sort by year descending, then by half descending (H2 > H1)
                                                            if (bVal.year !== aVal.year) return bVal.year - aVal.year;
                                                            return bVal.half - aVal.half;
                                                        });
                                                    if (keys.length > 0) {
                                                        return u.history[keys[0]]?.toFixed(2) || '-';
                                                    }
                                                }
                                                return '-';
                                            })()}
                                        </td>
                                        <td className="px-2 py-3.5 text-right text-gray-800 dark:text-gray-200 font-bold">{u.saleSpeed}</td>
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="font-medium text-gray-900 dark:text-gray-100">{Math.round(u.percentSold)}%</span>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-sans tracking-wide">({u.soldUnits}/{u.totalUnits})</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        </>
    );

    const renderProjectDetails = () => (
        <div className="animate-fadeInUp" style={{ animationFillMode: 'both', animationDelay: '350ms' }}>
            <div className="flex items-center gap-2 mb-4 pl-2">
                <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 tracking-tight">Project Details</h2>
            </div>
            <div className="bg-[#f8faf9] dark:bg-gray-800/30 rounded-3xl overflow-hidden px-6 py-4">
                <div className="flex flex-col text-xs">
                    {/* Row */}
                    <div className="flex justify-between items-center py-3.5 border-b border-gray-100 dark:border-gray-800/50">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Project ID</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300 text-xs tracking-tight">{project!.projectId}</span>
                    </div>
                    
                    {/* Row */}
                    <div className="flex justify-between items-center py-3.5 border-b border-gray-100 dark:border-gray-800/50">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Price Range</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{project!.priceRange}</span>
                    </div>
                    
                    {/* Row */}
                    <div className="flex justify-between items-center py-3.5 border-b border-gray-100 dark:border-gray-800/50">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Launch Date</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{project!.subUnits[0]?.launchDate || '-'}</span>
                    </div>
                    
                    {/* Row */}
                    <div className="flex justify-between items-center py-3.5 border-b border-gray-100 dark:border-gray-800/50">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Developer</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100 max-w-[200px] truncate text-right">{project!.developer}</span>
                    </div>
                    
                    {/* Row */}
                    <div className="flex justify-between items-center py-3.5">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Sub-market</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs tracking-wider">{project!.code}</span>
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

        // Filter for 12M moving average keys (case insensitive) and sort chronologically
        const movingAvgKeys = Array.from(allHistoryKeys)
            .filter(k => k.toLowerCase().includes('(12m)'))
            .sort((a, b) => {
                // Parse H1.65 (12m) or H2.66 (12m) format
                const parseKey = (k: string) => {
                    const match = k.match(/^H([12])\.(\d+)/);
                    if (!match) return { half: 0, year: 0 };
                    return { half: parseInt(match[1]), year: parseInt(match[2]) };
                };
                const aVal = parseKey(a);
                const bVal = parseKey(b);
                // Sort by year ascending, then by half ascending (H1 before H2)
                if (aVal.year !== bVal.year) return aVal.year - bVal.year;
                return aVal.half - bVal.half;
            });

        // 2. Prepare Data Grouped by Type
        const typeGroups: Record<string, { movingAvgData: number[], currentSpeed6m: number }> = {};

        project.subUnits.forEach(u => {
            if (!typeGroups[u.type]) {
                typeGroups[u.type] = {
                    movingAvgData: new Array(movingAvgKeys.length).fill(0),
                    currentSpeed6m: 0
                };
            }
            // Aggregate 6m speed
            typeGroups[u.type].currentSpeed6m += parseFloat(u.saleSpeed6m) || 0;

            // Aggregate moving avg history
            movingAvgKeys.forEach((key, idx) => {
                if (u.history && u.history[key] !== undefined) {
                    typeGroups[u.type].movingAvgData[idx] += u.history[key];
                }
            });
        });

        const seriesData2 = Object.keys(typeGroups).map((type, idx) => {
            const group = typeGroups[type];
            // 12M History only
            return {
                type,
                color: getColor(type, idx),
                data: group.movingAvgData
            };
        });

        // Chart Config
        const labels2 = movingAvgKeys;

        // Determine Max Y for scaling
        const allValues = seriesData2.flatMap(s => s.data);
        const maxY = Math.max(...allValues, 0.5) * 1.2; // Add 20% headroom

        // Chart Dimensions - Increased Width for larger panel
        const width = 600;
        const height = 180;
        const padding = { top: 30, right: 30, bottom: 40, left: 40 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;

        const renderChart = (xLabels: string[]) => {
            const currentSeriesData = seriesData2;

            return (
                <div className="bg-[#f8faf9] dark:bg-gray-800/50 px-6 py-4 rounded-3xl">
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
                                const numLabels = xLabels.length;
                                const x = padding.left + (numLabels > 1 ? (i / (numLabels - 1)) * chartW : chartW / 2);
                                return (
                                    <g key={i}>
                                        <text x={x} y={height - padding.bottom + 15} fontSize="10" fill="#6b7280" textAnchor="middle">{lbl}</text>
                                        <line x1={x} y1={height - padding.bottom} x2={x} y2={height - padding.bottom + 5} stroke="#e5e7eb" strokeWidth="1" />
                                    </g>
                                );
                            })}

                            {/* Lines & Points */}
                            {currentSeriesData.map((s) => {
                                const numPoints = xLabels.length;
                                const pointsStr = s.data.map((val, i) => {
                                    const x = padding.left + (numPoints > 1 ? (i / (numPoints - 1)) * chartW : chartW / 2);
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
                                            const x = padding.left + (numPoints > 1 ? (i / (numPoints - 1)) * chartW : chartW / 2);
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
                                                    onMouseEnter={() => setHoveredPoint({ x: x, y: y, pointIndex: i, label: xLabels[i] })}
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
                                className="absolute z-50 bg-gray-900 text-white text-[11px] rounded px-2 py-1.5 pointer-events-none shadow-xl transform -translate-x-1/2 -translate-y-full mt-[-8px]"
                                style={{ left: hoveredPoint.x, top: hoveredPoint.y }}
                            >
                                <div className="font-bold mb-1">{hoveredPoint.label}</div>
                                <div className="flex flex-col gap-0.5">
                                    {currentSeriesData.map(s => {
                                        const val = s.data[hoveredPoint.pointIndex];
                                        return (
                                            <div key={s.type} className="flex items-center gap-1 whitespace-nowrap">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></span>
                                                <span>{s.type}: {val !== undefined && val !== 0 ? val.toFixed(2) : '-'}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
                            </div>
                        )}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap justify-center gap-3 mt-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                        {currentSeriesData.map(s => (
                            <div key={s.type} className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-gray-800 px-2 py-1 rounded-md">
                                <div className="w-3 h-1 rounded-full" style={{ backgroundColor: s.color }}></div>
                                <div className="w-2 h-2 rounded-full border border-white shadow-sm -ml-2" style={{ backgroundColor: s.color }}></div>
                                <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400">{s.type}</span>
                            </div>
                        ))}
                    </div>
                </div >
            );
        };

        return (
            <div className="animate-fadeInUp" style={{ animationFillMode: 'both', animationDelay: '250ms' }}>
                <div className="flex items-center justify-between mb-4 pl-2">
                    <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 tracking-tight flex items-center gap-2">
                        Sale Speed Trend Analysis
                    </h2>
                </div>

                {renderChart(labels2)}

                <div className="text-[11px] text-gray-400 text-center mt-4">
                    * Data based on 12-month moving average and current 6-month performance.
                </div>
            </div>
        );
    };

    return (
        <div
            className={`
                absolute top-3 bottom-3 z-30
                ${positionClass}
                w-[min(calc(100%-32px),700px)]
                bg-white dark:bg-gray-900 backdrop-blur-2xl shadow-2xl rounded-xl border border-gray-100/50 dark:border-gray-700/50 overflow-hidden
                flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] origin-left
                ${project ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 -translate-x-4 scale-95 pointer-events-none'}
            `}
        >
            {project && (
                <div key={project.projectId} className="flex flex-col h-full w-full">
                    {/* Combined Header & Tabs Container */}
                    <div className="bg-white dark:bg-gray-900 sticky top-0 z-10 shrink-0">
                        
                        {/* Title Row */}
                        <div className="flex items-start justify-between px-7 pt-7 pb-4">
                            <div className="flex-1 min-w-0 pr-4 mt-1">
                                <h2 className="text-2xl font-medium text-gray-900 dark:text-white leading-tight truncate tracking-tight">{project.name}</h2>
                                <button
                                    onClick={handleCopyCoords}
                                    className="flex items-center gap-1.5 mt-1.5 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors group cursor-pointer"
                                    title="Copy coordinates"
                                >
                                    <span className="font-mono tracking-wide">{project.lat.toFixed(5)}, {project.lng.toFixed(5)}</span>
                                    {copied ? (
                                        <Check className="w-3 h-3 text-green-500" />
                                    ) : (
                                        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                    {copied && <span className="text-green-500 text-[10px] font-medium">Copied</span>}
                                </button>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-all mx-1 -mt-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>


                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto px-7 pt-2 pb-10 custom-scrollbar relative">
                        <div className="flex flex-col gap-8">
                            {renderOverview()}
                            {renderTrends()}
                            {renderProjectDetails()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDetailPanel;