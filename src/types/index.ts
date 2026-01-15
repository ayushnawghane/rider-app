export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  kycStatus: 'pending' | 'approved' | 'rejected';
  kycDocumentUrl?: string;
  language: string;
  notificationPreferences: boolean;
  isBlocked: boolean;
  role: 'rider' | 'driver' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface Ride {
  id: string;
  userId: string;
  driverId?: string;
  date: string;
  startLocation: string;
  endLocation: string;
  startLocationCoords?: { lat: number; lng: number };
  endLocationCoords?: { lat: number; lng: number };
  vehicleType: string;
  vehicleNumber: string;
  referenceId: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  fare?: number;
  duration?: number;
  distance?: number;
  driverContact?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Dispute {
  id: string;
  userId: string;
  rideId?: string;
  disputeType: 'ride' | 'kyc' | 'other';
  description: string;
  status: 'open' | 'in_review' | 'resolved';
  assignedAgentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  disputeId?: string;
  userId: string;
  agentId?: string;
  content: string;
  isFromUser: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ride' | 'dispute' | 'system';
  read: boolean;
  createdAt: string;
}

export interface SosAlert {
  id: string;
  userId: string;
  rideId?: string;
  location: { lat: number; lng: number };
  status: 'active' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  expiresAt?: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface LoginParams {
  phone: string;
}

export interface VerifyOtpParams {
  phone: string;
  otp: string;
}

export interface RegisterParams {
  phone: string;
  fullName: string;
  email: string;
}

export interface KycUploadParams {
  file: File;
  userId: string;
}

export interface RideCreateParams {
  userId: string;
  date: string;
  startLocation: string;
  endLocation: string;
  startLocationCoords?: { lat: number; lng: number };
  endLocationCoords?: { lat: number; lng: number };
  vehicleType: string;
  vehicleNumber: string;
  referenceId: string;
}

export interface DisputeCreateParams {
  userId: string;
  rideId?: string;
  disputeType: 'ride' | 'kyc' | 'other';
  description: string;
}

export interface MessageCreateParams {
  disputeId: string;
  userId: string;
  content: string;
  isFromUser: boolean;
}

export interface SosCreateParams {
  userId: string;
  rideId?: string;
  location: { lat: number; lng: number };
}

export interface ProfileUpdateParams {
  fullName?: string;
  language?: string;
  notificationPreferences?: boolean;
}
