<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

  # 🏘️ Radia — Real Estate Research Dashboard

  **A comprehensive, interactive real estate market analysis tool**
  **with map visualization, data-driven filtering, AI-powered insights, and exportable reports.**

  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Leaflet](https://img.shields.io/badge/Leaflet-Maps-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
  [![Gemini AI](https://img.shields.io/badge/Gemini-AI_Insights-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)

</div>

---

## 📖 Table of Contents

- [Why — The Problem](#-why--the-problem)
- [What — The Solution](#-what--the-solution)
- [How — Architecture & Technology](#-how--architecture--technology)
- [Features In-Depth](#-features-in-depth)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [CSV Data Format](#-csv-data-format)
- [Environment Variables](#-environment-variables)
- [License](#-license)

---

## 🤔 Why — The Problem

Real estate market analysis in Thailand is traditionally a **manual, time-consuming, and fragmented** process:

1.  **Data Overload** — Market researchers collect large amounts of competitor data (project locations, unit types, pricing, sales velocity, launch dates) in spreadsheets, but there's no efficient way to *visualize* and *compare* them geographically.

2.  **No Spatial Context** — Knowing that a competitor project exists is useful, but understanding *where it sits relative to your target location*, nearby amenities (malls, hospitals, schools), and other competitors is critical for strategic decision-making. Spreadsheets can't provide this.

3.  **Slow Insight Generation** — Analysts spend hours manually cross-referencing data, calculating weighted averages, and writing competitor reports. This delays decision-making on land acquisition, pricing strategy, and product positioning.

4.  **Inconsistent Reporting** — Each analyst may format reports differently, making it difficult to standardize insights across teams and stakeholders.

**Radia was built to solve all of these problems in a single, interactive web application.**

---

## 💡 What — The Solution

**Radia (Real Estate Research Dashboard)** is an interactive, browser-based dashboard that transforms raw CSV market data into a rich, map-centric analysis workspace.

### Core Capabilities at a Glance

| Capability | Description |
|---|---|
| 📍 **Interactive Map** | Plots all competitor projects on a Leaflet map with color-coded markers by area code. Search by lat/lng coordinates with a configurable radius circle. |
| 📂 **CSV Data Import** | Upload your market survey spreadsheet and the app automatically parses, groups, and structures the data into projects with sub-units. |
| 🔍 **Multi-Filter Search** | Filter projects by property type, area code, price range, price segment, launch date, sold percentage, and sort by multiple criteria. |
| 🏢 **Project Detail Panel** | Click any project to see a detailed breakdown: unit mix, pricing, sales velocity, historical trends presented as interactive bar charts. |
| 🏥 **Nearby Amenities** | Automatically fetches nearby malls, hospitals, and schools from the OpenStreetMap Overpass API, showing distance and ratings. |
| 🤖 **AI-Powered Analysis** | Leverages **Google Gemini AI** to automatically generate strategic market overviews, competitor performance analysis, and competitive gap recommendations. |
| 📊 **Export Dashboard** | A dedicated export view with aggregated statistics, summary tables, and the ability to export data as **CSV** or capture the dashboard as a **PNG image**. |

---

## 🔧 How — Architecture & Technology

### Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React 19 + TypeScript | Component-based UI with strict typing |
| **Build Tool** | Vite 6 | Lightning-fast HMR and optimized production builds |
| **Styling** | Tailwind CSS (CDN) + Custom CSS | Utility-first styling with glassmorphism effects |
| **Maps** | Leaflet + React-Leaflet | Interactive map rendering with custom markers, circles, and tooltips |
| **Data Parsing** | PapaParse | Robust CSV parsing with header detection and encoding support |
| **AI Engine** | Google Gemini (via `@google/genai`) | Generates strategic market analysis from competitor data |
| **Image Export** | html2canvas + jsPDF | Captures dashboard views as downloadable PNG images |
| **Icons** | Lucide React | Consistent, modern icon library |
| **Typography** | Google Fonts (Sarabun) | Thai-optimized font for bilingual content |
| **Analytics** | Vercel Analytics | Usage tracking for deployed instances |

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (Client)                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │   Sidebar    │  │   Map View   │  │  Results / Filter  │  │
│  │  (Filters)   │  │  (Leaflet)   │  │     Panel          │  │
│  │             │  │              │  │                    │  │
│  │ • Search    │  │ • Markers    │  │ • Project List     │  │
│  │ • Type      │  │ • Radius     │  │ • Sort / Search    │  │
│  │ • Price     │  │ • Tooltips   │  │ • Nearby Places    │  │
│  │ • Area Code │  │ • Fly-to     │  │   (Overpass API)   │  │
│  │ • Date      │  │ • Layers     │  │                    │  │
│  │ • Sold %    │  │              │  │                    │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬───────────┘  │
│         │               │                    │              │
│         └───────────────┼────────────────────┘              │
│                         │                                    │
│                  ┌──────▼───────┐                            │
│                  │    App.tsx    │  ← Central State Manager   │
│                  │   (Root)     │                            │
│                  └──────┬───────┘                            │
│                         │                                    │
│         ┌───────────────┼──────────────────┐                │
│         ▼               ▼                  ▼                │
│  ┌─────────────┐ ┌──────────────┐  ┌───────────────────┐   │
│  │ csvService  │ │geminiService │  │ ProjectDetail     │   │
│  │             │ │              │  │ Panel             │   │
│  │ Parse CSV → │ │ Gemini AI →  │  │                   │   │
│  │ Project[]   │ │ Analysis     │  │ • Overview        │   │
│  └─────────────┘ └──────────────┘  │ • Trend Charts    │   │
│                                     └───────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Export Dashboard                         │   │
│  │  • Summary Stats  • Data Table  • CSV Download       │   │
│  │  • PNG Capture    • Aggregation by Type               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
  ┌──────────────┐              ┌───────────────┐
  │ Overpass API │              │ Google Gemini  │
  │ (OSM Data)  │              │ API            │
  └──────────────┘              └───────────────┘
```

### Data Flow

1.  **Upload** — User uploads a `.csv` file containing competitor project data.
2.  **Parse** — `csvService.ts` uses PapaParse to detect headers (case-insensitive, Thai-compatible), group rows by project ID, and construct structured `Project[]` data with `SubUnit[]` children.
3.  **Visualize** — Projects are plotted on the map with color-coded markers (based on area code letter/hue). The sidebar shows active filters, and the results panel lists all matching projects.
4.  **Filter** — The user refines the view using spatial filters (lat/lng + radius), property type, area code, price segment, launch date, and sold percentage.
5.  **Analyze** — Clicking a project opens a detail panel with bar charts (sales velocity over time periods like H1.67, H2.67). The user can trigger an AI analysis via Gemini.
6.  **Export** — The export dashboard aggregates data, shows summary statistics, and allows CSV download or PNG image capture.

---

## 🔎 Features In-Depth

### 🗺️ Interactive Map
- **Leaflet-powered** with OpenStreetMap tiles (standard + satellite toggle).
- **Custom numbered markers** with colors derived from area code letters (consistent hue mapping for all 26 letters).
- **Search radius circle** overlay when in location search mode.
- **Fly-to animation** when selecting a project from the list.
- **Hover effects** that scale and highlight markers on the map.
- **Re-center** button to reset the map view.

### 📋 Sidebar Filters
- **Dual search mode**: Search by GPS coordinates (`location`) or by Area Code (`code`).
- **Property type multi-select**: Toggle individual property types (e.g., Townhouse, Condo, Detached House).
- **Area code multi-select**: Select one or multiple area codes to narrow results.
- **Radius slider**: 1km to 20 km adjustable search radius.
- **Price segment filter**: Predefined price buckets (< 0.5 MB, 0.5–1.0 MB, 1.0–2.0 MB, etc.).
- **Launch date filter**: Filter by minimum launch date in YY.MM format (Thai year supported).
- **Sold % threshold**: Hide projects above a certain sold percentage to focus on active competition.
- **Sort options**: Distance, % Sold, Sale Speed (6m), Sale Speed (Total), Price Asc/Desc, Units Left, Launch Date.

### 📊 Project Detail Panel
- **Overview tab**: Unit mix breakdown, total vs. sold units, pricing, sale speed metrics.
- **Trend tab**: Interactive bar charts showing historical sales velocity across time periods (H1/H2 per Thai fiscal year).
- **Per-sub-unit data**: Each property type within a project shown with its own statistics.

### 🤖 AI Market Analysis
- Uses **Google Gemini 3 Flash** model.
- Sends a structured prompt with competitor data summary.
- Returns JSON with three analysis sections:
  - **Market Overview** — Supply landscape and price range summary.
  - **Competitor Performance** — Identifies top sellers and contributing factors.
  - **Competitive Analysis** — Gaps in the market and strategic recommendations.
- Rendered as styled HTML within the dashboard.

### 🏥 Nearby Amenities (OSM)
- Queries multiple **Overpass API mirrors** for fault tolerance.
- Fetches nearby **shopping malls**, **hospitals**, and **schools** within the search radius.
- Displays them as custom-icon markers on the map.
- Shows distance (in km) and a user rating if available.

### 📤 Export Dashboard
- **Summary statistics**: Total projects, total units, average sold %, weighted average price, average sale speed.
- **Data table**: Aggregated project data with key metrics.
- **CSV export**: One-click download of filtered data with comprehensive columns.
- **Image export**: Capture the entire dashboard view as a high-resolution PNG using html2canvas.

---

## 📁 Project Structure

```
radia-base-main/
├── index.html                  # Entry HTML with Tailwind config, Leaflet CSS, custom styles
├── index.tsx                   # React DOM render entry point (with Vercel Analytics)
├── App.tsx                     # Root component — state management, layout, data flow
├── types.ts                    # TypeScript interfaces (Project, SubUnit, SearchState, etc.)
├── vite.config.ts              # Vite build configuration
├── package.json                # Dependencies and scripts
├── metadata.json               # App metadata (name, description)
│
├── components/
│   ├── Sidebar.tsx             # Left sidebar — search input, filters, mode switching
│   ├── Map.tsx                 # Leaflet map — markers, radius circle, layers, tooltips
│   ├── FilterModal.tsx         # Results panel — project list, sorting, nearby places (Overpass)
│   ├── ProjectDetailPanel.tsx  # Detail panel — project overview, trend charts
│   ├── ExportDashboard.tsx     # Export view — stats, table, CSV download, image capture
│   └── HiddenExportTemplates.tsx # Hidden DOM templates for image export rendering
│
├── services/
│   ├── csvService.ts           # CSV parser — PapaParse-based with flexible header matching
│   └── geminiService.ts        # Google Gemini AI integration for market analysis
│
└── dist/                       # Production build output (generated)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or later recommended)
- **npm** (comes with Node.js)
- A **Gemini API Key** (optional, required only for AI analysis features)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/pakincht-bit/radia-base.git
cd radia-base

# 2. Install dependencies
npm install

# 3. (Optional) Set up your Gemini API key
#    Create a .env.local file in the project root:
echo "GEMINI_API_KEY=your_api_key_here" > .env.local

# 4. Start the development server
npm run dev
```

The app will be available at `http://localhost:5173` (default Vite port).

### Production Build

```bash
npm run build
npm run preview
```

---

## 📄 CSV Data Format

The CSV file should contain one row per sub-unit (property type) within a project. Multiple rows with the same `ID` will be grouped into a single project with multiple sub-units.

### Required Columns

| Column | Aliases | Description |
|---|---|---|
| `ID` | `id`, `project_id`, `Project ID` | Unique project identifier (used for grouping) |
| `Latitude` | `lat` | GPS latitude of the project |
| `Longitude` | `lng`, `lon` | GPS longitude of the project |
| `Project Name` | `Name`, `Project` | Display name of the project |
| `Area Code` | `Code Area`, `Code`, `Zone` | Area/zone classification code |

### Optional Columns

| Column | Aliases | Description |
|---|---|---|
| `Developer` | `Dev` | Developer company name |
| `Type` | `Product Type`, `Unit Type` | Property type (e.g., Townhouse, Condo) |
| `Total units` | `Total Units`, `Units` | Total units in the project |
| `Sold Units` | `Sold` | Number of units sold |
| `Avg. Price (Units)` | `Price`, `Avg Price` | Average price per unit |
| `Usable Area (sq.m.)` | `Usable Area`, `Size` | Usable area in square meters |
| `Land Area (sq.w.)` | `Land Area` | Land area in square wah |
| `Sale Speed (6 เดือน)` | `Sale Speed 6m`, `Speed 6m` | Sale speed over 6 months |
| `Sale Speed` | `Speed`, `Total Sale Speed` | Overall sale speed |
| `Launch date (YY.MM)` | `Launch Date`, `Launch` | Launch date in YY.MM format |
| `H1.XX`, `H2.XX` | — | Historical period data (e.g., `H1.67`, `H2.67 (12m)`) |

> **Note:** Column matching is **case-insensitive** and supports **Thai text normalization**. The parser automatically detects the header row even if there are preceding non-header rows.

---

## 🔐 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Optional | Google Gemini API key for AI-powered market analysis |

Set this in a `.env.local` file at the project root:

```
GEMINI_API_KEY=your_api_key_here
```

---

## 👥 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📃 License

This project is private and proprietary. All rights reserved.

---

<div align="center">
  <br />
  <strong>Built with ❤️ for Real Estate Market Intelligence</strong>
  <br />
  <sub>Powered by React · Leaflet · Google Gemini AI</sub>
</div>
