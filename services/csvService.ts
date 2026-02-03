import Papa from 'papaparse';
import { Project, SubUnit } from '../types';

export const parseCSV = (file: File): Promise<Project[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      beforeFirstChunk: (chunk) => {
        const lines = chunk.split(/\r\n|\r|\n/);
        const headerIndex = lines.findIndex(l => l.toLowerCase().includes('latitude') && l.toLowerCase().includes('longitude'));
        if (headerIndex > 0) {
          return lines.slice(headerIndex).join('\n');
        }
        return chunk;
      },
      complete: (results: any) => {
        try {
          const rawData = results.data;
          const groupedData: Record<string, any[]> = {};

          // Helper to find value by possible keys (case-insensitive & trimmed)
          const getValue = (row: any, possibleKeys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const key of possibleKeys) {
              // Direct check
              if (row[key] !== undefined && row[key] !== '') return row[key];

              // Case-insensitive check
              const foundKey = rowKeys.find(k => k.trim().toLowerCase() === key.toLowerCase());
              if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') return row[foundKey];
            }
            return null;
          };

          // Group by ID
          rawData.forEach((row: any) => {
            const id = getValue(row, ['ID', 'id', 'project_id', 'Project ID']);
            if (!id) return;
            if (!groupedData[id]) groupedData[id] = [];
            groupedData[id].push(row);
          });

          const processedProjects: Project[] = [];

          Object.keys(groupedData).forEach(id => {
            const rows = groupedData[id];
            const baseRow = rows[0];

            const latStr = getValue(baseRow, ['Latitude', 'lat']);
            const lngStr = getValue(baseRow, ['Longitude', 'lng', 'lon']);

            const lat = parseFloat(latStr || '0');
            const lng = parseFloat(lngStr || '0');

            if (!lat || !lng) return;

            const subUnits: SubUnit[] = [];
            let projTotalUnits = 0;
            let projSoldUnits = 0;
            let projSaleSpeed6m = 0;
            let projSaleSpeed = 0;
            const prices: number[] = [];

            rows.forEach((r: any) => {
              // Normalize Thai text: trim, NFC normalize, and remove zero-width characters
              const rawType = getValue(r, ['Type', 'Product Type', 'Unit Type']) || 'Unknown';
              const type = rawType.trim().normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '');

              const usableStr = getValue(r, ['Usable Area (sq.m.)', 'Usable Area', 'Size']);
              const usable = parseFloat(usableStr) || 0;

              const landStr = getValue(r, ['Land Area (sq.w.)', 'Land Area']);
              const land = parseFloat(landStr) || 0;

              const totalStr = getValue(r, ['Total units', 'Total Units', 'Units']);
              const total = parseFloat(totalStr) || 0;

              const soldStr = getValue(r, ['Sold Units', 'Sold']);
              const sold = parseFloat(soldStr) || 0;

              const priceStr = getValue(r, ['Avg. Price (Units)', 'Price', 'Avg Price', 'Avg. Price']);
              const price = parseFloat(priceStr) || 0;

              const speed6mStr = getValue(r, ['Sale Speed (6 เดือน)', 'Sale Speed 6m', 'Speed 6m', 'Sale Speed (6 Months)']);
              let speed6m = parseFloat(speed6mStr) || 0;

              const speedStr = getValue(r, ['Sale Speed', 'Speed', 'Total Sale Speed']);
              const speed = parseFloat(speedStr) || 0;

              const launchDate = getValue(r, ['Launch date (YY.MM)', 'Launch Date', 'Launch']) || '-';

              // Extract history and also try to find latest speed if speed6m is 0
              const history: Record<string, number> = {};
              Object.keys(r).forEach(key => {
                const cleanKey = key.trim();
                if (/^H[12]\.\d+/.test(cleanKey)) {
                  const val = parseFloat(r[key]);
                  if (!isNaN(val)) {
                    history[cleanKey] = val;
                  }
                }
              });

              // If speed6m is 0, try to get it from the latest history key (favoring (12m) keys)
              if (speed6m === 0 && Object.keys(history).length > 0) {
                const hKeys = Object.keys(history).sort((a, b) => {
                  const parseKey = (k: string) => {
                    const m = k.match(/^H([12])\.(\d+)/);
                    if (!m) return { half: 0, year: 0, is12m: false };
                    return {
                      half: parseInt(m[1]),
                      year: parseInt(m[2]),
                      is12m: k.toLowerCase().includes('(12m)')
                    };
                  };
                  const aV = parseKey(a);
                  const bV = parseKey(b);
                  if (aV.is12m !== bV.is12m) return bV.is12m ? 1 : -1; // Prefer (12m)
                  if (aV.year !== bV.year) return bV.year - aV.year;
                  return bV.half - aV.half;
                });
                if (hKeys.length > 0) {
                  speed6m = history[hKeys[0]];
                }
              }

              projTotalUnits += total;
              projSoldUnits += sold;
              projSaleSpeed6m += speed6m;
              projSaleSpeed += speed;
              if (price > 0) prices.push(price);

              const perSold = total ? (sold / total) * 100 : 0;

              let priceDisplay = '-';
              if (price > 0) {
                priceDisplay = (price < 1000 ? price : price / 1000000).toFixed(2) + ' MB';
              }

              subUnits.push({
                type,
                usableArea: usable > 0 ? usable.toFixed(1) : '-',
                landArea: land > 0 ? land.toFixed(1) : '-',
                totalUnits: total,
                soldUnits: sold,
                percentSold: perSold,
                price,
                priceStr: priceDisplay,
                launchDate,
                saleSpeed: speed.toFixed(2),
                saleSpeed6m: speed6m.toFixed(2),
                history
              });
            });

            const projPercentSold = projTotalUnits ? (projSoldUnits / projTotalUnits) * 100 : 0;
            let priceRange = 'N/A';
            if (prices.length > 0) {
              const minP = Math.min(...prices);
              const maxP = Math.max(...prices);
              const minStr = (minP < 1000 ? minP : minP / 1000000).toFixed(2);
              const maxStr = (maxP < 1000 ? maxP : maxP / 1000000).toFixed(2);
              priceRange = minP === maxP ? `${minStr} MB` : `${minStr} - ${maxStr} MB`;
            }

            const code = getValue(baseRow, ['Area Code', 'Code Area', 'Code', 'AREA Code', 'Zone', 'Location Code', 'Zone Code']);
            const name = getValue(baseRow, ['Project Name', 'Name', 'Project']);
            const developer = getValue(baseRow, ['Developer', 'Dev']) || '-';

            processedProjects.push({
              projectId: id,
              lat,
              lng,
              code: code || 'XX',
              name: name || 'Unknown',
              developer: developer,
              subUnits,
              totalUnits: projTotalUnits,
              soldUnits: projSoldUnits,
              percentSold: projPercentSold.toFixed(1),
              priceRange,
              saleSpeed6m: projSaleSpeed6m.toFixed(2),
              saleSpeed: projSaleSpeed.toFixed(2)
            });
          });

          resolve(processedProjects);
        } catch (err) {
          reject(err);
        }
      },
      error: (err: any) => reject(err)
    });
  });
};