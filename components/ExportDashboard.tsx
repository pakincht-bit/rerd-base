import React, { useMemo } from 'react';
import { Project } from '../types';
import { X, Download, TrendingUp, Home, DollarSign, Activity, PieChart, FileSpreadsheet, BarChart3 } from 'lucide-react';

interface ExportDashboardProps {
    projects: Project[];
    onClose: () => void;
    onDownload: () => void;
    radius: number;
    activeTypes?: string[];
}

const ExportDashboard: React.FC<ExportDashboardProps> = ({ projects, onClose, onDownload, radius, activeTypes }) => {

    // Shared helper for weighted average price calculation
    const getProjectWeightedPriceStats = (p: Project) => {
        let weightedPriceSum = 0;
        let weightedUnitsSum = 0;

        p.subUnits.forEach(u => {
            // Filter Logic: If activeTypes has values, check if u.type is included.
            const isTypeMatch = !activeTypes || activeTypes.length === 0 || activeTypes.includes(u.type);

            if (isTypeMatch && u.price > 0 && u.totalUnits > 0) {
                weightedPriceSum += (u.price * u.totalUnits);
                weightedUnitsSum += u.totalUnits;
            }
        });

        const avgPrice = weightedUnitsSum > 0 ? weightedPriceSum / weightedUnitsSum : 0;
        return { avgPrice, weightedPriceSum, weightedUnitsSum };
    };

    // 1. Calculate Statistics
    const stats = useMemo(() => {
        const total = projects.length;
        if (total === 0) return null;

        let totalSold = 0;
        let totalUnits = 0;
        let totalSpeed = 0;

        // Variables for Global Weighted Average Price
        let totalSalesVolume = 0;
        let totalSalesUnits = 0;

        const typeCounts: Record<string, number> = {};

        // Price Segmentation Buckets
        const priceSegments = [
            { label: '< 0.5', max: 0.5 },
            { label: '0.5-1.0', max: 1.0 },
            { label: '1.0-2.0', max: 2.0 },
            { label: '2.0-3.0', max: 3.0 },
            { label: '3.0-5.0', max: 5.0 },
            { label: '5.0-10', max: 10.0 },
            { label: '10-20', max: 20.0 },
            { label: '> 20', max: Infinity }
        ];
        const priceCounts = new Array(priceSegments.length).fill(0);

        projects.forEach(p => {
            totalSold += p.soldUnits;
            totalUnits += p.totalUnits;
            totalSpeed += parseFloat(p.saleSpeed);

            // Type Dist: If same project has duplicate types, count as 1 type
            const types = new Set<string>(p.subUnits.map(u => u.type));
            types.forEach((t) => {
                typeCounts[t] = (typeCounts[t] || 0) + 1;
            });

            // Use shared helper to get Project Avg Price
            const { weightedPriceSum, weightedUnitsSum, avgPrice } = getProjectWeightedPriceStats(p);

            if (weightedUnitsSum > 0) {
                // Accumulate for Global Stats
                totalSalesVolume += weightedPriceSum;
                totalSalesUnits += weightedUnitsSum;

                // Segmentation Logic
                // Fix: Check if price is likely Baht (large number) or already MB (small number < 1000)
                // This aligns with how the table displays the value (e.g. 1.875 MB)
                const priceMB = avgPrice < 1000 ? avgPrice : avgPrice / 1000000;

                let idx = 0;
                if (priceMB < 0.5) idx = 0;
                else if (priceMB <= 1.0) idx = 1;
                else if (priceMB <= 2.0) idx = 2;
                else if (priceMB <= 3.0) idx = 3;
                else if (priceMB <= 5.0) idx = 4;
                else if (priceMB <= 10.0) idx = 5;
                else if (priceMB <= 20.0) idx = 6;
                else idx = 7;

                priceCounts[idx]++;
            }
        });

        const avgSold = totalUnits ? (totalSold / totalUnits) * 100 : 0;

        // Calculated Global Weighted Average Price
        const avgPrice = totalSalesUnits > 0 ? totalSalesVolume / totalSalesUnits : 0;

        // Sort Types
        const sortedTypes: [string, number][] = Object.entries(typeCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5); // Top 5

        // Prepare Data for Pie Chart (Top 5 + Others if needed)
        const totalTypeCount = Object.values(typeCounts).reduce((a, b) => a + b, 0);
        const pieChartData = sortedTypes.map(([type, count]) => ({
            label: type,
            count: count,
            percent: count / totalTypeCount
        }));

        // Calculate "Others"
        const top5Count = pieChartData.reduce((acc, item) => acc + item.count, 0);
        if (totalTypeCount > top5Count) {
            pieChartData.push({
                label: 'Others',
                count: totalTypeCount - top5Count,
                percent: (totalTypeCount - top5Count) / totalTypeCount
            });
        }

        // Top 5 Projects by Speed (6 Months) - Updated Sorting
        const topProjects = [...projects]
            .sort((a, b) => parseFloat(b.saleSpeed6m) - parseFloat(a.saleSpeed6m))
            .slice(0, 5);

        const maxPriceCount = Math.max(...priceCounts, 1);

        return {
            total,
            avgSold,
            totalSpeed, // Changed from avgSpeed to totalSpeed (Sum)
            avgPrice,
            sortedTypes,
            pieChartData,
            topProjects,
            maxTypeCount: sortedTypes[0]?.[1] || 1,
            priceSegments,
            priceCounts,
            maxPriceCount
        };
    }, [projects, activeTypes]);

    // Helper to calculate row stats (Shared between CSV export and Table display)
    const calculateProjectRowStats = (p: Project) => {
        const validUnits = p.subUnits.filter(u =>
            !activeTypes || activeTypes.length === 0 || activeTypes.includes(u.type)
        );

        if (validUnits.length === 0) return {
            launchDate: '-',
            avgAreaDisplay: '-',
            avgLandDisplay: '-',
            priceSqmDisplay: '-',
            priceSqwDisplay: '-',
            avgPriceDisplay: '-',
            rawAvgPrice: 0
        };

        const dates = validUnits.map(u => u.launchDate).filter(d => d && d !== '-').sort();
        const launchDate = dates.length > 0 ? dates[0] : '-';

        let weightedAreaSum = 0;
        let weightedAreaUnitsSum = 0;
        let weightedLandSum = 0;
        let weightedLandUnitsSum = 0;

        validUnits.forEach(u => {
            const area = parseFloat(u.usableArea);
            const land = parseFloat(u.landArea);

            // Weighted Usable Area Logic
            if (!isNaN(area) && area > 0 && u.totalUnits > 0) {
                weightedAreaSum += area * u.totalUnits;
                weightedAreaUnitsSum += u.totalUnits;
            }

            // Weighted Land Area Logic
            if (!isNaN(land) && land > 0 && u.totalUnits > 0) {
                weightedLandSum += land * u.totalUnits;
                weightedLandUnitsSum += u.totalUnits;
            }
        });

        // Use shared helper for Avg Price to match Segmentation
        const { avgPrice: avgPriceVal } = getProjectWeightedPriceStats(p);
        const avgPriceDisplay = avgPriceVal > 0 ? (avgPriceVal < 1000000 ? avgPriceVal.toLocaleString() : `${(avgPriceVal / 1000000).toFixed(2)} MB`) : '-';

        const avgAreaVal = weightedAreaUnitsSum > 0 ? weightedAreaSum / weightedAreaUnitsSum : 0;
        const avgAreaDisplay = avgAreaVal > 0 ? avgAreaVal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '-';

        const avgLandVal = weightedLandUnitsSum > 0 ? weightedLandSum / weightedLandUnitsSum : 0;
        const avgLandDisplay = avgLandVal > 0 ? avgLandVal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '-';

        // New Calculations: Price/sq.m. = (Avg Price / Usable Area) * 1,000,000
        const calculatedPriceSqm = (avgPriceVal > 0 && avgAreaVal > 0) ? (avgPriceVal / avgAreaVal) * 1000000 : 0;
        const priceSqmDisplay = calculatedPriceSqm > 0 ? Math.round(calculatedPriceSqm).toLocaleString() : '-';

        // New Calculations: Price/sq.w. = (Avg Price / Land Area) * 1,000,000
        const calculatedPriceSqw = (avgPriceVal > 0 && avgLandVal > 0) ? (avgPriceVal / avgLandVal) * 1000000 : 0;
        const priceSqwDisplay = calculatedPriceSqw > 0 ? Math.round(calculatedPriceSqw).toLocaleString() : '-';

        return {
            launchDate,
            avgAreaDisplay,
            avgLandDisplay,
            priceSqmDisplay,
            priceSqwDisplay,
            avgPriceDisplay,
            rawAvgPrice: avgPriceVal
        };
    };

    // Helper to get the latest period key from history (e.g., "H1.68" or "H2.67")
    const getLatestPeriodKey = (history: Record<string, number>): string | null => {
        const keys = Object.keys(history);
        if (keys.length === 0) return null;

        // Sort period keys in descending order (latest first)
        // Format: H1.YY or H2.YY where YY is the year (Buddhist calendar, e.g., 67 = 2024)
        keys.sort((a, b) => {
            const parseKey = (key: string) => {
                const match = key.match(/H([12])\.(\d+)/);
                if (!match) return { year: 0, half: 0 };
                return { year: parseInt(match[2], 10), half: parseInt(match[1], 10) };
            };
            const aVal = parseKey(a);
            const bVal = parseKey(b);
            // Sort by year descending, then by half descending (H2 > H1)
            if (bVal.year !== aVal.year) return bVal.year - aVal.year;
            return bVal.half - aVal.half;
        });

        return keys[0];
    };

    // Helper to get the latest sale speed for a project (sum of all subunit latest speeds)
    const getProjectLatestSaleSpeed = (p: Project): string => {
        // Filter subUnits based on activeTypes
        const validUnits = p.subUnits.filter(u =>
            !activeTypes || activeTypes.length === 0 || activeTypes.includes(u.type)
        );

        if (validUnits.length === 0) return '-';

        // First, find the latest period across all subUnits
        let latestPeriod: string | null = null;
        validUnits.forEach(u => {
            const periodKey = getLatestPeriodKey(u.history);
            if (periodKey) {
                if (!latestPeriod) {
                    latestPeriod = periodKey;
                } else {
                    // Compare and keep the latest
                    const parseKey = (key: string) => {
                        const match = key.match(/H([12])\.(\d+)/);
                        if (!match) return { year: 0, half: 0 };
                        return { year: parseInt(match[2], 10), half: parseInt(match[1], 10) };
                    };
                    const current = parseKey(latestPeriod);
                    const candidate = parseKey(periodKey);
                    if (candidate.year > current.year ||
                        (candidate.year === current.year && candidate.half > current.half)) {
                        latestPeriod = periodKey;
                    }
                }
            }
        });

        if (!latestPeriod) return '-';

        // Sum the sale speed values for the latest period across all valid subUnits
        let totalSpeed = 0;
        validUnits.forEach(u => {
            const speed = u.history[latestPeriod!];
            if (speed !== undefined && !isNaN(speed)) {
                totalSpeed += speed;
            }
        });

        return totalSpeed > 0 ? totalSpeed.toFixed(2) : '-';
    };

    const handleDownloadCSV = () => {
        // Find the latest period key for the header label
        let latestPeriodLabel = 'Latest';
        for (const p of projects) {
            for (const u of p.subUnits) {
                const periodKey = getLatestPeriodKey(u.history);
                if (periodKey) {
                    latestPeriodLabel = periodKey;
                    break;
                }
            }
            if (latestPeriodLabel !== 'Latest') break;
        }

        // Updated Headers to match the Top 5 table format
        const headers = [
            "Rank", "Project Name", "Developer", "Launch date (YY.MM)",
            "Usable Area (sq.m.)", "Land Area (sq.w.)",
            "price/sq.m", "price/sq.w.", "AVG PRICE",
            "sold %", "sold units", "total units",
            `Sale Speed (${latestPeriodLabel})`, "Sale Speed (Total)"
        ];

        const escape = (val: string | number | undefined | null) => {
            if (val === undefined || val === null) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        // Sort all projects by latest sale speed (descending) to match the dashboard logic
        const sortedProjectsForExport = [...projects].sort((a, b) => {
            const aSpeed = parseFloat(getProjectLatestSaleSpeed(a)) || 0;
            const bSpeed = parseFloat(getProjectLatestSaleSpeed(b)) || 0;
            return bSpeed - aSpeed;
        });

        const rows = sortedProjectsForExport.map((p, index) => {
            const stats = calculateProjectRowStats(p);
            const latestSaleSpeed = getProjectLatestSaleSpeed(p);

            return [
                index + 1, // Rank
                escape(p.name),
                escape(p.developer),
                escape(stats.launchDate),
                escape(stats.avgAreaDisplay),
                escape(stats.avgLandDisplay),
                escape(stats.priceSqmDisplay),
                escape(stats.priceSqwDisplay),
                escape(stats.avgPriceDisplay),
                escape(p.percentSold),
                escape(p.soldUnits),
                escape(p.totalUnits),
                escape(latestSaleSpeed),
                escape(p.saleSpeed)
            ].join(",");
        });

        const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `RERD_Export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!stats) return null;

    const formatPrice = (val: number) => {
        return val < 1000000
            ? val.toLocaleString()
            : `${(val / 1000000).toFixed(2)} MB`;
    };

    // Helper for Pie Chart Slices - Updated to Primary Color Shades (KBANK Green)
    // Palette: Variations of green for KBANK CI
    const pieColors = ['#004D25', '#007A33', '#00A950', '#42B97E', '#7ACC9F', '#B3E0C1', '#D4EDDB', '#E6F4EA'];

    let cumulativePercent = 0;
    const pieSlices = stats.pieChartData.map((d, i) => {
        const start = cumulativePercent;
        const end = cumulativePercent + d.percent;
        cumulativePercent = end;

        const x1 = Math.cos(2 * Math.PI * start);
        const y1 = Math.sin(2 * Math.PI * start);
        const x2 = Math.cos(2 * Math.PI * end);
        const y2 = Math.sin(2 * Math.PI * end);

        const largeArc = d.percent > 0.5 ? 1 : 0;

        // Handle 100% case
        const pathData = d.percent >= 0.999
            ? `M 1 0 A 1 1 0 1 1 -1 0 A 1 1 0 1 1 1 0` // Full circle
            : `M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArc} 1 ${x2} ${y2} Z`;

        return { ...d, pathData, color: pieColors[i % pieColors.length] };
    });

    return (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-[95vw] max-h-[90vh] flex flex-col border border-white/50 overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header - Fixed Controls Only */}
                <div className="p-6 border-b border-gray-100 flex justify-end items-center bg-white/50 shrink-0 gap-3">
                    <button
                        onClick={handleDownloadCSV}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black hover:bg-gray-800 text-white text-sm font-bold shadow-sm transition-transform active:scale-95"
                    >
                        <FileSpreadsheet className="w-4 h-4" /> Export CSV
                    </button>
                    <button
                        onClick={onDownload}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-scbx hover:bg-scbxHover text-white text-sm font-bold shadow-lg shadow-green-100 transition-transform active:scale-95"
                    >
                        <Download className="w-4 h-4" /> Download Image
                    </button>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black flex items-center justify-center transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Dashboard Content (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50 custom-scrollbar">
                    {/* ID moved here to capture full content */}
                    <div id="dashboard-export-container" className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">

                        {/* Internal Report Header (Part of the export) */}
                        <div className="flex justify-between items-end mb-8 pb-6 border-b border-gray-100">
                            <div>
                                <div className="text-xs font-bold text-scbx uppercase tracking-wider mb-1">Market Analysis Dashboard</div>
                                <h3 className="text-3xl font-bold text-gray-900">Summary Report</h3>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-gray-400 font-bold uppercase">Data Source</div>
                                <div className="text-sm font-medium text-gray-700">{projects.length} Projects in {radius}km radius</div>
                                <div className="text-xs text-gray-400 mt-1">{new Date().toLocaleDateString()}</div>
                            </div>
                        </div>

                        {/* 1. Key Metrics Row */}
                        <div className="grid grid-cols-4 gap-6 mb-8">
                            <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100">
                                <div className="flex items-center gap-2 text-blue-600 mb-2">
                                    <Home className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase">Total Supply</span>
                                </div>
                                <div className="text-3xl font-bold text-gray-900">{stats.total} <span className="text-sm text-gray-500 font-medium">Projects</span></div>
                            </div>
                            <div className="p-5 rounded-2xl bg-green-50/50 border border-green-100">
                                <div className="flex items-center gap-2 text-green-600 mb-2">
                                    <Activity className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase">Avg. Sold Rate</span>
                                </div>
                                <div className="text-3xl font-bold text-gray-900">{stats.avgSold.toFixed(1)}%</div>
                            </div>
                            <div className="p-5 rounded-2xl bg-green-50/50 border border-green-100/50">
                                <div className="flex items-center gap-2 text-scbx mb-2">
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase">Total Sale Speed</span>
                                </div>
                                <div className="text-3xl font-bold text-gray-900">{stats.totalSpeed.toFixed(2)} <span className="text-sm text-gray-500 font-medium">unit/mo</span></div>
                            </div>
                            <div className="p-5 rounded-2xl bg-orange-50/50 border border-orange-100">
                                <div className="flex items-center gap-2 text-orange-600 mb-2">
                                    <DollarSign className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase">Avg. Price</span>
                                </div>
                                <div className="text-3xl font-bold text-gray-900">{formatPrice(stats.avgPrice)}</div>
                            </div>
                        </div>

                        {/* 2. Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            {/* Type Distribution - Pie Chart */}
                            <div className="p-6 rounded-3xl border border-gray-100 bg-white shadow-sm flex flex-col">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="p-2 bg-gray-100 rounded-lg"><PieChart className="w-5 h-5 text-gray-700" /></div>
                                    <h4 className="font-bold text-gray-800">Project Type Distribution</h4>
                                </div>
                                {/* New Donut Design with Center Text and Styled Legend */}
                                <div className="flex items-center justify-center gap-8 h-[240px] flex-1">
                                    {/* Donut Chart */}
                                    <div className="relative w-48 h-48 shrink-0">
                                        <svg viewBox="-1 -1 2 2" className="transform -rotate-90 w-full h-full overflow-visible">
                                            {pieSlices.map((slice, i) => (
                                                <path
                                                    key={i}
                                                    d={slice.pathData}
                                                    fill={slice.color}
                                                    stroke="white"
                                                    strokeWidth="0.04"
                                                    className="transition-all duration-300 hover:opacity-90"
                                                />
                                            ))}
                                            {/* Inner Donut Hole */}
                                            <circle cx="0" cy="0" r="0.65" fill="white" />
                                        </svg>

                                        {/* Center Text overlay */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-3xl font-extrabold text-gray-900 leading-none">
                                                {projects.length}
                                            </span>
                                            <span className="text-xs font-bold text-gray-400 uppercase mt-1">
                                                Projects
                                            </span>
                                        </div>
                                    </div>

                                    {/* Legend - Right Side */}
                                    <div className="flex flex-col gap-3 justify-center max-h-[240px] overflow-y-auto custom-scrollbar pr-2 flex-1 min-w-[150px]">
                                        {pieSlices.map((slice, i) => (
                                            <div key={i} className="flex items-center gap-3 text-sm group">
                                                {/* Dot */}
                                                <div
                                                    className="w-3 h-3 rounded-full shrink-0"
                                                    style={{ backgroundColor: slice.color }}
                                                ></div>

                                                {/* Text */}
                                                <div className="flex flex-wrap items-baseline gap-1.5 text-gray-600">
                                                    <span className="font-bold text-gray-900 min-w-[32px]">
                                                        {(slice.percent * 100).toFixed(0)}%
                                                    </span>
                                                    <span className="font-medium truncate max-w-[120px]" title={slice.label}>
                                                        {slice.label}
                                                    </span>
                                                    <span className="text-gray-400">
                                                        - {slice.count}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Price Segmentation - Bar Chart */}
                            <div className="p-6 rounded-3xl border border-gray-100 bg-white shadow-sm flex flex-col">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="p-2 bg-gray-100 rounded-lg"><BarChart3 className="w-5 h-5 text-gray-700" /></div>
                                    <h4 className="font-bold text-gray-800">Average Price Segmentation</h4>
                                </div>
                                <div className="flex-1 flex items-end gap-2 h-[200px] px-2 pb-2">
                                    {stats.priceSegments.map((seg, i) => {
                                        const count = stats.priceCounts[i];
                                        const heightPercent = stats.maxPriceCount > 0 ? (count / stats.maxPriceCount) * 100 : 0;
                                        // Dynamic color: Primary Color (KBANK Green)
                                        const barColorClass = count > 0 ? 'bg-scbx group-hover:bg-scbxHover' : 'bg-gray-100';

                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center group h-full">
                                                {/* Plot Area - Explicitly separates the bar/count area from the label area for alignment */}
                                                <div className="flex-1 w-full relative flex flex-col justify-end items-center">
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10 shadow-lg">
                                                        {seg.label} MB: {count} projects
                                                    </div>

                                                    {/* Count Label - Sits on top of the bar */}
                                                    <div className={`text-[10px] font-bold text-scbx mb-1 transition-opacity ${count > 0 ? 'opacity-100' : 'opacity-0'}`}>
                                                        {count}
                                                    </div>

                                                    {/* Bar - Grows from bottom */}
                                                    <div
                                                        className={`w-full rounded-t-sm relative transition-all duration-500 ${barColorClass}`}
                                                        style={{ height: count > 0 ? `${Math.max(heightPercent, 2)}%` : '2px' }}
                                                    ></div>

                                                    {/* X-Axis Baseline */}
                                                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-100 -z-10"></div>
                                                </div>

                                                {/* Label Area - Fixed height to ensure all bars start at same visual baseline */}
                                                <div className="h-6 mt-2 w-full flex items-center justify-center">
                                                    <span className="text-[9px] text-gray-500 font-medium text-center leading-tight">
                                                        {seg.label}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="text-center text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-wider">Price Range (MB)</div>
                            </div>
                        </div>

                        {/* 3. Top Performers Table */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="w-5 h-5 text-scbx" />
                                <h4 className="font-bold text-gray-800">Top 5 Fastest Selling Projects</h4>
                            </div>
                            <div className="overflow-x-auto rounded-2xl border border-gray-200">
                                <table className="w-full text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-xs">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Rank</th>
                                            <th className="px-4 py-3 text-left">Project Name <span className="text-[9px] font-normal text-gray-400 ml-1">(Developer)</span></th>
                                            <th className="px-4 py-3 text-center">Launch date (YY.MM)</th>
                                            <th className="px-4 py-3 text-right">Usable Area<br /><span className="text-[9px] lowercase">(sq.m.)</span></th>
                                            <th className="px-4 py-3 text-right">Land Area<br /><span className="text-[9px] lowercase">(sq.w.)</span></th>
                                            <th className="px-4 py-3 text-right">price/sq.m</th>
                                            <th className="px-4 py-3 text-right">price/sq.w.</th>
                                            <th className="px-4 py-3 text-right">AVG PRICE</th>
                                            <th className="px-4 py-3 text-right">sold%</th>
                                            <th className="px-4 py-3 text-right">Sale Speed (6 เดือน)</th>
                                            <th className="px-4 py-3 text-right">Sale Speed</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {stats.topProjects.map((p, i) => {
                                            const rowStats = calculateProjectRowStats(p);

                                            return (
                                                <tr key={p.projectId} className="hover:bg-gray-50/50">
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                                            {i + 1}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-gray-800">{p.name}</div>
                                                        <div className="text-[10px] text-gray-500">{p.developer}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-mono text-gray-600">{rowStats.launchDate}</td>
                                                    <td className="px-4 py-3 text-right font-mono text-gray-600 ">{rowStats.avgAreaDisplay}</td>
                                                    <td className="px-4 py-3 text-right font-mono text-gray-600 ">{rowStats.avgLandDisplay}</td>
                                                    <td className="px-4 py-3 text-right font-mono text-gray-600 font-bold">{rowStats.priceSqmDisplay}</td>
                                                    <td className="px-4 py-3 text-right font-mono text-gray-600 font-bold">{rowStats.priceSqwDisplay}</td>
                                                    <td className="px-4 py-3 text-right font-mono text-gray-600 font-bold">{rowStats.avgPriceDisplay}</td>
                                                    <td className="px-4 py-3 text-right text-green-800 font-bold">
                                                        <div className="text-sm">{p.percentSold}%</div>
                                                        <div className="text-[9px] text-gray-400 font-normal mt-0.5">
                                                            ({p.soldUnits.toLocaleString()}/{p.totalUnits.toLocaleString()})
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-gray-900 font-bold">{p.saleSpeed6m} <span className="text-[10px] text-gray-400 font-normal">unit/mo</span></td>
                                                    <td className="px-4 py-3 text-right text-gray-600">{p.saleSpeed}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                            <div>Generated by RERD Analytics</div>
                            <div>{new Date().toLocaleDateString()}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExportDashboard;