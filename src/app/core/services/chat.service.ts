import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ChatMessage } from '../models/chat-message.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private readonly api = 'http://localhost:8080/api/chat';

  constructor(
    private http: HttpClient
  ) {}

  getChatHistory(
    roomId: number
  ): Observable<ChatMessage[]> {

    console.log(
      'GET HISTORY URL:',
      `${this.api}/room/${roomId}`
    );

    return this.http.get<ChatMessage[]>(
      `${this.api}/room/${roomId}`
    );

  }

}