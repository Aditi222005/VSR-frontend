export interface RoomEvent {
  type: string;
  roomId: number;
  userId: number;
  username: string;
  message: string;
  timestamp: string;
}