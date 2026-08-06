export interface RoomEvent {
  eventType: string;
  roomId: number;
  userId: number;
  username: string;
  message: string;
  timestamp: string;
}
