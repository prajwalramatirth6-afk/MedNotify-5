
export enum Frequency {
  DAILY = 'Daily',
  WEEKLY = 'Weekly',
  AS_NEEDED = 'As Needed'
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  time: string; // HH:mm format
  frequency: Frequency;
  durationDays: number;
  startDate: string;
  remainingDoses: number;
  refillThreshold: number;
  notes?: string;
  aiInsight?: string;
  expiryDate?: string; // ISO date string YYYY-MM-DD
}

export interface DoseLog {
  id: string;
  medicationId: string;
  timestamp: string;
  status: 'taken' | 'skipped' | 'missed';
}

export interface Pharmacy {
  name: string;
  address: string;
  uri: string;
  rating?: number;
  openNow?: boolean;
}

export interface Prescription {
  id: string;
  title: string;
  doctorName: string;
  date: string;
  image: string; // base64 encoded string
}
