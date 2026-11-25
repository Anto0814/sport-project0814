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

  const width = 340;
  const height = 152;
  const pad = 18;

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

  const maxSpeedSplit = stats.splits.reduce(
    (max, s) => (s.speedKmh > max ? s.speedKmh : max),
    1
  );

  return (
    <div className="space-y-4">
      {/* Main KPI grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="surface-inset p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Route className="h-3.5 w-3.5 text-emerald-500" />
            Distance
          </div>
          <div className="font-display mt-1 text-xl font-bold tabular-nums">
            {stats.distanceKm.toFixed(2)}{' '}
            <span className="text-xs font-semibold text-slate-500">km</span>
          </div>
        </div>

        <div className="surface-inset p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Clock className="h-3.5 w-3.5 text-cyan-500" />
            En mouvement
          </div>
          <div className="font-display mt-1 text-xl font-bold tabular-nums">
            {formatDuration(stats.movingDurationSec)}
          </div>
          {stats.stoppedDurationSec > 0 && (
            <div className="text-[10px] font-medium text-slate-500">
              Total : {formatDuration(stats.elapsedDurationSec)}
            </div>
          )}
        </div>

        <div className="surface-inset p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Activity className="h-3.5 w-3.5 text-amber-500" />
            Allure moy.
          </div>
          <div className="font-display mt-1 text-xl font-bold tabular-nums text-cyan-600 dark:text-cyan-400">
            {formatPace(stats.avgMovingPaceSecPerKm).replace(' /km', '')}
            <span className="ml-1 text-[11px] font-semibold text-slate-500">/km</span>
          </div>
          {stats.stoppedDurationSec > 0 && (
            <div className="text-[10px] font-medium text-slate-500">
              Globale : {formatPace(stats.avgElapsedPaceSecPerKm)}
            </div>
          )}
        </div>

        <div className="surface-inset p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Gauge className="h-3.5 w-3.5 text-violet-500" />
            Vitesse moy.
          </div>
          <div className="font-display mt-1 text-xl font-bold tabular-nums">
            {stats.avgMovingSpeedKmh.toFixed(1)}{' '}
            <span className="text-xs font-semibold text-slate-500">km/h</span>
          </div>
          {stats.maxSpeedKmh ? (
            <div className="text-[10px] font-medium text-slate-500">
              Pointe : {formatSpeed(stats.maxSpeedKmh)}
            </div>
          ) : null}
        </div>
      </div>

      {/* Secondary telemetry badges */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 font-semibold text-amber-700 dark:text-amber-300">
          <PauseCircle className="h-3.5 w-3.5" />
          Temps d&apos;arrêt : <strong>{formatDuration(stats.stoppedDurationSec)}</strong>
        </span>

        {stats.elevationGainM !== undefined && (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
            <Mountain className="h-3.5 w-3.5" />
            D+ {stats.elevationGainM} m
            {stats.elevationLossM !== undefined ? ` / D- ${stats.elevationLossM} m` : ''}
          </span>
        )}

        {stats.avgHeartRate && (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 font-semibold text-rose-700 dark:text-rose-300">
            <Heart className="h-3.5 w-3.5" />
            FC moy. {stats.avgHeartRate} bpm
            {stats.maxHeartRate ? ` (max ${stats.maxHeartRate})` : ''}
          </span>
        )}
      </div>

      {/* GPS Tactical Map Preview */}
      {svgRoute && !compact && (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#06090f] p-4 text-slate-200 shadow-inner">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(148,163,184,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.16) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>Tracé GPS · {stats.sourceFormat.toUpperCase()}</span>
            <span className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                Départ
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_8px_#fb7185]" />
                Arrivée
              </span>
            </span>
          </div>
          <svg
            viewBox="0 0 340 152"
            className="relative h-40 w-full"
            role="img"
            aria-label="Tracé GPS de la course"
          >
            <defs>
              <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
              <filter id="routeGlow">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              d={svgRoute.pathD}
              fill="none"
              stroke="url(#routeGrad)"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#routeGlow)"
            />
            <circle cx={svgRoute.startX} cy={svgRoute.startY} r="5" fill="#10b981" />
            <circle cx={svgRoute.endX} cy={svgRoute.endY} r="5" fill="#f43f5e" />
          </svg>
        </div>
      )}

      {/* Kilometer Splits with Visual Pace Bars */}
      {stats.splits.length > 0 && !compact && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/[0.07]">
          <div className="flex items-center justify-between bg-slate-100/90 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:bg-white/[0.04] dark:text-slate-300">
            <span>Temps au kilomètre</span>
            <span className="text-[11px] opacity-75">
              {stats.splits.length} split{stats.splits.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] uppercase tracking-wider text-slate-500 dark:border-white/[0.06] dark:bg-[#070a0f]">
                <tr>
                  <th className="px-3.5 py-2 font-bold">Km</th>
                  <th className="px-3 py-2 font-bold">Allure</th>
                  <th className="hidden px-3 py-2 font-bold sm:table-cell">Rythme</th>
                  <th className="px-3 py-2 font-bold">Vitesse</th>
                  <th className="px-3.5 py-2 text-right font-bold">Déniv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {stats.splits.map((s) => {
                  const pct = Math.max(
                    18,
                    Math.min(100, Math.round((s.speedKmh / maxSpeedSplit) * 100))
                  );
                  return (
                    <tr
                      key={s.kmIndex}
                      className="transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                    >
                      <td className="px-3.5 py-2.5 font-bold tabular-nums">
                        {s.distanceKm === 1 ? `Km ${s.kmIndex}` : `${s.distanceKm} km`}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-cyan-600 tabular-nums dark:text-cyan-400">
                        {formatPace(s.paceSecPerKm)}
                      </td>
                      <td className="hidden w-36 px-3 py-2.5 sm:table-cell">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/[0.07]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-medium tabular-nums">
                        {formatSpeed(s.speedKmh)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-medium tabular-nums text-slate-500">
                        {s.elevationDeltaM > 0
                          ? `+${s.elevationDeltaM}m`
                          : `${s.elevationDeltaM}m`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
