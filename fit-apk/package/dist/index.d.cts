type ExerciseType = 'weight_reps' | 'bodyweight_reps' | 'duration' | 'distance_duration' | 'assisted_bodyweight';
type ExerciseFrame = {
    index: 1 | 2 | 3;
    path: string;
    width: 512;
    height: 512;
    format: 'png';
    attribution: ExerciseAttribution;
};
type ExerciseAttribution = {
    creator: 'Bryl Lim';
    creatorUrl: 'https://bryllim.com';
    license: 'CC BY-SA 4.0';
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/';
    source?: {
        name: 'Everkinetic';
        url: string;
        license: 'CC BY-SA 4.0';
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/';
        changes: string;
    };
};
type Exercise = {
    id: string;
    slug: string;
    name: string;
    exerciseType: ExerciseType;
    equipment: string;
    primaryMuscle: string;
    secondaryMuscles: string[];
    isStretch: boolean;
    frames: [ExerciseFrame, ExerciseFrame, ExerciseFrame];
    attribution: ExerciseAttribution;
};
type ExerciseSearchFilters = {
    equipment?: string | readonly string[];
    primaryMuscle?: string | readonly string[];
    exerciseType?: ExerciseType | readonly ExerciseType[];
    isStretch?: boolean;
};
type AssetUrlOptions = {
    baseUrl?: string;
    version?: string;
};

declare const exercises: Exercise[];
declare function normalizeSearchText(value: string): string;
declare function getExercise(idOrSlug: string): Exercise | null;
declare function searchExercises(query?: string, filters?: ExerciseSearchFilters): Exercise[];
declare function getAssetUrl(idOrSlug: string, frameIndex: ExerciseFrame['index'], options?: AssetUrlOptions): string | null;

export { type AssetUrlOptions, type Exercise, type ExerciseAttribution, type ExerciseFrame, type ExerciseSearchFilters, type ExerciseType, exercises, getAssetUrl, getExercise, normalizeSearchText, searchExercises };
