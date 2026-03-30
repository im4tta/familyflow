
export enum Category {
  Dashboard = 'Dashboard',
  Development = 'Development',
  Health = 'Health',
  Finance = 'Finance',
  Planning = 'Planning',
  Caregivers = 'Caregivers',
  Analytics = 'Analytics',
  Assistant = 'Assistant',
  Settings = 'Settings',
  Calendar = 'Calendar'
}

export interface AppSettings {
  font: 'sans' | 'serif' | 'mono' | 'quicksand' | 'inter';
  density: 'comfortable' | 'compact';
  accentColor: 'indigo' | 'rose' | 'blue' | 'emerald' | 'violet' | 'orange' | 'cyan' | 'fuchsia' | 'lime' | 'christmas';
  glassIntensity: 'low' | 'medium' | 'high';
  cornerRadius: 'small' | 'medium' | 'large' | 'full';
  appStyle: 'minimal' | 'glass' | 'neumorphic';
  language: 'en' | 'km';
  monthlyBudget: number;
  liveBackground: 'none' | 'floating-lines' | 'pixel-snow' | 'dot-grid' | 'color-bends' | 'prism';
  loanStage?: number;
  loanFees?: string;
}

export interface User {
  username: string;
  role: 'Admin' | 'User';
  name: string;
  avatar?: string;
}

export interface Milestone {
  id: string;
  title: string;
  category: 'Physical' | 'Cognitive' | 'Social';
  ageMonth: number;
  completed: boolean;
  dateCompleted?: string;
  notes?: string;
  photoUrl?: string;
  linkedGrowthId?: string; 
}

export interface GrowthRecord {
  id: string;
  date: string;
  ageMonths: number;
  heightCm: number;
  weightKg: number;
  headCircumferenceCm: number; 
}

export interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  usage?: string;
  photoUrl?: string;
}

export interface MedicalRecord {
  id: string;
  type: 'Vaccine' | 'Visit' | 'Medication' | 'Allergy' | 'Illness' | 'Grooming';
  title: string;
  date: string;
  endDate?: string; 
  time?: string; 
  notes?: string;
  nextDueDate?: string;
  status: 'Scheduled' | 'Completed' | 'Overdue' | 'Active' | 'Recovered' | 'Recovering';
  doctorName?: string;
  memberId?: string; 
  medicineName?: string;
  medicineUsage?: string;
  medicinePhotoUrl?: string; 
  dosage?: string; 
  frequency?: string; 
  medications?: MedicationItem[];
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: 'Medical' | 'Toys' | 'Clothes' | 'Food' | 'Childcare' | 'Subscription' | 'Travel';
  date: string;
  isSubscription: boolean;
  frequency?: 'Weekly' | 'Monthly' | 'Yearly';
  renewalDate?: string;
  status?: 'Active' | 'Paused' | 'Canceled'; // Added status for lifecycle management
}

export interface Trip {
  id: string;
  title: string;
  location: string;
  startDate: string;
  startTime?: string; 
  endDate: string;
  endTime?: string; 
  status: 'Upcoming' | 'Completed' | 'Planning' | 'Idea';
  todos: { id: string; task: string; done: boolean; time?: string }[];
}

export interface Caregiver {
  id: string;
  name: string;
  role: 'Parent' | 'Grandparent' | 'Nanny' | 'Babysitter' | 'Child';
  phone: string;
  email: string;
  accessLevel: 'Full' | 'Limited' | 'ViewOnly';
  lastActive: string;
  photoUrl?: string;
  dateOfBirth?: string;
  bloodType?: string;
  allergies?: string;
  doctorName?: string; 
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface KhmerDate {
  dayOfWeek: string;
  lunarDay: string;
  monthName: string;
  zodiacYear: string;
  stem: string;
  buddhistEra: string;
  fullDate?: string;
  gregorianDateKh?: string;
  compactDate?: string; 
}