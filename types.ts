export interface SubUnit {
  type: string;
  usableArea: string;
  landArea: string;
  totalUnits: number;
  soldUnits: number;
  percentSold: number;
  price: number;
  priceStr: string;
  launchDate: string;
  saleSpeed: string;
  saleSpeed6m: string;
  history: Record<string, number>; // Stores dynamic period data (e.g., "H2.67": 0.85)
}

export interface Project {
  projectId: string;
  lat: number;
  lng: number;
  code: string;
  name: string;
  developer: string;
  subUnits: SubUnit[];
  totalUnits: number;
  soldUnits: number;
  percentSold: string;
  priceRange: string;
  saleSpeed6m: string;
  saleSpeed: string;
  distance?: number; // Calculated at runtime
}

export interface NearbyPlace {
  id: string;
  name: string;
  type: 'mall' | 'hospital' | 'school';
  distance: number;
  rating: number;
  address: string;
  lat: number;
  lng: number;
}

export interface SearchState {
  lat: number;
  lng: number;
  radius: number;
  searchMode: 'location' | 'code';
  codeFilter: string[]; // Changed to array for multi-select
  typeFilter: string[];
  sortBy: 'distance' | 'percentSold' | 'speed6m' | 'speed' | 'priceAsc' | 'priceDesc' | 'unitLeft' | 'launchDate';
  minPrice: number | null;
  maxPrice: number | null;
  minLaunchDate: string | null; // Format "YY.MM" (e.g. "60.01")
  maxSoldPercent: number; // New filter for sold % threshold
}

export interface AIAnalysisResult {
  market_overview: string;
  competitor_performance: string;
  competitive_analysis: string;
}