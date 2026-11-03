import React from 'react';

interface RangeSliderProps {
    lo: number;
    hi: number;
    step: number;
    // null means the handle sits at its bound (no limit on that side)
    valueMin: number | null;
    valueMax: number | null;
    onChange: (min: number | null, max: number | null) => void;
    format: (v: number) => string;
    ariaLabel: string;
}

const RangeSlider: React.FC<RangeSliderProps> = ({ lo, hi, step, valueMin, valueMax, onChange, format, ariaLabel }) => {
    const low = Math.max(lo, Math.min(valueMin ?? lo, hi));
    const high = Math.min(hi, Math.max(valueMax ?? hi, lo));
    const lowPct = ((low - lo) / (hi - lo)) * 100;
    const highPct = ((high - lo) / (hi - lo)) * 100;

    return (
        <div>
            <div className="text-xs font-bold text-scbx mb-3">{format(low)} – {format(high)}</div>
            <div className="px-1">
                <div className="relative h-1.5">
                    <div
                        className="absolute inset-0 rounded-full"
                        style={{
                            background: `linear-gradient(to right, #e5e7eb 0%, #e5e7eb ${lowPct}%, #000 ${lowPct}%, #000 ${highPct}%, #e5e7eb ${highPct}%, #e5e7eb 100%)`
                        }}
                    />
                    <input
                        type="range"
                        min={lo}
                        max={hi}
                        step={step}
                        value={low}
                        aria-label={`Minimum ${ariaLabel}`}
                        onChange={(e) => {
                            const v = Math.min(parseFloat(e.target.value), high - step);
                            onChange(v <= lo ? null : v, valueMax);
                        }}
                        className="absolute inset-x-0 -top-1.5 w-full h-[18px] custom-range dual-range"
                    />
                    <input
                        type="range"
                        min={lo}
                        max={hi}
                        step={step}
                        value={high}
                        aria-label={`Maximum ${ariaLabel}`}
                        onChange={(e) => {
                            const v = Math.max(parseFloat(e.target.value), low + step);
                            onChange(valueMin, v >= hi ? null : v);
                        }}
                        className="absolute inset-x-0 -top-1.5 w-full h-[18px] custom-range dual-range"
                    />
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-medium">
                    <span>{format(lo)}</span>
                    <span>{format(hi)}</span>
                </div>
            </div>
        </div>
    );
};

export default RangeSlider;
