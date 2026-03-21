export interface VehicleDetails {
  make?: string;
  model?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  color?: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  phone: string;
  kycStatus: 'pending' | 'approved' | 'rejected';
  kycDocumentUrl?: string;
  language: string;
  notificationPreferences: boolean;
  isBlocked: boolean;
  role: 'rider' | 'driver' | 'admin';
  // Gamification
  totalPoints: number;
  level: number;
  // Stats
  ratingAsDriver?: number;
  ratingAsPassenger?: number;
  ridesTaken: number;
  ridesPublished: number;
  // Optional
  referralCode?: string;
  vehicleDetails?: VehicleDetails;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  level: number;
  points: number;
  ridesTaken: number;
  ridesPublished: number;
  rating: number;
}

export interface PublishedRide {
  id: string;
  driverId: string;
  driver?: {
    id: string;
    name: string;
    avatar: string;
    rating: number;
    phone: string;
  };
  startLocation: string;
  endLocation: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  routePolyline?: string;
  distance: number;
  duration: number;
  departureTime: string;
  availableSeats: number;
  bookedSeats: number;
  pricePerSeat: number;
  vehicleType: string;
  vehicleNumber: string;
  status: 'active' | 'completed' | 'cancelled' | 'in_progress';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  rideId: string;
  ride?: PublishedRide;
  passengerId: string;
  passenger?: User;
  seatsBooked: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  bookingTime: string;
  pickupLocation?: string;
  dropLocation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reward {
  id: string;
  userId: string;
  points: number;
  action: 'publish_ride' | 'join_ride' | 'complete_ride' | 'weekly_streak' | 'referral' | 'five_star_rating';
  description: string;
  rideId?: string;
  createdAt: string;
}

export interface RideParticipant {
  id: string;
  rideId: string;
  userId: string;
  seatsBooked: number;
  status: 'joined' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface Achievement {
  id: string;
  userId: string;
  badgeId: string;
  badgeName: string;
  badgeIcon: string;
  badgeColor: string;
  description: string;
  earnedAt: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  criteria: string;
  pointsReward: number;
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
  // Carpool-specific
  availableSeats: number;
  bookedSeats: number;
  pricePerSeat: number;
  notes?: string;
  routePolyline?: string;
  // Computed / optional
  fare?: number;
  duration?: number;
  distance?: number;
  driverContact?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  rideId: string;
  passengerId: string;
  seatsBooked: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  pickupLocation?: string;
  dropLocation?: string;
  // Ratings
  driverRating?: number;
  driverReview?: string;
  passengerRating?: number;
  passengerReview?: string;
  // Timestamps
  confirmationTime?: string;
  completionTime?: string;
  cancellationTime?: string;
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
  availableSeats?: number;
  pricePerSeat?: number;
  notes?: string;
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
  email?: string;
  fullName?: string;
  language?: string;
  notificationPreferences?: boolean;
  vehicleDetails?: VehicleDetails;
}
