import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-notes-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notes-panel.component.html',
  styleUrl: './notes-panel.component.scss',
})
export class NotesPanelComponent implements OnInit {
  @Input({ required: true }) roomId!: number;

  content = '';
  saved = signal(false);
  private saveTimeout: any;

  get storageKey(): string {
    return `vsr_notes_room_${this.roomId}`;
  }

  ngOnInit(): void {
    this.content = localStorage.getItem(this.storageKey) ?? '';
  }

  onInput(): void {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this._save(), 800);
  }

  clearNotes(): void {
    this.content = '';
    localStorage.removeItem(this.storageKey);
  }

  private _save(): void {
    localStorage.setItem(this.storageKey, this.content);
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 1500);
  }
}
