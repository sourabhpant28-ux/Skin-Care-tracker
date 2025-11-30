export type SkinType = 'Oily' | 'Dry' | 'Combination' | 'Normal' | 'Sensitive' | '';
export type RoutineTime = 'morning' | 'night' | 'both';

export interface Product {
  id: string;
  name: string;
  category: string;
}

export interface RoutineStep {
  id: string;
  productName: string;
  time: RoutineTime;
  completedToday: boolean;
}

export interface DailyLog {
  date: string; // ISO string YYYY-MM-DD
  completedMorning: boolean;
  completedNight: boolean;
  stepsCompleted: string[]; // IDs of steps completed
}

export interface PhotoEntry {
  id: string;
  date: string;
  imageUrl: string;
  notes: string;
}

export interface UserProfile {
  skinType: SkinType;
  skinGoals: string[];
  isPro: boolean;
  streak: number;
}

export interface AnalyticsData {
  last7DaysCompletion: number;
  monthlyCompletion: number;
  streak: number;
}