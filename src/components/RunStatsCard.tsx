import { Activity, Clock, Gauge, Heart, Mountain, PauseCircle, Route } from 'lucide-react';
import { RunRoutePoint, RunStats } from '../types/workout';
import { formatDuration, formatPace, formatSpeed } from '../utils/format';

interface RunStatsCardProps {
  stats: RunStats;
  compact?: boolean;
}

function buildSvgPath(points: RunRoutePoint[]): {
  pathD: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
} | null {
  if (points.length < 2) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  }

  const width = 320;
  const height = 140;
  const pad = 14;

  // Approximate cosine correction for longitude scaling at mid-latitude
  const midLatRad = (((minLat + maxLat) / 2) * Math.PI) / 180;
  const lonScale = Math.cos(midLatRad) || 1;

  const spanLon = Math.max(1e-6, (maxLon - minLon) * lonScale);
  const spanLat = Math.max(1e-6, maxLat - minLat);

  const scale = Math.min((width - pad * 2) / spanLon, (height - pad * 2) / spanLat);
  const drawnW = spanLon * scale;
  const drawnH = spanLat * scale;
  const offsetX = (width - drawnW) / 2;
  const offsetY = (height - drawnH) / 2;

  const coords = points.map((p) => {
    const x = offsetX + (p.lon - minLon) * lonScale * scale;
    const y = offsetY + (maxLat - p.lat) * scale;
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  const pathD = coords
    .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
    .join(' ');

  return {
    pathD,
    startX: coords[0].x,
    startY: coords[0].y,
    endX: coords[coords.length - 1].x,
    endY: coords[coords.length - 1].y,
  };
}

export function RunStatsCard({ stats, compact = false }: RunStatsCardProps) {
  const svgRoute =
    stats.routePreview && stats.routePreview.length >= 2
      ? buildSvgPath(stats.routePreview)
      : null;

  return (
    <div className="space-y-4">
      {/* Main KPI grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Route className="h-3.5 w-3.5 text-emerald-500" />
            Distance
          </div>
          <div className="mt-1 text-lg font-extrabold tabular-nums">
            {stats.distanceKm.toFixed(2)} km
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Clock className="h-3.5 w-3.5 text-cyan-500" />
            En mouvement
          </div>
          <div className="mt-1 text-lg font-extrabold tabular-nums">
            {formatDuration(stats.movingDurationSec)}
          </div>
          {stats.stoppedDurationSec > 0 && (
            <div className="text-[10px] text-slate-500">
              Total : {formatDuration(stats.elapsedDurationSec)}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Activity className="h-3.5 w-3.5 text-amber-500" />
            Allure moy.
          </div>
          <div className="mt-1 text-lg font-extrabold tabular-nums">
            {formatPace(stats.avgMovingPaceSecPerKm)}
          </div>
          {stats.stoppedDurationSec > 0 && (
            <div className="text-[10px] text-slate-500">
              Globale : {formatPace(stats.avgElapsedPaceSecPerKm)}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Gauge className="h-3.5 w-3.5 text-violet-500" />
            Vitesse moy.
          </div>
          <div className="mt-1 text-lg font-extrabold tabular-nums">
            {formatSpeed(stats.avgMovingSpeedKmh)}
          </div>
          {stats.maxSpeedKmh ? (
            <div className="text-[10px] text-slate-500">
              Pointe : {formatSpeed(stats.maxSpeedKmh)}
            </div>
          ) : null}
        </div>
      </div>

      {/* Secondary telemetry badges */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <PauseCircle className="h-3.5 w-3.5 text-amber-500" />
          Temps d&apos;arrêt : <strong>{formatDuration(stats.stoppedDurationSec)}</strong>
        </span>

        {stats.elevationGainM !== undefined && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Mountain className="h-3.5 w-3.5 text-emerald-500" />
            D+ {stats.elevationGainM} m
            {stats.elevationLossM !== undefined ? ` / D- ${stats.elevationLossM} m` : ''}
          </span>
        )}

        {stats.avgHeartRate && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-2.5 py-1 font-medium text-rose-700 dark:text-rose-300">
            <Heart className="h-3.5 w-3.5" />
            FC moy. {stats.avgHeartRate} bpm
            {stats.maxHeartRate ? ` (max ${stats.maxHeartRate})` : ''}
          </span>
        )}
      </div>

      {/* GPS SVG Route Preview */}
      {svgRoute && !compact && (
        <div className="rounded-xl border border-slate-200/80 bg-slate-950 p-3 text-slate-200 dark:border-slate-800">
          <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span>Tracé GPS ({stats.sourceFormat.toUpperCase()})</span>
            <span className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Départ
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-400" /> Arrivée
              </span>
            </span>
          </div>
          <svg
            viewBox="0 0 320 140"
            className="h-36 w-full"
            role="img"
            aria-label="Tracé GPS de la course"
          >
            <path
              d={svgRoute.pathD}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={svgRoute.startX} cy={svgRoute.startY} r="4.5" fill="#10b981" />
            <circle cx={svgRoute.endX} cy={svgRoute.endY} r="4.5" fill="#f43f5e" />
          </svg>
        </div>
      )}

      {/* Kilometer Splits */}
      {stats.splits.length > 0 && !compact && (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="bg-slate-100 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
            Temps au kilomètre ({stats.splits.length} split{stats.splits.length > 1 ? 's' : ''})
          </div>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                <tr>
                  <th className="px-3 py-2 font-semibold">Km</th>
                  <th className="px-3 py-2 font-semibold">Temps</th>
                  <th className="px-3 py-2 font-semibold">Allure</th>
                  <th className="px-3 py-2 font-semibold">Vitesse</th>
                  <th className="px-3 py-2 font-semibold text-right">Déniv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {stats.splits.map((s) => (
                  <tr key={s.kmIndex} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                    <td className="px-3 py-2 font-bold tabular-nums">
                      {s.distanceKm === 1 ? `Km ${s.kmIndex}` : `${s.distanceKm} km`}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatDuration(s.movingTimeSec)}
                    </td>
                    <td className="px-3 py-2 font-semibold text-cyan-600 tabular-nums dark:text-cyan-400">
                      {formatPace(s.paceSecPerKm)}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{formatSpeed(s.speedKmh)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                      {s.elevationDeltaM > 0 ? `+${s.elevationDeltaM}m` : `${s.elevationDeltaM}m`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
