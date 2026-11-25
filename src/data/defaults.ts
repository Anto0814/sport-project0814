import { AppData, Exercise, WorkoutTemplate } from '../types/workout';

export const DEFAULT_EXERCISES: Exercise[] = [
  { id: 'ex_pullups', name: 'Tractions pronation', discipline: 'street_workout', unit: 'reps', category: 'pull', notes: 'Prise largeur épaules, descente contrôlée' },
  { id: 'ex_chinups', name: 'Tractions supination', discipline: 'street_workout', unit: 'reps', category: 'pull', notes: 'Menton au-dessus de la barre' },
  { id: 'ex_aus_rows', name: 'Tractions australiennes', discipline: 'street_workout', unit: 'reps', category: 'pull', notes: 'Corps gainé, poitrine à la barre' },
  { id: 'ex_muscleup', name: 'Muscle-up', discipline: 'street_workout', unit: 'reps', category: 'skill', notes: 'Tirage explosif et transition propre' },
  { id: 'ex_dips', name: 'Dips aux barres parallèles', discipline: 'street_workout', unit: 'reps', category: 'push', notes: 'Coudes verrouillés en haut, 90° en bas' },
  { id: 'ex_pushups', name: 'Pompes classiques', discipline: 'street_workout', unit: 'reps', category: 'push' },
  { id: 'ex_decline_pushups', name: 'Pompes déclinées', discipline: 'street_workout', unit: 'reps', category: 'push', notes: 'Pieds surélevés sur un banc ou muret' },
  { id: 'ex_pike_pushups', name: 'Pike Push-ups', discipline: 'street_workout', unit: 'reps', category: 'push', notes: 'Focus épaules, tête en avant des mains' },
  { id: 'ex_diamond_pushups', name: 'Pompes diamants', discipline: 'street_workout', unit: 'reps', category: 'push' },
  { id: 'ex_lsit', name: 'L-Sit (équerre)', discipline: 'street_workout', unit: 'seconds', category: 'skill', notes: 'Jambes tendues, épaules abaissées' },
  { id: 'ex_tuck_fl', name: 'Tuck Front Lever', discipline: 'street_workout', unit: 'seconds', category: 'skill', notes: 'Bras tendus, omoplates serrées' },
  { id: 'ex_handstand', name: 'Handstand (équilibre mur)', discipline: 'street_workout', unit: 'seconds', category: 'skill' },
  { id: 'ex_leg_raises', name: 'Relevés de jambes à la barre', discipline: 'street_workout', unit: 'reps', category: 'core', notes: 'Sans élan, contrôle à la descente' },
  { id: 'ex_plank', name: 'Gainage planche', discipline: 'street_workout', unit: 'seconds', category: 'core' },
  { id: 'ex_hollow', name: 'Hollow Body Hold', discipline: 'street_workout', unit: 'seconds', category: 'core', notes: 'Bas du dos collé au sol' },
  { id: 'ex_pistol', name: 'Pistol Squats', discipline: 'street_workout', unit: 'reps', category: 'legs', notes: 'Répétitions totales (ou par jambe)' },
  { id: 'ex_jump_squats', name: 'Squats sautés', discipline: 'street_workout', unit: 'reps', category: 'legs' },
  { id: 'ex_burpees', name: 'Burpees', discipline: 'street_workout', unit: 'reps', category: 'full' },

  // Running exercises / session archetypes
  { id: 'ex_run_endurance', name: 'Footing Endurance (EF)', discipline: 'running', unit: 'seconds', category: 'endurance', notes: 'Allure confortable, aisance respiratoire' },
  { id: 'ex_run_intervals', name: 'Fractionné 30/30', discipline: 'running', unit: 'seconds', category: 'intervals', notes: '30s rapide / 30s trot léger après échauffement' },
  { id: 'ex_run_tempo', name: 'Sortie Seuil / Tempo', discipline: 'running', unit: 'seconds', category: 'tempo', notes: 'Allure soutenue mais contrôlée' },
  { id: 'ex_run_trail', name: 'Sortie Trail / Côtes', discipline: 'running', unit: 'seconds', category: 'trail', notes: 'Travail de dénivelé et appuis' },
  { id: 'ex_run_recovery', name: 'Footing Récupération', discipline: 'running', unit: 'seconds', category: 'recovery', notes: 'Allure très souple pour récupérer' },
];

const nowIso = new Date().toISOString();

export const DEFAULT_WORKOUTS: WorkoutTemplate[] = [
  {
    id: 'wk_push_street',
    name: 'Push & Dips Street',
    discipline: 'street_workout',
    description: 'Séance poussée haut du corps : force dips + pompes + gainage.',
    accent: 'amber',
    createdAt: nowIso,
    updatedAt: nowIso,
    exercises: [
      {
        id: 'wex_1',
        exerciseId: 'ex_dips',
        sets: [
          { id: 's1', target: 10 },
          { id: 's2', target: 10 },
          { id: 's3', target: 8 },
          { id: 's4', target: 8 },
        ],
        restBetweenSetsSec: 90,
        restAfterExerciseSec: 150,
        notes: 'Reste propre sur les 2 dernières séries',
      },
      {
        id: 'wex_2',
        exerciseId: 'ex_decline_pushups',
        sets: [
          { id: 's5', target: 12 },
          { id: 's6', target: 12 },
          { id: 's7', target: 12 },
        ],
        restBetweenSetsSec: 75,
        restAfterExerciseSec: 120,
      },
      {
        id: 'wex_3',
        exerciseId: 'ex_pike_pushups',
        sets: [
          { id: 's8', target: 8 },
          { id: 's9', target: 8 },
          { id: 's10', target: 8 },
        ],
        restBetweenSetsSec: 90,
        restAfterExerciseSec: 90,
      },
      {
        id: 'wex_4',
        exerciseId: 'ex_plank',
        sets: [
          { id: 's11', target: 45 },
          { id: 's12', target: 45 },
          { id: 's13', target: 45 },
        ],
        restBetweenSetsSec: 60,
        restAfterExerciseSec: 60,
      },
    ],
  },
  {
    id: 'wk_pull_skill',
    name: 'Pull & Figures Statiques',
    discipline: 'street_workout',
    description: 'Tirage, tractions en pyramide et maintien L-sit.',
    accent: 'cyan',
    createdAt: nowIso,
    updatedAt: nowIso,
    exercises: [
      {
        id: 'wex_5',
        exerciseId: 'ex_pullups',
        sets: [
          { id: 's14', target: 10 },
          { id: 's15', target: 8 },
          { id: 's16', target: 6 },
          { id: 's17', target: 6 },
        ],
        restBetweenSetsSec: 120,
        restAfterExerciseSec: 180,
      },
      {
        id: 'wex_6',
        exerciseId: 'ex_lsit',
        sets: [
          { id: 's18', target: 20 },
          { id: 's19', target: 20 },
          { id: 's20', target: 15 },
          { id: 's21', target: 15 },
        ],
        restBetweenSetsSec: 75,
        restAfterExerciseSec: 120,
      },
      {
        id: 'wex_7',
        exerciseId: 'ex_aus_rows',
        sets: [
          { id: 's22', target: 12 },
          { id: 's23', target: 12 },
          { id: 's24', target: 12 },
        ],
        restBetweenSetsSec: 60,
        restAfterExerciseSec: 90,
      },
      {
        id: 'wex_8',
        exerciseId: 'ex_leg_raises',
        sets: [
          { id: 's25', target: 10 },
          { id: 's26', target: 10 },
          { id: 's27', target: 10 },
        ],
        restBetweenSetsSec: 60,
        restAfterExerciseSec: 60,
      },
    ],
  },
  {
    id: 'wk_run_endurance',
    name: 'Footing Endurance 8 km',
    discipline: 'running',
    description: 'Sortie en endurance fondamentale à allure régulière.',
    accent: 'emerald',
    createdAt: nowIso,
    updatedAt: nowIso,
    exercises: [],
    runningConfig: {
      runType: 'endurance',
      targetDistanceKm: 8,
      targetDurationSec: 45 * 60,
      notes: 'Rester en aisance respiratoire tout du long.',
    },
  },
];

export const DEFAULT_APP_DATA: AppData = {
  version: 1,
  settings: {
    theme: 'dark',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  exercises: DEFAULT_EXERCISES,
  workouts: DEFAULT_WORKOUTS,
  history: [],
  plannedWorkouts: [],
  programs: [],
};
