export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

export type AppointmentModality = 'online';

export interface AvailabilityConfig {
  weeklyDays: number[];
  timeSlots: string[];
  weeklySchedule?: Record<string, string[]>;
  dateOverrides: Record<string, string[]>;
  sessionDuration: number;
  blockedDates: string[];
  modalities: AppointmentModality[];
  updatedAt?: unknown;
}

export interface PatientProfile {
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  birthDate: string;
  cityState: string;
  occupation: string;
  isMinor: boolean;
  guardianName?: string;
  guardianPhone?: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  reasonForTherapy: string;
  hadPreviousTherapy: boolean;
  previousTherapyDetails?: string;
  usesMedication: boolean;
  medicationDetails?: string;
  acceptedTerms: boolean;
  profileCompleted: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AppointmentRecord {
  id: string;
  date: string;
  timeSlot: string;
  modality: AppointmentModality;
  patientUid?: string;
  patientName: string;
  patientContact: string;
  notes?: string;
  meetingLink?: string;
  status: AppointmentStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
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

export interface PendingBookingDraft {
  date: string;
  timeSlot: string;
  patientName: string;
  patientPhone: string;
  holdToken: string;
  createdAtMs: number;
  expiresAtMs: number;
}

export interface SlotHoldRecord {
  id: string;
  date: string;
  timeSlot: string;
  holdToken: string;
  ownerUid: string;
  expiresAtMs: number;
}

export interface ClinicSettings {
  psychologistName: string;
  crp: string;
  instagramHandle: string;
  instagramUrl: string;
  whatsappNumber: string;
  contactEmail: string;
  heroHeadline: string;
  heroBio: string;
  trajectoryText: string;
  approachLabel: string;
  audienceLabel: string;
  modalityLabel: string;
  defaultMeetingLink: string;
  sessionFeeNote: string;
  updatedAt?: unknown;
}
