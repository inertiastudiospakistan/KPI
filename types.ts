
export type Role = 'admin' | 'employee';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  password?: string; // Stored for initial/admin-set authentication
  createdAt: number;
  updatedAt: number;
}

export type ActivityType = 'farmer' | 'dealer';

export interface Activity {
  activityId: string;
  employeeId: string;
  employeeName: string;
  type: ActivityType;
  personName: string;
  address: string;
  phone: string;
  imageURLs: string[];
  gpsLat: number;
  gpsLng: number;
  accuracy: number;
  timestamp: number;
  approved: boolean | null; // null for pending, true for approved, false for rejected
  notes?: string;
}

export type TargetInterval = 'daily' | 'repeating';
export type RepeatInterval = 'weekly' | 'monthly' | 'none';

export interface Target {
  targetId: string;
  employeeId: string;
  activityType: ActivityType;
  targetCount: number;
  type: TargetInterval;
  startDate: string;
  endDate: string;
  repeatInterval: RepeatInterval;
  createdBy: string;
  createdAt: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}
