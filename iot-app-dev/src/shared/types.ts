export interface FirebaseUser {
  userId: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
}

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  address?: string | null;
}

export interface OperationLog {
  id: string;
  stoveId: string;
  ownerId: string;
  event: string;
  type: 'info' | 'warning' | 'success';
  createdAt: string;
}

export type Tab = 'home' | 'safety' | 'profile';

export interface SensorData {
  gas: number;
  smoke: number;
  temp: number;
  flow: number;
  humanDetected: boolean;
  vibration: boolean;
}

export interface Device {
  id: string;
  name: string;
  ownerId: string;
  sharedWith?: string[];
  homeId?: string | null;
  location?: DeviceLocation | null;
  isOn: boolean;
  fireLevel: number;
  temp: number;
  gas: number;
  smoke: number;
  flow: number;
  humanDetected: boolean;
  vibration: boolean;
  createdAt?: string;
  updatedAt: string;
}

export interface Home {
  id: string;
  name: string;
  ownerId: string;
  members?: string[];
  deviceIds?: string[];
  createdAt: string;
}
