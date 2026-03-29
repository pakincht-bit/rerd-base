import React, { useMemo } from 'react';
import { Project } from '../types';
import { X, TrendingUp, Home, DollarSign, Activity } from 'lucide-react';

interface ExportDashboardProps {
    projects: Project[];
    onClose: () => void;
    onDownload: () => void;
    radius: number;
    activeTypes?: string[];
    selectedProject?: Project | null;
}

const ExportDashboard: React.FC<ExportDashboardProps> = ({ projects, onClose, onDownload, radius, activeTypes, selectedProject }) => {

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


    const handleDownloadCSV = () => {
        // Updated Headers to match the granular subunit-based format
        const headers = [
            "Project Name", "Developer", "Property Type", "Launch date (YY.MM)",
            "Usable Area (sq.m.)", "Land Area (sq.w.)",
            "price/sq.m", "price/sq.w.", "AVG PRICE",
            "sold %", "sold units", "total units",
            "Sale Speed (Latest)", "Sale Speed (Total)"
        ];

        const escape = (val: string | number | undefined | null) => {
            if (val === undefined || val === null) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        // Determine which projects to export
        const projectsToExport = selectedProject ? [selectedProject] : projects;

        const csvRows: string[] = [];

        projectsToExport.forEach(p => {
            // Group by Property Type
            const typeGroups: Record<string, {
                totalUnits: number;
                soldUnits: number;
                weightedPriceSum: number;
                weightedUnitSum: number;
                weightedAreaSum: number;
                weightedAreaUnitSum: number;
                weightedLandSum: number;
                weightedLandUnitSum: number;
                totalSaleSpeed: number;
                currentSaleSpeed: number;
                launchDates: string[];
            }> = {};

            p.subUnits.forEach(u => {
                // Filter by activeTypes if they exist
                if (activeTypes && activeTypes.length > 0 && !activeTypes.includes(u.type)) {
                    return;
                }

                if (!typeGroups[u.type]) {
                    typeGroups[u.type] = {
                        totalUnits: 0,
                        soldUnits: 0,
                        weightedPriceSum: 0,
                        weightedUnitSum: 0,
                        weightedAreaSum: 0,
                        weightedAreaUnitSum: 0,
                        weightedLandSum: 0,
                        weightedLandUnitSum: 0,
                        totalSaleSpeed: 0,
                        currentSaleSpeed: 0,
                        launchDates: []
                    };
                }

                const group = typeGroups[u.type];
                group.totalUnits += u.totalUnits;
                group.soldUnits += u.soldUnits;

                // Weighted Price
                if (u.price > 0 && u.totalUnits > 0) {
                    group.weightedPriceSum += u.price * u.totalUnits;
                    group.weightedUnitSum += u.totalUnits;
                }

                // Weighted Area
                if (parseFloat(u.usableArea) > 0 && u.totalUnits > 0) {
                    group.weightedAreaSum += parseFloat(u.usableArea) * u.totalUnits;
                    group.weightedAreaUnitSum += u.totalUnits;
                }

                // Weighted Land
                if (parseFloat(u.landArea) > 0 && u.totalUnits > 0) {
                    group.weightedLandSum += parseFloat(u.landArea) * u.totalUnits;
                    group.weightedLandUnitSum += u.totalUnits;
                }

                // Sale Speeds
                group.totalSaleSpeed += parseFloat(u.saleSpeed) || 0;

                const latestPeriodKey = getLatestPeriodKey(u.history);
                const latestSpeed = latestPeriodKey && u.history[latestPeriodKey] !== undefined
                    ? u.history[latestPeriodKey]
                    : 0;
                group.currentSaleSpeed += latestSpeed;

                if (u.launchDate && u.launchDate !== '-') {
                    group.launchDates.push(u.launchDate);
                }
            });

            // Generate rows from groups
            Object.entries(typeGroups).forEach(([type, stats]) => {
                // Calculate Averages
                const avgPrice = stats.weightedUnitSum > 0 ? stats.weightedPriceSum / stats.weightedUnitSum : 0;
                const avgArea = stats.weightedAreaUnitSum > 0 ? stats.weightedAreaSum / stats.weightedAreaUnitSum : 0;
                const avgLand = stats.weightedLandUnitSum > 0 ? stats.weightedLandSum / stats.weightedLandUnitSum : 0;

                // Display Strings
                const launchDate = stats.launchDates.length > 0 ? stats.launchDates.sort()[0] : '-';
                const avgPriceDisplay = avgPrice > 0 ? (avgPrice < 1000000 ? avgPrice.toLocaleString() : `${(avgPrice / 1000000).toFixed(2)} MB`) : '-';

                // New Calculations: Price/sq.m. = (Avg Price / Usable Area) * 1,000,000
                const calculatedPriceSqm = (avgPrice > 0 && avgArea > 0) ? (avgPrice / avgArea) * 1000000 : 0;
                const priceSqmDisplay = calculatedPriceSqm > 0 ? Math.round(calculatedPriceSqm).toLocaleString() : '-';

                // New Calculations: Price/sq.w. = (Avg Price / Land Area) * 1,000,000
                const calculatedPriceSqw = (avgPrice > 0 && avgLand > 0) ? (avgPrice / avgLand) * 1000000 : 0;
                const priceSqwDisplay = calculatedPriceSqw > 0 ? Math.round(calculatedPriceSqw).toLocaleString() : '-';

                const percentSold = stats.totalUnits > 0 ? (stats.soldUnits / stats.totalUnits) * 100 : 0;

                csvRows.push([
                    escape(p.name),
                    escape(p.developer),
                    escape(type),
                    escape(launchDate),
                    escape(avgArea > 0 ? avgArea.toFixed(1) : '-'),
                    escape(avgLand > 0 ? avgLand.toFixed(1) : '-'),
                    escape(priceSqmDisplay),
                    escape(priceSqwDisplay),
                    escape(avgPriceDisplay),
                    escape(percentSold.toFixed(1)),
                    escape(stats.soldUnits),
                    escape(stats.totalUnits),
                    escape(stats.currentSaleSpeed.toFixed(2)),
                    escape(stats.totalSaleSpeed.toFixed(2))
                ].join(","));
            });
        });

        const csvContent = "\uFEFF" + [headers.join(","), ...csvRows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Radia_Export_${new Date().toISOString().slice(0, 10)}.csv`);
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

    // Helper for Pie Chart Slices - Primary Color Shades
    const pieColors = ['#1B333C', '#2A4F5C', '#3D6D7D', '#538B9E', '#6FA8BB', '#92C1D0', '#B5D7E2', '#D4EAF0'];

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
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-3xl shadow-premium-lg w-full max-w-[95vw] max-h-[90vh] flex flex-col border border-white/50 dark:border-gray-700/50 overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header - Fixed Controls Only */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-end items-center bg-white/50 dark:bg-gray-900/50 shrink-0 gap-3">
                    <button
                        onClick={handleDownloadCSV}
                        className="bg-white hover:bg-gray-50 text-gray-700 px-5 py-2 rounded-lg text-xs font-display font-normal transition-colors active:opacity-80 border border-gray-200"
                    >
                        Export CSV
                    </button>
                    <button
                        onClick={onDownload}
                        className="bg-scbx hover:bg-scbxHover text-white px-5 py-2 rounded-lg text-xs font-display font-normal transition-colors active:opacity-80 shadow-[inset_0_1px_8px_rgba(255,255,255,0.2),inset_0_-1px_4px_rgba(0,0,0,0.15)]"
                    >
                        Download Image
                    </button>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-black dark:hover:text-white flex items-center justify-center transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Dashboard Content (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50 dark:bg-gray-950/50 custom-scrollbar">
                    {/* ID moved here to capture full content */}
                    <div id="dashboard-export-container" className="bg-white p-8 rounded-3xl">

                        {/* Internal Report Header (Part of the export) */}
                        <div className="flex justify-between items-end mb-8 pb-6 border-b border-gray-50">
                            <div>
                                <div className="text-[11px] font-medium text-scbx uppercase tracking-wider mb-1">Market Analysis Dashboard</div>
                                <h3 className="text-[32px] font-light font-display text-gray-900 tracking-tight">Summary Report</h3>
                            </div>
                            <div className="text-right">
                                <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Data Source</div>
                                <div className="text-[14px] font-light font-display text-gray-800 tracking-tight mt-0.5">{projects.length} Projects in {radius}km radius</div>
                                <div className="text-[11px] text-gray-400 font-mono mt-1">{new Date().toLocaleDateString()}</div>
                            </div>
                        </div>

                        {/* 1. Key Metrics Row */}
                        <div className="grid grid-cols-4 gap-6 mb-8">
                            <div className="bg-[#f8faf9] p-6 rounded-3xl min-h-[140px] flex flex-col justify-between">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)]">
                                    <Home className="w-5 h-5 text-gray-500" strokeWidth={1.5} />
                                </div>
                                <div className="mt-8">
                                    <div className="text-[11px] font-medium text-gray-500 mb-1 tracking-wide uppercase">Total Supply</div>
                                    <div className="text-[32px] font-light font-display text-gray-900 flex items-baseline gap-2 leading-none tracking-tight">
                                        {stats.total} <span className="text-[11px] font-medium text-gray-400 tracking-wide font-sans">Projects</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-[#f8faf9] p-6 rounded-3xl min-h-[140px] flex flex-col justify-between">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)]">
                                    <Activity className="w-5 h-5 text-gray-500" strokeWidth={1.5} />
                                </div>
                                <div className="mt-8">
                                    <div className="text-[11px] font-medium text-gray-500 mb-1 tracking-wide uppercase">Avg. Sold Rate</div>
                                    <div className="text-[32px] font-light font-display text-gray-900 leading-none tracking-tight">
                                        {stats.avgSold.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                            <div className="bg-[#f8faf9] p-6 rounded-3xl min-h-[140px] flex flex-col justify-between">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)]">
                                    <TrendingUp className="w-5 h-5 text-gray-500" strokeWidth={1.5} />
                                </div>
                                <div className="mt-8">
                                    <div className="text-[11px] font-medium text-gray-500 mb-1 tracking-wide uppercase">Total Sale Speed</div>
                                    <div className="text-[32px] font-light font-display text-gray-900 flex items-baseline gap-2 leading-none tracking-tight">
                                        {stats.totalSpeed.toFixed(2)} <span className="text-[11px] font-medium text-gray-400 tracking-wide font-sans lowercase">unit/mo</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-[#f8faf9] p-6 rounded-3xl min-h-[140px] flex flex-col justify-between">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)]">
                                    <DollarSign className="w-5 h-5 text-gray-500" strokeWidth={1.5} />
                                </div>
                                <div className="mt-8">
                                    <div className="text-[11px] font-medium text-gray-500 mb-1 tracking-wide uppercase">Avg. Price</div>
                                    <div className="text-[32px] font-light font-display text-gray-900 flex items-baseline gap-2 leading-none tracking-tight">
                                        {formatPrice(stats.avgPrice).replace(' MB', '')} <span className="text-[11px] font-medium text-gray-400 tracking-wide font-sans">{formatPrice(stats.avgPrice).includes('MB') ? 'MB' : 'THB'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            {/* Type Distribution - Pie Chart */}
                            <div className="bg-[#f8faf9] p-6 rounded-3xl flex flex-col">
                                <div className="flex flex-col mb-6">
                                    <h2 className="text-lg font-medium text-gray-800 tracking-tight pl-2">Project Type Distribution</h2>
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
                                            <span className="text-[32px] font-light font-display text-gray-900 leading-none tracking-tight">
                                                {projects.length}
                                            </span>
                                            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mt-1 font-sans">
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
                                                    <span className="font-mono text-gray-900 min-w-[32px]">
                                                        {(slice.percent * 100).toFixed(0)}%
                                                    </span>
                                                    <span className="text-xs truncate max-w-[120px] font-medium" title={slice.label}>
                                                        {slice.label}
                                                    </span>
                                                    <span className="text-xs text-gray-400 font-mono">
                                                        ({slice.count})
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Price Segmentation - Bar Chart */}
                            <div className="bg-[#f8faf9] p-6 rounded-3xl flex flex-col">
                                <div className="flex flex-col mb-6">
                                    <h2 className="text-lg font-medium text-gray-800 tracking-tight pl-2">Average Price Segmentation</h2>
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
                                                    <div className={`text-[10px] font-mono font-medium text-scbx mb-1 transition-opacity ${count > 0 ? 'opacity-100' : 'opacity-0'}`}>
                                                        {count}
                                                    </div>

                                                    {/* Bar - Grows from bottom */}
                                                    <div
                                                        className={`w-full rounded-t-sm relative transition-all duration-500 ${barColorClass}`}
                                                        style={{ height: count > 0 ? `${Math.max(heightPercent, 2)}%` : '2px' }}
                                                    ></div>

                                                    {/* X-Axis Baseline */}
                                                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 -z-10"></div>
                                                </div>

                                                {/* Label Area - Fixed height to ensure all bars start at same visual baseline */}
                                                <div className="h-6 mt-2 w-full flex items-center justify-center">
                                                    <span className="text-[9px] text-gray-500 font-mono text-center leading-tight">
                                                        {seg.label}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="text-center text-[10px] text-gray-400 mt-2 font-medium tracking-wide">Price Range (MB)</div>
                            </div>
                        </div>

                        {/* 3. Top Performers Table */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 pl-2">
                                <h2 className="text-lg font-medium text-gray-800 tracking-tight">Top 5 Fastest Selling Projects</h2>
                            </div>
                            <div className="bg-[#f8faf9] rounded-3xl py-6 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-400 text-[11px] font-medium tracking-wide">
                                            <th className="px-4 py-3 text-left">Rank</th>
                                            <th className="px-4 py-3 text-left">Project Name <span className="text-[9px] font-normal text-gray-400 ml-1">(Developer)</span></th>
                                            <th className="px-2 py-3 text-center">Launch date (YY.MM)</th>
                                            <th className="px-4 py-3 text-right">Usable Area<br /><span className="text-[9px] lowercase">(sq.m.)</span></th>
                                            <th className="px-4 py-3 text-right">Land Area<br /><span className="text-[9px] lowercase">(sq.w.)</span></th>
                                            <th className="px-4 py-3 text-right">price/sq.m</th>
                                            <th className="px-4 py-3 text-right">price/sq.w.</th>
                                            <th className="px-4 py-3 text-right">AVG PRICE</th>
                                            <th className="px-4 py-3 text-right">sold%</th>
                                            <th className="px-2 py-3 text-right">Sale Speed (6 เดือน)</th>
                                            <th className="px-2 py-3 text-right">Sale Speed</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {stats.topProjects.map((p, i) => {
                                            const rowStats = calculateProjectRowStats(p);

                                            return (
                                                <tr key={p.projectId} className="transition-all duration-300">
                                                    <td className="px-4 py-3.5">
                                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-mono font-medium ${i === 0 ? 'bg-[#FFF9C4] text-yellow-800' : 'bg-white text-gray-600 border border-gray-100'}`}>
                                                            {i + 1}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <div className="font-medium text-gray-800 text-[13px]">{p.name}</div>
                                                        <div className="text-[10px] text-gray-500 font-sans tracking-wide truncate max-w-[150px]" title={p.developer}>{p.developer}</div>
                                                    </td>
                                                    <td className="px-2 py-3.5 text-center text-gray-500 font-mono">{rowStats.launchDate}</td>
                                                    <td className="px-4 py-3.5 text-right text-gray-500 font-mono">{rowStats.avgAreaDisplay}</td>
                                                    <td className="px-4 py-3.5 text-right text-gray-500 font-mono">{rowStats.avgLandDisplay}</td>
                                                    <td className="px-4 py-3.5 text-right font-medium text-gray-800 font-mono">{rowStats.priceSqmDisplay}</td>
                                                    <td className="px-4 py-3.5 text-right font-medium text-gray-800 font-mono">{rowStats.priceSqwDisplay}</td>
                                                    <td className="px-4 py-3.5 text-right font-medium text-gray-800 font-mono">{rowStats.avgPriceDisplay}</td>
                                                    <td className="px-4 py-3.5 text-right font-mono text-scbx font-bold">
                                                        <div className="flex flex-col items-end">
                                                            <span>{Math.round(Number(p.percentSold))}%</span>
                                                            <span className="text-[9px] text-gray-400 font-sans font-normal mt-0.5">
                                                                ({p.soldUnits.toLocaleString()}/{p.totalUnits.toLocaleString()})
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-3.5 text-right text-gray-900 font-bold font-mono">{p.saleSpeed6m} <span className="text-[9px] text-gray-400 font-sans font-normal">unit/mo</span></td>
                                                    <td className="px-2 py-3.5 text-right text-gray-500 font-mono">{p.saleSpeed}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                            <img src="/logo-text.svg" alt="Radia" className="h-6 w-auto" />
                            <div>{new Date().toLocaleDateString()}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExportDashboard;