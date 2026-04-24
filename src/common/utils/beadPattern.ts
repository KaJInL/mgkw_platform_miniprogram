import { beadPalette, type BeadPaletteColor } from "@/common/constants/beadPalette";

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface LabColor {
  l: number;
  a: number;
  b: number;
}

interface CellSample {
  rgb: RgbColor | null;
  representativeRgb: RgbColor | null;
  dominantRgb: RgbColor | null;
  alphaRatio: number;
  variance: number;
}

export interface BeadPatternOptions {
  longSide?: number;
  targetWidth?: number;
  targetHeight?: number;
  maxColors: number;
  cleanupPasses?: number;
  preserveBackgroundBlank?: boolean;
}

export interface BeadPatternLegendItem extends BeadPaletteColor {
  count: number;
}

export interface BeadPatternResult {
  width: number;
  height: number;
  rows: Array<Array<string | null>>;
  legend: BeadPatternLegendItem[];
  totalBeads: number;
  boardColumns: number;
  boardRows: number;
  boardSize: number;
  sourceWidth: number;
  sourceHeight: number;
  generatedAt: string;
  sourceImagePath: string;
  previewUrl?: string;
  options: BeadPatternOptions;
}

const BOARD_SIZE = 29;
const DEFAULT_CLEANUP_PASSES = 2;
const DEFAULT_REGION_NOISE_SIZE = 3;
const REGION_SIMILARITY_THRESHOLD = 12;

const paletteRgbMap = Object.fromEntries(
  beadPalette.map((color) => [color.id, hexToRgb(color.hex)]),
) as Record<string, RgbColor>;
const paletteLabMap = Object.fromEntries(
  beadPalette.map((color) => [color.id, rgbToLab(hexToRgb(color.hex))]),
) as Record<string, LabColor>;

export function buildBeadPatternFromImageData(
  pixelData: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  sourceImagePath: string,
  options: BeadPatternOptions,
): BeadPatternResult {
  const safeTargetWidth = clamp(Math.round(options.targetWidth || 0), 0, 1000);
  const safeTargetHeight = clamp(Math.round(options.targetHeight || 0), 0, 1000);
  const safeLongSide = clamp(Math.round(options.longSide || 48), 20, 1000);
  const safeMaxColors = clamp(Math.round(options.maxColors || 16), 4, beadPalette.length);
  const cleanupPasses = clamp(Math.round(options.cleanupPasses || DEFAULT_CLEANUP_PASSES), 0, 4);
  const preserveBackgroundBlank = options.preserveBackgroundBlank !== false;
  const width = Math.max(
    12,
    safeTargetWidth || Math.round((sourceWidth / Math.max(sourceWidth, sourceHeight)) * safeLongSide),
  );
  const height = Math.max(
    12,
    safeTargetHeight || Math.round((sourceHeight / Math.max(sourceWidth, sourceHeight)) * safeLongSide),
  );

  const rows = Array.from({ length: height }, () => Array<string | null>(width).fill(null));
  const samples = Array.from({ length: height }, () => Array<CellSample>(width));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sample = sampleCell(pixelData, sourceWidth, sourceHeight, x, y, width, height);
      samples[y][x] = sample;
    }
  }

  mapSamplesToRows(samples, rows);

  if (preserveBackgroundBlank) {
    removeOuterBackground(rows, samples);
  }
  limitPaletteUsage(rows, safeMaxColors);
  mergeSimilarRegions(rows, REGION_SIMILARITY_THRESHOLD);
  cleanupNoise(rows, maxSideAwareCleanupPasses(width, height, cleanupPasses));
  cleanupSmallRegions(rows, maxSideAwareRegionSize(width, height, DEFAULT_REGION_NOISE_SIZE));
  fillSmallBlankHoles(rows, maxSideAwareHoleSize(width, height));

  const counts = countColors(rows);
  const legend = counts
    .map(([colorId, count]) => {
      const paletteColor = beadPalette.find((item) => item.id === colorId);
      if (!paletteColor) {
        return null;
      }
      return { ...paletteColor, count };
    })
    .filter((item): item is BeadPatternLegendItem => Boolean(item));

  return {
    width,
    height,
    rows,
    legend,
    totalBeads: legend.reduce((sum, item) => sum + item.count, 0),
    boardColumns: Math.ceil(width / BOARD_SIZE),
    boardRows: Math.ceil(height / BOARD_SIZE),
    boardSize: BOARD_SIZE,
    sourceWidth,
    sourceHeight,
    generatedAt: new Date().toISOString(),
    sourceImagePath,
    options: {
      longSide: safeLongSide,
      targetWidth: width,
      targetHeight: height,
      maxColors: safeMaxColors,
      cleanupPasses,
      preserveBackgroundBlank,
    },
  };
}

function sampleCell(
  pixelData: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  cellX: number,
  cellY: number,
  targetWidth: number,
  targetHeight: number,
): CellSample {
  const xStart = Math.floor((cellX * sourceWidth) / targetWidth);
  const yStart = Math.floor((cellY * sourceHeight) / targetHeight);
  const xEnd = Math.max(xStart + 1, Math.floor(((cellX + 1) * sourceWidth) / targetWidth));
  const yEnd = Math.max(yStart + 1, Math.floor(((cellY + 1) * sourceHeight) / targetHeight));

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let visiblePixels = 0;
  const sampledColors: RgbColor[] = [];
  const colorBins = new Map<string, { color: RgbColor; count: number }>();
  const totalPixels = (xEnd - xStart) * (yEnd - yStart);
  const centerX = Math.min(sourceWidth - 1, Math.floor((xStart + xEnd - 1) / 2));
  const centerY = Math.min(sourceHeight - 1, Math.floor((yStart + yEnd - 1) / 2));
  const centerOffset = (centerY * sourceWidth + centerX) * 4;
  const centerRgb: RgbColor = {
    r: pixelData[centerOffset],
    g: pixelData[centerOffset + 1],
    b: pixelData[centerOffset + 2],
  };

  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const offset = (y * sourceWidth + x) * 4;
      const alpha = pixelData[offset + 3] / 255;

      if (alpha < 0.08) {
        continue;
      }

      rSum += pixelData[offset] * alpha;
      gSum += pixelData[offset + 1] * alpha;
      bSum += pixelData[offset + 2] * alpha;
      visiblePixels += alpha;
      const binKey = `${Math.round(pixelData[offset] / 16)}-${Math.round(pixelData[offset + 1] / 16)}-${Math.round(pixelData[offset + 2] / 16)}`;
      const color = {
        r: pixelData[offset],
        g: pixelData[offset + 1],
        b: pixelData[offset + 2],
      };
      const existingBin = colorBins.get(binKey);
      if (existingBin) {
        existingBin.count += 1;
      } else {
        colorBins.set(binKey, { color, count: 1 });
      }

      if (sampledColors.length < 12) {
        sampledColors.push(color);
      }
    }
  }

  if (visiblePixels <= 0) {
    return {
      rgb: null,
      representativeRgb: null,
      dominantRgb: null,
      alphaRatio: 0,
      variance: 0,
    };
  }

  const averageRgb = {
    r: Math.round(rSum / visiblePixels),
    g: Math.round(gSum / visiblePixels),
    b: Math.round(bSum / visiblePixels),
  };
  const variance = sampledColors.length > 0
    ? sampledColors.reduce((sum, color) => sum + colorDistanceSimple(color, averageRgb), 0) / sampledColors.length
    : 0;
  const representativeRgb = variance > 900
    ? blendColors(centerRgb, averageRgb, 0.62)
    : averageRgb;
  const dominantBin = [...colorBins.values()].sort((left, right) => right.count - left.count)[0];
  const dominantRgb = dominantBin ? dominantBin.color : representativeRgb;

  return {
    rgb: averageRgb,
    representativeRgb,
    dominantRgb,
    alphaRatio: visiblePixels / totalPixels,
    variance,
  };
}

function mapSamplesToRows(samples: CellSample[][], rows: Array<Array<string | null>>) {
  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows[y].length; x += 1) {
      const sample = samples[y][x];
      if (sample.alphaRatio <= 0.25 || !sample.dominantRgb) {
        continue;
      }
      const currentColor = sample.variance > 700 && sample.representativeRgb
        ? blendColors(sample.dominantRgb, sample.representativeRgb, 0.72)
        : sample.dominantRgb;
      const nearest = findNearestPaletteColor(currentColor, beadPalette);
      rows[y][x] = nearest.id;
    }
  }
}

function limitPaletteUsage(rows: Array<Array<string | null>>, maxColors: number) {
  const usage = countColors(rows);
  const keepIds = usage.slice(0, maxColors).map(([colorId]) => colorId);
  const keepPalette = beadPalette.filter((item) => keepIds.includes(item.id));

  if (keepPalette.length === 0 || keepPalette.length === usage.length) {
    return;
  }

  const keepSet = new Set(keepIds);

  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows[y].length; x += 1) {
      const cell = rows[y][x];
      if (!cell || keepSet.has(cell)) {
        continue;
      }
      rows[y][x] = findNearestPaletteColor(paletteRgbMap[cell], keepPalette).id;
    }
  }
}

function mergeSimilarRegions(rows: Array<Array<string | null>>, threshold: number) {
  const visited = Array.from({ length: rows.length }, () => Array<boolean>(rows[0]?.length || 0).fill(false));
  const directions = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows[y].length; x += 1) {
      const seed = rows[y][x];
      if (!seed || visited[y][x]) {
        continue;
      }

      const queue: Array<[number, number]> = [[x, y]];
      const region: Array<[number, number]> = [];
      const regionColors: string[] = [];
      visited[y][x] = true;

      while (queue.length > 0) {
        const [currentX, currentY] = queue.shift()!;
        const currentCell = rows[currentY][currentX];
        if (!currentCell) {
          continue;
        }
        region.push([currentX, currentY]);
        regionColors.push(currentCell);

        directions.forEach(([dx, dy]) => {
          const nextX = currentX + dx;
          const nextY = currentY + dy;
          if (
            nextY < 0 ||
            nextY >= rows.length ||
            nextX < 0 ||
            nextX >= rows[nextY].length ||
            visited[nextY][nextX]
          ) {
            return;
          }

          const nextCell = rows[nextY][nextX];
          if (!nextCell) {
            return;
          }

          const currentLab = paletteLabMap[currentCell];
          const nextLab = paletteLabMap[nextCell];
          if (labDistance(currentLab, nextLab) > threshold) {
            return;
          }

          visited[nextY][nextX] = true;
          queue.push([nextX, nextY]);
        });
      }

      if (region.length <= 1) {
        continue;
      }

      const replacement = findMajorityColor(regionColors);
      if (!replacement) {
        continue;
      }

      region.forEach(([regionX, regionY]) => {
        rows[regionY][regionX] = replacement;
      });
    }
  }
}

function cleanupNoise(rows: Array<Array<string | null>>, passes: number) {
  const directions = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  for (let passIndex = 0; passIndex < passes; passIndex += 1) {
    const nextRows = rows.map((row) => [...row]);

    for (let y = 0; y < rows.length; y += 1) {
      for (let x = 0; x < rows[y].length; x += 1) {
        const current = rows[y][x];
        if (!current) {
          continue;
        }

        const neighborIds = directions
          .map(([dx, dy]) => rows[y + dy]?.[x + dx] || null)
          .filter((value): value is string => Boolean(value));

        if (neighborIds.length < 3) {
          continue;
        }

        const majority = findMajorityColor(neighborIds);
        if (!majority || majority === current) {
          continue;
        }

        const majorityCount = neighborIds.filter((id) => id === majority).length;
        if (majorityCount < 3) {
          continue;
        }

        nextRows[y][x] = majority;
      }
    }

    for (let y = 0; y < rows.length; y += 1) {
      rows[y] = [...nextRows[y]];
    }
  }
}

function removeOuterBackground(rows: Array<Array<string | null>>, samples: CellSample[][]) {
  const backgroundSeedIds = detectBackgroundSeedIds(rows);
  if (backgroundSeedIds.length === 0) {
    return;
  }

  const queue: Array<[number, number]> = [];
  const visited = Array.from({ length: rows.length }, () => Array<boolean>(rows[0]?.length || 0).fill(false));

  const pushIfCandidate = (x: number, y: number) => {
    if (!rows[y] || rows[y][x] === undefined || visited[y][x]) {
      return;
    }
    const cell = rows[y][x];
    const sample = samples[y][x];
    if (!isBackgroundCandidate(cell, sample, backgroundSeedIds)) {
      return;
    }
    visited[y][x] = true;
    queue.push([x, y]);
  };

  for (let x = 0; x < rows[0].length; x += 1) {
    pushIfCandidate(x, 0);
    pushIfCandidate(x, rows.length - 1);
  }
  for (let y = 0; y < rows.length; y += 1) {
    pushIfCandidate(0, y);
    pushIfCandidate(rows[0].length - 1, y);
  }

  const directions = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    rows[y][x] = null;

    directions.forEach(([dx, dy]) => {
      const nextX = x + dx;
      const nextY = y + dy;
      if (
        nextY < 0 ||
        nextY >= rows.length ||
        nextX < 0 ||
        nextX >= rows[nextY].length ||
        visited[nextY][nextX]
      ) {
        return;
      }

      const cell = rows[nextY][nextX];
      const sample = samples[nextY][nextX];
      if (!isBackgroundCandidate(cell, sample, backgroundSeedIds)) {
        return;
      }

      visited[nextY][nextX] = true;
      queue.push([nextX, nextY]);
    });
  }
}

function detectBackgroundSeedIds(rows: Array<Array<string | null>>) {
  const countMap = new Map<string, number>();

  const collect = (cell: string | null) => {
    if (!cell) {
      return;
    }
    countMap.set(cell, (countMap.get(cell) || 0) + 1);
  };

  rows[0]?.forEach(collect);
  rows[rows.length - 1]?.forEach(collect);
  rows.forEach((row) => {
    collect(row[0] || null);
    collect(row[row.length - 1] || null);
  });

  return [...countMap.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([colorId]) => colorId);
}

function isBackgroundCandidate(cell: string | null, sample: CellSample, backgroundSeedIds: string[]) {
  if (!cell) {
    return true;
  }
  if (sample.alphaRatio < 0.42) {
    return true;
  }
  if (backgroundSeedIds.includes(cell)) {
    return true;
  }

  const cellLab = paletteLabMap[cell];
  return backgroundSeedIds.some((seedId) => {
    const seedLab = paletteLabMap[seedId];
    return labDistance(cellLab, seedLab) < 14;
  });
}

function cleanupSmallRegions(rows: Array<Array<string | null>>, maxRegionSize: number) {
  const visited = Array.from({ length: rows.length }, () => Array<boolean>(rows[0]?.length || 0).fill(false));
  const directions = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows[y].length; x += 1) {
      const current = rows[y][x];
      if (!current || visited[y][x]) {
        continue;
      }

      const queue: Array<[number, number]> = [[x, y]];
      const region: Array<[number, number]> = [];
      const neighborColors: string[] = [];
      visited[y][x] = true;

      while (queue.length > 0) {
        const [currentX, currentY] = queue.shift()!;
        region.push([currentX, currentY]);

        directions.forEach(([dx, dy]) => {
          const nextX = currentX + dx;
          const nextY = currentY + dy;

          if (
            nextY < 0 ||
            nextY >= rows.length ||
            nextX < 0 ||
            nextX >= rows[nextY].length
          ) {
            return;
          }

          const nextCell = rows[nextY][nextX];
          if (nextCell === current && !visited[nextY][nextX]) {
            visited[nextY][nextX] = true;
            queue.push([nextX, nextY]);
            return;
          }

          if (nextCell && nextCell !== current) {
            neighborColors.push(nextCell);
          }
        });
      }

      if (region.length > maxRegionSize || neighborColors.length === 0) {
        continue;
      }

      const replacement = findMajorityColor(neighborColors);
      if (!replacement) {
        continue;
      }

      region.forEach(([regionX, regionY]) => {
        rows[regionY][regionX] = replacement;
      });
    }
  }
}

function fillSmallBlankHoles(rows: Array<Array<string | null>>, maxHoleSize: number) {
  const visited = Array.from({ length: rows.length }, () => Array<boolean>(rows[0]?.length || 0).fill(false));
  const directions = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows[y].length; x += 1) {
      if (rows[y][x] !== null || visited[y][x]) {
        continue;
      }

      const queue: Array<[number, number]> = [[x, y]];
      const hole: Array<[number, number]> = [];
      const neighborColors: string[] = [];
      let touchesBoundary = false;
      visited[y][x] = true;

      while (queue.length > 0) {
        const [currentX, currentY] = queue.shift()!;
        hole.push([currentX, currentY]);

        if (
          currentX === 0 ||
          currentY === 0 ||
          currentY === rows.length - 1 ||
          currentX === rows[currentY].length - 1
        ) {
          touchesBoundary = true;
        }

        directions.forEach(([dx, dy]) => {
          const nextX = currentX + dx;
          const nextY = currentY + dy;
          if (
            nextY < 0 ||
            nextY >= rows.length ||
            nextX < 0 ||
            nextX >= rows[nextY].length
          ) {
            return;
          }

          const nextCell = rows[nextY][nextX];
          if (nextCell === null && !visited[nextY][nextX]) {
            visited[nextY][nextX] = true;
            queue.push([nextX, nextY]);
            return;
          }

          if (nextCell) {
            neighborColors.push(nextCell);
          }
        });
      }

      if (touchesBoundary || hole.length > maxHoleSize || neighborColors.length === 0) {
        continue;
      }

      const replacement = findMajorityColor(neighborColors);
      if (!replacement) {
        continue;
      }

      hole.forEach(([holeX, holeY]) => {
        rows[holeY][holeX] = replacement;
      });
    }
  }
}

function countColors(rows: Array<Array<string | null>>) {
  const map = new Map<string, number>();

  rows.forEach((row) => {
    row.forEach((cell) => {
      if (!cell) {
        return;
      }
      map.set(cell, (map.get(cell) || 0) + 1);
    });
  });

  return [...map.entries()].sort((left, right) => right[1] - left[1]);
}

function findMajorityColor(colorIds: string[]) {
  const countMap = new Map<string, number>();
  colorIds.forEach((colorId) => {
    countMap.set(colorId, (countMap.get(colorId) || 0) + 1);
  });

  let majorityColor: string | null = null;
  let highestCount = 0;

  countMap.forEach((count, colorId) => {
    if (count > highestCount) {
      majorityColor = colorId;
      highestCount = count;
    }
  });

  return majorityColor;
}

function findNearestPaletteColor(rgb: RgbColor, palette: BeadPaletteColor[]) {
  const targetLab = rgbToLab(rgb);
  let nearest = palette[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  palette.forEach((color) => {
    const paletteLab = paletteLabMap[color.id];
    const paletteRgb = paletteRgbMap[color.id];
    const distance = colorDistance(rgb, paletteRgb, targetLab, paletteLab);
    if (distance < bestDistance) {
      nearest = color;
      bestDistance = distance;
    }
  });

  return nearest;
}

function colorDistance(leftRgb: RgbColor, rightRgb: RgbColor, leftLab: LabColor, rightLab: LabColor) {
  const lightnessDiff = leftLab.l - rightLab.l;
  const aDiff = leftLab.a - rightLab.a;
  const bDiff = leftLab.b - rightLab.b;
  const rgbDiff =
    Math.abs(leftRgb.r - rightRgb.r) * 0.35 +
    Math.abs(leftRgb.g - rightRgb.g) * 0.45 +
    Math.abs(leftRgb.b - rightRgb.b) * 0.2;

  return (lightnessDiff * lightnessDiff * 1.35) + (aDiff * aDiff) + (bDiff * bDiff) + rgbDiff;
}

function labDistance(left: LabColor, right: LabColor) {
  const lDiff = left.l - right.l;
  const aDiff = left.a - right.a;
  const bDiff = left.b - right.b;
  return Math.sqrt((lDiff * lDiff) + (aDiff * aDiff) + (bDiff * bDiff));
}

function colorDistanceSimple(left: RgbColor, right: RgbColor) {
  const rDiff = left.r - right.r;
  const gDiff = left.g - right.g;
  const bDiff = left.b - right.b;
  return (rDiff * rDiff) + (gDiff * gDiff) + (bDiff * bDiff);
}

function blendColors(primary: RgbColor, secondary: RgbColor, primaryWeight: number): RgbColor {
  const secondaryWeight = 1 - primaryWeight;
  return {
    r: Math.round((primary.r * primaryWeight) + (secondary.r * secondaryWeight)),
    g: Math.round((primary.g * primaryWeight) + (secondary.g * secondaryWeight)),
    b: Math.round((primary.b * primaryWeight) + (secondary.b * secondaryWeight)),
  };
}

function maxSideAwareCleanupPasses(width: number, height: number, cleanupPasses: number) {
  const maxSide = Math.max(width, height);
  if (maxSide <= 96) {
    return Math.max(0, cleanupPasses - 1);
  }
  return cleanupPasses;
}

function maxSideAwareRegionSize(width: number, height: number, defaultSize: number) {
  const maxSide = Math.max(width, height);
  if (maxSide <= 96) {
    return 1;
  }
  if (maxSide <= 160) {
    return 2;
  }
  return defaultSize;
}

function maxSideAwareHoleSize(width: number, height: number) {
  const maxSide = Math.max(width, height);
  return maxSide <= 96 ? 1 : 2;
}


function hexToRgb(hex: string): RgbColor {
  const normalized = hex.replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToLab(rgb: RgbColor): LabColor {
  const normalized = [rgb.r, rgb.g, rgb.b].map((value) => {
    const channel = value / 255;
    return channel > 0.04045 ? (((channel + 0.055) / 1.055) ** 2.4) : channel / 12.92;
  });

  const x = ((normalized[0] * 0.4124) + (normalized[1] * 0.3576) + (normalized[2] * 0.1805)) / 0.95047;
  const y = (normalized[0] * 0.2126) + (normalized[1] * 0.7152) + (normalized[2] * 0.0722);
  const z = ((normalized[0] * 0.0193) + (normalized[1] * 0.1192) + (normalized[2] * 0.9505)) / 1.08883;

  const [fx, fy, fz] = [x, y, z].map((value) => {
    return value > 0.008856 ? value ** (1 / 3) : ((7.787 * value) + (16 / 116));
  });

  return {
    l: (116 * fy) - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
