
import { Milestone, MedicalRecord, Expense, Trip, Caregiver } from './types';

export const INITIAL_MILESTONES: Milestone[] = [];
export const INITIAL_HEALTH: MedicalRecord[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
export const INITIAL_TRIPS: Trip[] = [];

export const INITIAL_CAREGIVERS: Caregiver[] = [
  { id: 'c1', name: 'Parent 1 (Dad)', role: 'Parent', phone: '555-0101', email: 'parent1@familyflow.app', accessLevel: 'Full', lastActive: 'Just now', photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=parent1' },
  { id: 'c2', name: 'Parent 2 (Mom)', role: 'Parent', phone: '555-0102', email: 'parent2@familyflow.app', accessLevel: 'Full', lastActive: '1 hour ago', photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=parent2' },
  { 
    id: 'c3', 
    name: 'Child (Son)', 
    role: 'Child', 
    phone: '', 
    email: '', 
    accessLevel: 'ViewOnly', 
    lastActive: 'Today', 
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=child1',
    dateOfBirth: '2024-01-01' // Update this to the child's actual birth date
  },
];

export const VACCINE_INFO: Record<string, { protectsAgainst: string }> = {
  'BCG': { protectsAgainst: 'Tuberculosis (TB)' },
  'HepB_0': { protectsAgainst: 'Hepatitis B' },
  'DPT_HepB_Hib_1': { protectsAgainst: 'Diphtheria, Pertussis, Tetanus, Hep B, Hib' },
  'DPT_HepB_Hib_2': { protectsAgainst: 'Diphtheria, Pertussis, Tetanus, Hep B, Hib' },
  'DPT_HepB_Hib_3': { protectsAgainst: 'Diphtheria, Pertussis, Tetanus, Hep B, Hib' },
  'OPV_1': { protectsAgainst: 'Polio (Oral)' },
  'OPV_2': { protectsAgainst: 'Polio (Oral)' },
  'OPV_3': { protectsAgainst: 'Polio (Oral)' },
  'PCV_1': { protectsAgainst: 'Pneumococcal Disease (Pneumonia)' },
  'PCV_2': { protectsAgainst: 'Pneumococcal Disease (Pneumonia)' },
  'PCV_3': { protectsAgainst: 'Pneumococcal Disease (Pneumonia)' },
  'IPV': { protectsAgainst: 'Polio (Injected)' },
  'Rotavirus_1': { protectsAgainst: 'Severe Diarrhea (Rotavirus)' },
  'Rotavirus_2': { protectsAgainst: 'Severe Diarrhea (Rotavirus)' },
  'MR_1': { protectsAgainst: 'Measles & Rubella' },
  'MR_2': { protectsAgainst: 'Measles & Rubella' },
  'JE': { protectsAgainst: 'Japanese Encephalitis' },
  'VitaminA_1': { protectsAgainst: 'Vitamin A Deficiency' },
  'DPT_Booster': { protectsAgainst: 'Diphtheria, Pertussis, Tetanus' },
};

export const VACCINATION_SCHEDULE = [
  { ageMonths: 0, vaccines: ['BCG', 'HepB_0'] },
  { ageMonths: 2, vaccines: ['DPT_HepB_Hib_1', 'OPV_1', 'PCV_1', 'Rotavirus_1'] },
  { ageMonths: 4, vaccines: ['DPT_HepB_Hib_2', 'OPV_2', 'PCV_2', 'Rotavirus_2'] },
  { ageMonths: 6, vaccines: ['DPT_HepB_Hib_3', 'OPV_3', 'PCV_3', 'IPV'] },
  { ageMonths: 9, vaccines: ['MR_1', 'JE'] },
  { ageMonths: 12, vaccines: ['VitaminA_1'] },
  { ageMonths: 18, vaccines: ['MR_2', 'DPT_Booster'] },
];

export const STANDARD_MILESTONES = [
  { key: 'm_smile', category: 'Social', age: 2 },
  { key: 'm_headUp', category: 'Physical', age: 3 },
  { key: 'm_rollOver', category: 'Physical', age: 5 },
  { key: 'm_sit', category: 'Physical', age: 7 },
  { key: 'm_crawl', category: 'Physical', age: 9 },
  { key: 'm_wave', category: 'Social', age: 9 },
  { key: 'm_stand', category: 'Physical', age: 11 },
  { key: 'm_firstWord', category: 'Cognitive', age: 12 },
  { key: 'm_walk', category: 'Physical', age: 13 },
  { key: 'm_draw', category: 'Physical', age: 15 },
  { key: 'm_feedSelf', category: 'Physical', age: 15 },
  { key: 'm_run', category: 'Physical', age: 18 },
  { key: 'm_dance', category: 'Social', age: 18 },
  { key: 'm_climb', category: 'Physical', age: 20 },
  { key: 'm_sentences', category: 'Cognitive', age: 24 },
  { key: 'm_jump', category: 'Physical', age: 24 },
  { key: 'm_potty', category: 'Social', age: 30 },
  { key: 'm_dressSelf', category: 'Physical', age: 36 },
];

// Based on WHO Child Growth Standards (Boys Median)
export const WHO_GROWTH_STANDARDS = [
  { age: 0, height: 49.9, weight: 3.3, headCircumference: 34.5 },
  { age: 1, height: 54.7, weight: 4.5, headCircumference: 37.3 },
  { age: 2, height: 58.4, weight: 5.6, headCircumference: 39.1 },
  { age: 3, height: 61.4, weight: 6.4, headCircumference: 40.5 },
  { age: 4, height: 63.9, weight: 7.0, headCircumference: 41.6 },
  { age: 5, height: 65.9, weight: 7.5, headCircumference: 42.6 },
  { age: 6, height: 67.6, weight: 7.9, headCircumference: 43.3 },
  { age: 9, height: 72.0, weight: 8.9, headCircumference: 45.0 },
  { age: 12, height: 75.7, weight: 9.6, headCircumference: 46.1 },
  { age: 15, height: 79.1, weight: 10.3, headCircumference: 47.3 },
  { age: 18, height: 82.3, weight: 10.9, headCircumference: 48.2 },
  { age: 24, height: 87.8, weight: 12.2, headCircumference: 49.0 },
  { age: 30, height: 91.9, weight: 13.3, headCircumference: 49.6 },
  { age: 36, height: 96.1, weight: 14.3, headCircumference: 50.2 },
  { age: 48, height: 103.3, weight: 16.3, headCircumference: 50.8 },
  { age: 60, height: 110.0, weight: 18.3, headCircumference: 51.3 }
];
