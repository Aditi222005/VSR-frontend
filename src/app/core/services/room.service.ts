import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Room } from '../models/room.model';
import { JoinRoomResponse } from '../models/join-room-response.model';

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  private apiUrl = `${environment.apiUrl}/rooms`;

  private roomsSignal = signal<Room[]>([]);
  rooms = this.roomsSignal.asReadonly();

  private loadingSignal = signal(false);
  isLoading = this.loadingSignal.asReadonly();

  constructor(private http: HttpClient) {}

  loadRooms(): void {
    this.loadingSignal.set(true);

    this.http.get<Room[]>(`${this.apiUrl}/public-rooms`).subscribe({
      next: (rooms) => {
        this.roomsSignal.set(rooms || []);
        this.loadingSignal.set(false);
      },
      error: (err) => {
        console.warn('[RoomService] Backend loadRooms error:', err);
        this.roomsSignal.set([]);
        this.loadingSignal.set(false);
      }
    });
  }

  createRoom(roomData: Partial<Room>): Observable<Room> {
    return this.http.post<Room>(`${this.apiUrl}/create`, roomData).pipe(
      tap((newRoom) => {
        if (newRoom) {
          this.roomsSignal.update((current) => [newRoom, ...current]);
        } else {
          this.loadRooms();
        }
      })
    );
  }

  joinRoom(roomId: number): Observable<JoinRoomResponse> {
    return this.http.post<JoinRoomResponse>(
      `${this.apiUrl}/${roomId}/join`,
      {}
    );
  }

  leaveRoom(roomId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${roomId}/leave`,
      {}
    );
  }
}