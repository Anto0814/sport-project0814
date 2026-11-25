import type { RunRoutePoint, RunSplit, RunStats } from '../types/workout';

const SEMICIRCLE_TO_DEG = 180 / 2147483648;
const EARTH_RADIUS_M = 6371000;
const STOPPED_SPEED_MS = 0.65; // < ~2.34 km/h considered stopped
const MAX_PLAUSIBLE_RUN_SPEED_MS = 14; // > ~50 km/h treated as GPS spike
const ELEVATION_HYSTERESIS_M = 3;

interface RawPoint {
  lat: number;
  lon: number;
  ele?: number;
  timeMs: number;
  hr?: number;
}

export interface ParsedRunResult {
  name: string;
  startedAtIso: string;
  finishedAtIso: string;
  stats: RunStats;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.(gpx|fit)$/i, '').replace(/[_-]+/g, ' ').trim();
}

function computeStatsFromPoints(
  points: RawPoint[],
  format: 'gpx' | 'fit',
  fileName: string
): RunStats {
  const sorted = [...points].sort((a, b) => a.timeMs - b.timeMs);

  const firstTime = sorted[0].timeMs;
  const lastTime = sorted[sorted.length - 1].timeMs;
  const elapsedDurationSec = Math.max(1, Math.round((lastTime - firstTime) / 1000));

  let totalDistanceM = 0;
  let movingDurationSec = 0;
  let stoppedDurationSec = 0;
  let maxSpeedMs = 0;

  // Elevation tracking with hysteresis filter
  let elevationGainM = 0;
  let elevationLossM = 0;
  let anchorEle: number | undefined = sorted[0].ele;

  // Heart rate tracking
  let hrSum = 0;
  let hrCount = 0;
  let maxHr = 0;

  for (const p of sorted) {
    if (p.hr && p.hr > 0) {
      hrSum += p.hr;
      hrCount += 1;
      if (p.hr > maxHr) maxHr = p.hr;
    }
  }

  // Kilometer splits
  const splits: RunSplit[] = [];
  let splitIndex = 1;
  let splitDistM = 0;
  let splitMovingSec = 0;
  let splitElapsedSec = 0;
  let splitEleStart = sorted[0].ele;

  // Track cumulative distance at each point for route preview
  const cumulativeDistKm: number[] = [0];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const dtSec = (curr.timeMs - prev.timeMs) / 1000;

    if (dtSec <= 0) {
      cumulativeDistKm.push(totalDistanceM / 1000);
      continue;
    }

    const dMeters = haversineMeters(prev.lat, prev.lon, curr.lat, curr.lon);
    const speedMs = dMeters / dtSec;

    // Elevation smoothing
    if (curr.ele !== undefined) {
      if (anchorEle === undefined) {
        anchorEle = curr.ele;
      } else {
        const diff = curr.ele - anchorEle;
        if (diff >= ELEVATION_HYSTERESIS_M) {
          elevationGainM += diff;
          anchorEle = curr.ele;
        } else if (diff <= -ELEVATION_HYSTERESIS_M) {
          elevationLossM += Math.abs(diff);
          anchorEle = curr.ele;
        }
      }
    }

    // Ignore obvious GPS teleport glitches for distance/speed
    if (speedMs > MAX_PLAUSIBLE_RUN_SPEED_MS && dMeters > 40) {
      stoppedDurationSec += dtSec;
      splitElapsedSec += dtSec;
      cumulativeDistKm.push(totalDistanceM / 1000);
      continue;
    }

    const isStopped =
      speedMs < STOPPED_SPEED_MS || (dtSec > 20 && speedMs < 1.1);

    if (isStopped) {
      stoppedDurationSec += dtSec;
      splitElapsedSec += dtSec;
      cumulativeDistKm.push(totalDistanceM / 1000);
      continue;
    }

    // Moving segment
    if (dtSec >= 2 && speedMs > maxSpeedMs) {
      maxSpeedMs = speedMs;
    }

    totalDistanceM += dMeters;
    movingDurationSec += dtSec;
    cumulativeDistKm.push(totalDistanceM / 1000);

    // Split accumulation with exact 1000m boundary interpolation
    let remDistM = dMeters;
    let remMoving = dtSec;
    let remElapsed = dtSec;
    let prevEleForSplit = prev.ele;
    const currEleForSplit = curr.ele;

    while (splitDistM + remDistM >= 1000) {
      const neededM = 1000 - splitDistM;
      const ratio = remDistM > 0 ? neededM / remDistM : 1;
      const partMoving = remMoving * ratio;
      const partElapsed = remElapsed * ratio;

      const splitEndEle =
        prevEleForSplit !== undefined && currEleForSplit !== undefined
          ? prevEleForSplit + (currEleForSplit - prevEleForSplit) * ratio
          : currEleForSplit ?? prevEleForSplit;

      const totalSplitMoving = splitMovingSec + partMoving;
      const totalSplitElapsed = splitElapsedSec + partElapsed;
      const paceSecPerKm = totalSplitMoving; // exact 1.000 km
      const speedKmh = totalSplitMoving > 0 ? 3600 / totalSplitMoving : 0;

      splits.push({
        kmIndex: splitIndex,
        distanceKm: 1,
        movingTimeSec: Math.round(totalSplitMoving),
        elapsedTimeSec: Math.round(totalSplitElapsed),
        paceSecPerKm: Math.round(paceSecPerKm),
        speedKmh: Number(speedKmh.toFixed(2)),
        elevationDeltaM:
          splitEleStart !== undefined && splitEndEle !== undefined
            ? Math.round(splitEndEle - splitEleStart)
            : 0,
      });

      splitIndex += 1;
      remDistM -= neededM;
      remMoving -= partMoving;
      remElapsed -= partElapsed;
      splitDistM = 0;
      splitMovingSec = 0;
      splitElapsedSec = 0;
      splitEleStart = splitEndEle;
      prevEleForSplit = splitEndEle;
    }

    splitDistM += remDistM;
    splitMovingSec += remMoving;
    splitElapsedSec += remElapsed;
  }

  // Final partial kilometer split (>= 50 m)
  if (splitDistM >= 50 && splitMovingSec > 0) {
    const partKm = splitDistM / 1000;
    const endEle = sorted[sorted.length - 1].ele;
    splits.push({
      kmIndex: splitIndex,
      distanceKm: Number(partKm.toFixed(2)),
      movingTimeSec: Math.round(splitMovingSec),
      elapsedTimeSec: Math.round(splitElapsedSec),
      paceSecPerKm: Math.round(splitMovingSec / partKm),
      speedKmh: Number((partKm / (splitMovingSec / 3600)).toFixed(2)),
      elevationDeltaM:
        splitEleStart !== undefined && endEle !== undefined
          ? Math.round(endEle - splitEleStart)
          : 0,
    });
  }

  const distanceKm = Number((totalDistanceM / 1000).toFixed(2));
  const roundedMovingSec = Math.max(1, Math.round(movingDurationSec));
  const roundedStoppedSec = Math.max(0, Math.round(elapsedDurationSec - roundedMovingSec));

  const avgMovingSpeedKmh =
    distanceKm > 0 ? Number((distanceKm / (roundedMovingSec / 3600)).toFixed(2)) : 0;
  const avgElapsedSpeedKmh =
    distanceKm > 0 ? Number((distanceKm / (elapsedDurationSec / 3600)).toFixed(2)) : 0;
  const avgMovingPaceSecPerKm =
    distanceKm > 0 ? Math.round(roundedMovingSec / distanceKm) : 0;
  const avgElapsedPaceSecPerKm =
    distanceKm > 0 ? Math.round(elapsedDurationSec / distanceKm) : 0;

  // Downsample routePreview to <= 180 points
  const maxPreview = 180;
  const step = Math.max(1, Math.ceil(sorted.length / maxPreview));
  const routePreview: RunRoutePoint[] = [];
  for (let i = 0; i < sorted.length; i += step) {
    const p = sorted[i];
    routePreview.push({
      lat: Number(p.lat.toFixed(6)),
      lon: Number(p.lon.toFixed(6)),
      ele: p.ele !== undefined ? Math.round(p.ele) : undefined,
      distKm: Number((cumulativeDistKm[i] ?? 0).toFixed(2)),
    });
  }
  const lastIdx = sorted.length - 1;
  if (lastIdx > 0 && (lastIdx % step !== 0)) {
    const lastP = sorted[lastIdx];
    routePreview.push({
      lat: Number(lastP.lat.toFixed(6)),
      lon: Number(lastP.lon.toFixed(6)),
      ele: lastP.ele !== undefined ? Math.round(lastP.ele) : undefined,
      distKm: distanceKm,
    });
  }

  return {
    sourceFormat: format,
    sourceFileName: fileName,
    distanceKm,
    elapsedDurationSec,
    movingDurationSec: roundedMovingSec,
    stoppedDurationSec: roundedStoppedSec,
    avgMovingSpeedKmh,
    avgElapsedSpeedKmh,
    avgMovingPaceSecPerKm,
    avgElapsedPaceSecPerKm,
    maxSpeedKmh: maxSpeedMs > 0 ? Number((maxSpeedMs * 3.6).toFixed(1)) : undefined,
    elevationGainM: Math.round(elevationGainM),
    elevationLossM: Math.round(elevationLossM),
    avgHeartRate: hrCount > 0 ? Math.round(hrSum / hrCount) : undefined,
    maxHeartRate: maxHr > 0 ? Math.round(maxHr) : undefined,
    splits,
    routePreview,
  };
}

function parseGpxText(xmlText: string, fileName: string): ParsedRunResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('Fichier GPX invalide ou corrompu.');
  }

  const trkName =
    doc.querySelector('trk > name')?.textContent?.trim() ||
    doc.querySelector('metadata > name')?.textContent?.trim() ||
    stripExtension(fileName) ||
    'Course Strava (GPX)';

  let ptNodes = Array.from(doc.querySelectorAll('trkpt'));
  if (ptNodes.length === 0) {
    ptNodes = Array.from(doc.querySelectorAll('rtept'));
  }

  const points: RawPoint[] = [];
  for (const node of ptNodes) {
    const lat = Number(node.getAttribute('lat'));
    const lon = Number(node.getAttribute('lon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const timeText = node.querySelector('time')?.textContent?.trim();
    if (!timeText) continue;
    const timeMs = Date.parse(timeText);
    if (!Number.isFinite(timeMs)) continue;

    const eleText = node.querySelector('ele')?.textContent?.trim();
    const ele = eleText !== undefined && eleText !== '' ? Number(eleText) : undefined;

    // Strava GPX heart rate extension
    const hrNode = node.getElementsByTagNameNS('*', 'hr')[0];
    const hrVal = hrNode?.textContent ? Number(hrNode.textContent) : undefined;

    points.push({
      lat,
      lon,
      ele: ele !== undefined && Number.isFinite(ele) ? ele : undefined,
      timeMs,
      hr: hrVal && Number.isFinite(hrVal) ? hrVal : undefined,
    });
  }

  if (points.length < 2) {
    throw new Error(
      'Le fichier GPX ne contient pas assez de points GPS horodatés.'
    );
  }

  const stats = computeStatsFromPoints(points, 'gpx', fileName);
  return {
    name: trkName,
    startedAtIso: new Date(points[0].timeMs).toISOString(),
    finishedAtIso: new Date(points[points.length - 1].timeMs).toISOString(),
    stats,
  };
}

async function parseFitBuffer(buffer: ArrayBuffer, fileName: string): Promise<ParsedRunResult> {
  const { Decoder, Stream } = await import('@garmin/fitsdk');
  const stream = Stream.fromArrayBuffer(buffer);
  if (!Decoder.isFIT(stream)) {
    throw new Error('Fichier .fit invalide ou non reconnu.');
  }

  const decoder = new Decoder(stream);
  const { messages } = decoder.read();
  const records = messages.recordMesgs ?? [];

  const points: RawPoint[] = [];
  for (const rec of records) {
    if (
      rec.positionLat !== undefined &&
      rec.positionLong !== undefined &&
      rec.timestamp !== undefined
    ) {
      const lat = rec.positionLat * SEMICIRCLE_TO_DEG;
      const lon = rec.positionLong * SEMICIRCLE_TO_DEG;
      if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;

      const timeMs =
        rec.timestamp instanceof Date
          ? rec.timestamp.getTime()
          : Number(rec.timestamp);
      if (!Number.isFinite(timeMs)) continue;

      const ele = rec.enhancedAltitude ?? rec.altitude;
      points.push({
        lat,
        lon,
        ele: ele !== undefined && Number.isFinite(ele) ? ele : undefined,
        timeMs,
        hr: rec.heartRate,
      });
    }
  }

  if (points.length >= 2) {
    const stats = computeStatsFromPoints(points, 'fit', fileName);
    const sportName = stripExtension(fileName) || 'Course Strava (FIT)';
    return {
      name: sportName,
      startedAtIso: new Date(points[0].timeMs).toISOString(),
      finishedAtIso: new Date(points[points.length - 1].timeMs).toISOString(),
      stats,
    };
  }

  // Fallback for indoor/treadmill FIT files without GPS coords
  const session = messages.sessionMesgs?.[0];
  if (session && session.totalDistance && session.totalTimerTime) {
    const distanceKm = Number((session.totalDistance / 1000).toFixed(2));
    const movingDurationSec = Math.max(1, Math.round(session.totalTimerTime));
    const elapsedDurationSec = Math.max(
      movingDurationSec,
      Math.round(session.totalElapsedTime ?? movingDurationSec)
    );
    const stoppedDurationSec = Math.max(0, elapsedDurationSec - movingDurationSec);
    const avgMovingSpeedKmh =
      distanceKm > 0 ? Number((distanceKm / (movingDurationSec / 3600)).toFixed(2)) : 0;
    const avgElapsedSpeedKmh =
      distanceKm > 0 ? Number((distanceKm / (elapsedDurationSec / 3600)).toFixed(2)) : 0;
    const avgMovingPaceSecPerKm =
      distanceKm > 0 ? Math.round(movingDurationSec / distanceKm) : 0;
    const avgElapsedPaceSecPerKm =
      distanceKm > 0 ? Math.round(elapsedDurationSec / distanceKm) : 0;

    const startTime =
      session.startTime instanceof Date
        ? session.startTime
        : new Date();
    const endTime = new Date(startTime.getTime() + elapsedDurationSec * 1000);

    return {
      name: stripExtension(fileName) || 'Course (FIT)',
      startedAtIso: startTime.toISOString(),
      finishedAtIso: endTime.toISOString(),
      stats: {
        sourceFormat: 'fit',
        sourceFileName: fileName,
        distanceKm,
        elapsedDurationSec,
        movingDurationSec,
        stoppedDurationSec,
        avgMovingSpeedKmh,
        avgElapsedSpeedKmh,
        avgMovingPaceSecPerKm,
        avgElapsedPaceSecPerKm,
        elevationGainM: session.totalAscent ? Math.round(session.totalAscent) : undefined,
        elevationLossM: session.totalDescent ? Math.round(session.totalDescent) : undefined,
        avgHeartRate: session.avgHeartRate,
        maxHeartRate: session.maxHeartRate,
        splits: [],
      },
    };
  }

  throw new Error(
    'Aucune trace GPS ou donnée de course exploitable trouvée dans ce fichier .fit.'
  );
}

export async function parseRunFile(file: File): Promise<ParsedRunResult> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.gpx')) {
    const text = await file.text();
    return parseGpxText(text, file.name);
  }
  if (lower.endsWith('.fit')) {
    const buffer = await file.arrayBuffer();
    return await parseFitBuffer(buffer, file.name);
  }
  throw new Error('Format non supporté. Choisis un fichier .gpx ou .fit.');
}
