export interface ChangelogChange {
  type: 'new' | 'improved' | 'fixed';
  text: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description?: string;
  changes: ChangelogChange[];
}

export const changelogEntries: ChangelogEntry[] = [
  {
    version: 'v1.7.1',
    date: '2026-07-22',
    title: 'CSV Import Compatibility',
    description: 'AREA-style Bangkok exports that use Code/Lat/Lon instead of ID/Latitude/Longitude now import correctly.',
    changes: [
      { type: 'fixed', text: 'CSV parser falls back to Code when ID is missing, so AREA Bkk exports upload successfully' },
      { type: 'fixed', text: 'Area code mapping prefers AREA Code over generic Code so project IDs are not used as zone codes' },
      { type: 'fixed', text: 'Sale speed trend chart now includes all half-year periods (e.g. H1.69 6M), not only (12M) columns' },
      { type: 'improved', text: 'Clear alert when CSV upload yields zero valid projects instead of silently staying on the import modal' },
    ],
  },
  {
    version: 'v1.7.0',
    date: '2026-04-09',
    title: 'Bookmarked Projects',
    description: 'Never lose track of your favorite properties. Signed-in users can now save projects for easy access across sessions.',
    changes: [
      { type: 'new', text: 'Added a "Saved" tab in the project list to filter your bookmarked properties.' },
      { type: 'new', text: 'Star buttons added to project cards, detail panels, and map markers.' },
      { type: 'new', text: 'Bookmarks are synced securely to your user account via Supabase.' },
      { type: 'improved', text: 'Bookmarked projects now bypass map and list filters, acting as a global persistent favorite list.' },
      { type: 'improved', text: 'Nearby place layers (malls, hospitals, etc.) are now hidden by default for a cleaner map.' }
    ]
  },
  {
    version: 'v1.6.0',
    date: '2026-04-03',
    title: 'User Accounts & Authentication',
    description: 'Sign in with Google or email to start building your Radia profile. Your account is ready for upcoming features like saved projects and usage tracking.',
    changes: [
      { type: 'new', text: 'Sign in with Google OAuth or email/password via Supabase Auth' },
      { type: 'new', text: 'User avatar and profile popover in the sidebar with plan badge (Free/Pro)' },
      { type: 'new', text: 'AuthContext provider for app-wide user state management' },
      { type: 'improved', text: 'Supabase client refactored with proper config detection and graceful fallback' },
    ],
  },
  {
    version: 'v1.5.0',
    date: '2026-03-31',
    title: 'Demo Dataset & Instant Onboarding',
    description: 'New users can now explore Radia instantly with a built-in sample dataset — no CSV upload required.',
    changes: [
      { type: 'new', text: '"Try with sample data" button on the Import Data modal for zero-friction first experience' },
      { type: 'new', text: 'Built-in demo dataset with 42 fictional Bangkok RE projects across 15 area codes' },
      { type: 'improved', text: 'CSV parsing engine refactored to eliminate code duplication via shared processRawData function' },
    ],
  },
  {
    version: 'v1.4.1',
    date: '2026-03-30',
    title: 'UI Polish & Dialog Updates',
    description: 'Various visual refinements across the platform including the Welcome Dialog and Export tools.',
    changes: [
      { type: 'improved', text: 'Welcome Dialog redesigned with wider layout, edge-to-edge images, and new Developer slide' },
      { type: 'improved', text: 'Export Dashboard UI updated to smoothly match design system guidelines' },
      { type: 'improved', text: 'Added hotkey hint (R) to Ruler tool tooltip for better discoverability' },
      { type: 'improved', text: 'Adjusted typography weight in Feedback list for cleaner reading' },
    ],
  },
  {
    version: 'v1.4.0',
    date: '2026-03-29',
    title: 'Feedback Center Overhaul',
    description: 'Redesigned the Feedback Center as a full-page experience with a new Changelog tab.',
    changes: [
      { type: 'new', text: 'Full-page Feedback Center with dedicated navigation' },
      { type: 'new', text: 'Changelog tab to track platform updates' },
      { type: 'improved', text: 'Community Requests list now has more breathing room and larger vote buttons' },
      { type: 'fixed', text: 'Focus mode no longer clips floating panels on certain viewports' },
    ],
  },
  {
    version: 'v1.3.0',
    date: '2026-03-28',
    title: 'Map Layers & Nearby Places',
    description: 'Expanded map intelligence with hotels, layer toggles, and smarter duplicate markers.',
    changes: [
      { type: 'new', text: 'Hotel category added to sidebar and map layers' },
      { type: 'new', text: 'Layer visibility toggles for all place categories' },
      { type: 'improved', text: 'Overlapping project markers unified into a single pin icon' },
      { type: 'improved', text: 'Search center marker no longer stacks with project markers' },
      { type: 'fixed', text: 'Coordinate comparison now uses rounded values for precision' },
    ],
  },
  {
    version: 'v1.2.0',
    date: '2026-03-27',
    title: 'Premium Detail Panel & Filters',
    description: 'Visual polish pass on property detail panels and floating filter bar.',
    changes: [
      { type: 'improved', text: 'Project detail panel redesigned with editorial-style typography' },
      { type: 'improved', text: 'Floating filter bar height and button alignment standardized' },
      { type: 'improved', text: 'Summary Report page visual refresh to match panel aesthetics' },
      { type: 'fixed', text: 'Dark mode fully removed — app now defaults to light mode' },
    ],
  },
  {
    version: 'v1.1.0',
    date: '2026-03-25',
    title: 'Export & Data Visualization',
    description: 'Export dashboard as images and improved trend chart rendering.',
    changes: [
      { type: 'new', text: 'Export Report feature — download dashboard summary as PNG' },
      { type: 'new', text: 'Price segment filter for quick market analysis' },
      { type: 'improved', text: 'Property list animations and selection states' },
      { type: 'fixed', text: 'CSV parser now handles edge cases with missing sub-unit data' },
    ],
  },
];
