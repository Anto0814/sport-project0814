export type Discipline = 'street_workout' | 'running';

export type ExerciseUnit = 'reps' | 'seconds';

export type StreetWorkoutCategory = 'push' | 'pull' | 'core' | 'legs' | 'skill' | 'full';
export type RunningCategory = 'endurance' | 'intervals' | 'tempo' | 'trail' | 'recovery';
export type ExerciseCategory = StreetWorkoutCategory | RunningCategory;

export interface Exercise {
  id: string;
  name: string;
  discipline: Discipline;
  unit: ExerciseUnit;
  category: ExerciseCategory;
  notes?: string;
  isCustom?: boolean;
}

export interface WorkoutSet {
  id: string;
  target: number;
  weightKg?: number;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  sets: WorkoutSet[];
  restBetweenSetsSec: number;
  restAfterExerciseSec: number;
  notes?: string;
}

export interface RunningConfig {
  runType: RunningCategory;
  targetDistanceKm?: number;
  targetDurationSec?: number;
  notes?: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  discipline: Discipline;
  description?: string;
  accent?: 'emerald' | 'cyan' | 'amber' | 'rose' | 'violet';
  exercises: WorkoutExercise[];
  runningConfig?: RunningConfig;
  createdAt: string;
  updatedAt: string;
}

export interface CompletedSetLog {
  setIndex: number;
  target: number;
  actual: number;
  weightKg?: number;
  completed: boolean;
}

export interface CompletedExerciseLog {
  exerciseId: string;
  exerciseName: string;
  unit: ExerciseUnit;
  sets: CompletedSetLog[];
}

export interface RunSplit {
  kmIndex: number;
  distanceKm: number;
  movingTimeSec: number;
  elapsedTimeSec: number;
  paceSecPerKm: number;
  speedKmh: number;
  elevationDeltaM: number;
}

export interface RunRoutePoint {
  lat: number;
  lon: number;
  ele?: number;
  distKm: number;
}

export interface RunStats {
  sourceFormat: 'manual' | 'gpx' | 'fit';
  sourceFileName?: string;
  distanceKm: number;
  elapsedDurationSec: number;
  movingDurationSec: number;
  stoppedDurationSec: number;
  avgMovingSpeedKmh: number;
  avgElapsedSpeedKmh: number;
  avgMovingPaceSecPerKm: number;
  avgElapsedPaceSecPerKm: number;
  maxSpeedKmh?: number;
  elevationGainM?: number;
  elevationLossM?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  splits: RunSplit[];
  routePreview?: RunRoutePoint[];
}

export interface WorkoutSessionLog {
  id: string;
  workoutId: string;
  workoutName: string;
  discipline: Discipline;
  startedAt: string;
  finishedAt: string;
  durationSec: number;
  totalSetsCompleted: number;
  exercises: CompletedExerciseLog[];
  runStats?: RunStats;
}

export type ProgramType = 'cycle' | 'weekly';

export interface ProgramSlot {
  id: string;
  label?: string;
  workout: WorkoutTemplate | null;
}

export interface WorkoutProgram {
  id: string;
  name: string;
  type: ProgramType;
  isActive: boolean;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  slots: ProgramSlot[];
  createdAt: string;
  updatedAt: string;
}

export interface PlannedWorkout {
  id: string;
  date: string; // YYYY-MM-DD
  sourceProgramId?: string;
  skipped?: boolean;
  workout?: WorkoutTemplate;
}

export interface UserProfile {
  id: string;
  username: string;
  username_normalized: string;
  role: 'user' | 'admin';
  created_at: string;
}

export type AppView =
  | 'workouts'
  | 'calendar'
  | 'editor'
  | 'exercises'
  | 'history'
  | 'settings'
  | 'admin';

export interface AppSettings {
  theme: 'dark' | 'light';
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface AppData {
  version: number;
  settings: AppSettings;
  exercises: Exercise[];
  workouts: WorkoutTemplate[];
  history: WorkoutSessionLog[];
  plannedWorkouts: PlannedWorkout[];
  programs: WorkoutProgram[];
}
