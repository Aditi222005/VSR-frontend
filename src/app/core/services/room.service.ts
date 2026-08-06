import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Room } from '../models/room.model';
import { JoinRoomResponse } from '../models/join-room-response.model';

@Injectable({
  providedIn: 'root'
})
export class RoomService {

  private apiUrl = `${environment.apiUrl}/rooms`;

  constructor(private http: HttpClient) { }

  private roomsSignal = signal<Room[]>([]);
  rooms = this.roomsSignal.asReadonly();

  private loadingSignal = signal(false);
  isLoading = this.loadingSignal.asReadonly();

  loadRooms(): void {

    this.loadingSignal.set(true);

    this.http
      .get<Room[]>(`${this.apiUrl}/public-rooms`)
      .subscribe({

        next: rooms => {

          this.roomsSignal.set(rooms);

          this.loadingSignal.set(false);

        },

        error: err => {

          console.error(err);

          this.loadingSignal.set(false);

        }

      });

  }

  joinRoom(roomId: number): Observable<JoinRoomResponse> {
    return this.http.post<JoinRoomResponse>(
      `${this.apiUrl}/${roomId}/join`,   // POST /api/rooms/{id}/join
      {}
    );
  }

  leaveRoom(roomId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${roomId}/leave`,  // POST /api/rooms/{id}/leave
      {}
    );
  }

}