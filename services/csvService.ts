import Papa from 'papaparse';
import { Project, SubUnit } from '../types';

export const parseCSV = (file: File): Promise<Project[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      beforeFirstChunk: (chunk) => {
        const lines = chunk.split(/\r\n|\r|\n/);
        const headerIndex = lines.findIndex(l => l.includes('Latitude') && l.includes('Longitude'));
        if (headerIndex > 0) {
          return lines.slice(headerIndex).join('\n');
        }
        return chunk;
      },
      complete: (results: any) => {
        try {
          const rawData = results.data;
          const groupedData: Record<string, any[]> = {};

          // Group by ID
          rawData.forEach((row: any) => {
            const id = row['ID'] || row['id'];
            if (!id) return;
            if (!groupedData[id]) groupedData[id] = [];
            groupedData[id].push(row);
          });

          const processedProjects: Project[] = [];

          Object.keys(groupedData).forEach(id => {
            const rows = groupedData[id];
            const baseRow = rows[0];
            const lat = parseFloat(baseRow['Latitude'] || baseRow['latitude'] || '0');
            const lng = parseFloat(baseRow['Longitude'] || baseRow['longitude'] || '0');

            if (!lat || !lng) return;

            const subUnits: SubUnit[] = [];
            let projTotalUnits = 0;
            let projSoldUnits = 0;
            let projSaleSpeed6m = 0;
            let projSaleSpeed = 0;
            const prices: number[] = [];

            rows.forEach((r: any) => {
              const type = r['Type'] || 'Unknown';
              const usable = parseFloat(r['Usable Area (sq.m.)']) || 0;
              const land = parseFloat(r['Land Area (sq.w.)']) || 0;
              const total = parseFloat(r['Total units']) || 0;
              const sold = parseFloat(r['Sold Units']) || 0;
              const price = parseFloat(r['Avg. Price (Units)']) || 0;
              const speed6m = parseFloat(r['Sale Speed (6 เดือน)']) || 0;
              const speed = parseFloat(r['Sale Speed']) || 0;
              const launchDate = r['Launch date (YY.MM)'] || '-';

              projTotalUnits += total;
              projSoldUnits += sold;
              projSaleSpeed6m += speed6m;
              projSaleSpeed += speed;
              if (price > 0) prices.push(price);

              const perSold = total ? (sold / total) * 100 : 0;

              let priceStr = '-';
              if (price > 0) {
                priceStr = (price < 1000 ? price : price / 1000000).toFixed(2) + ' MB';
              }

              subUnits.push({
                type,
                usableArea: usable > 0 ? usable.toFixed(1) : '-',
                landArea: land > 0 ? land.toFixed(1) : '-',
                totalUnits: total,
                soldUnits: sold,
                percentSold: perSold,
                price,
                priceStr,
                launchDate,
                saleSpeed: speed.toFixed(2),
                saleSpeed6m: speed6m.toFixed(2)
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

            processedProjects.push({
              projectId: id,
              lat,
              lng,
              code: baseRow['AREA Code'] || baseRow['Code Area'] || 'XX',
              name: baseRow['Project Name'] || 'Unknown',
              developer: baseRow['Developer'] || '-',
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