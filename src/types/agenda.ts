export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export type AppointmentModality = 'online';

export interface AvailabilityConfig {
  weeklyDays: number[];
  timeSlots: string[];
  dateOverrides: Record<string, string[]>;
  sessionDuration: number;
  blockedDates: string[];
  modalities: AppointmentModality[];
  updatedAt?: unknown;
}

export interface AppointmentRecord {
  id: string;
  date: string;
  timeSlot: string;
  modality: AppointmentModality;
  patientName: string;
  patientContact: string;
  notes?: string;
  status: AppointmentStatus;
  createdAt?: unknown;
}

export interface GroupItem {
  id: string;
  title: string;
  scheduleText: string;
  platformLabel: string;
  description?: string;
  guidelines?: string[];
  active: boolean;
  isFallback?: boolean;
}
