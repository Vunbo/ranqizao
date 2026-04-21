export type ShareResourceType = 'home' | 'device';

export interface ShareResourceTarget {
  type: ShareResourceType;
  id: string;
  currentMembers: string[];
}
