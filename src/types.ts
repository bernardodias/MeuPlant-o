import { Timestamp } from 'firebase/firestore';

export interface Location {
  id: string;
  name: string;
  color: string;
  userId: string;
}

export type ShiftStatus = 'pendente' | 'realizado' | 'pago';

export interface Shift {
  id: string;
  name: string;
  color: string;
  locationId?: string;
  value: number;
  paymentDate?: Timestamp;
  status: ShiftStatus;
  startAt: Timestamp;
  endAt: Timestamp;
  notes?: string;
  userId: string;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  color: string;
  value: number;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  userId: string;
}

export type ViewType = 'calendar' | 'financial' | 'templates' | 'stats' | 'settings' | 'recovery';
