export interface User {
  uid: string;
  displayName: string;
  photoURL: string;
  bio: string;
  ageRange: '18-24' | '25-30' | '31-40' | '40+';
  interests: string[];
  activitiesJoined: string[];
  activitiesHosted: string[];
  rating: number;
  ratingCount: number;
  createdAt: string; // ISO 8601
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  category: 'Fitness' | 'Study' | 'Café' | 'Outdoors' | 'Gaming' | 'Social' | 'Food' | 'Other';
  location: { name: string; lat: number; lng: number };
  dateTime: string; // ISO 8601
  maxSlots: number;
  currentSlots: number;
  participants: string[];
  hostId: string;
  hostName: string;
  hostPhoto: string;
  coverImage?: string;
  requiresApproval: boolean;
  reactions: { fire: number; heart: number; like: number };
  status: 'active' | 'cancelled' | 'completed';
  createdAt: string; // ISO 8601
}

export interface Message {
  id: string;
  activityId: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  text?: string;
  location?: { lat: number; lng: number };
  type: 'text' | 'location' | 'system';
  isPinned: boolean;
  createdAt: string; // ISO 8601
}

export interface Notification {
  id: string;
  userId: string;
  type: 'join' | 'comment' | 'reminder' | 'approval' | 'chat' | 'update';
  title: string;
  body: string;
  activityId: string;
  read: boolean;
  createdAt: string; // ISO 8601
}
