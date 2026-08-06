import { Participant } from './participant.model';

export interface RoomParticipantsEvent {
  roomId: number;
  participantCount: number;
  participants: Participant[];
}
