import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RemoteTrack, LocalTrack } from 'livekit-client';
import { ConnectionQualityLevel } from '../../../core/services/livekit.service';

@Component({
  selector: 'app-video-tile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-tile.component.html',
  styleUrl: './video-tile.component.scss',
})
export class VideoTileComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() videoTrack?: RemoteTrack | LocalTrack;
  @Input() participantName = '';
  @Input() isLocal = false;
  @Input() isCameraEnabled = false;
  @Input() isMicEnabled = false;
  @Input() isSpeaking = false;
  @Input() isHandRaised = false;
  @Input() isPinned = false;
  @Input() connectionQuality: ConnectionQualityLevel = 'unknown';

  @Output() togglePin = new EventEmitter<void>();

  onPinClick(event: MouseEvent): void {
    event.stopPropagation();
    this.togglePin.emit();
  }

  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;

  ngAfterViewInit(): void {
    this._attachTrack();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['videoTrack'] && this.videoEl) {
      const prev = changes['videoTrack'].previousValue as RemoteTrack | LocalTrack | undefined;
      if (prev) prev.detach();
      this._attachTrack();
    }
  }

  ngOnDestroy(): void {
    if (this.videoTrack) {
      this.videoTrack.detach();
    }
  }

  private _attachTrack(): void {
    if (this.videoTrack && this.videoEl?.nativeElement) {
      this.videoTrack.attach(this.videoEl.nativeElement);
    }
  }

  get initials(): string {
    const parts = (this.participantName || 'U').split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (this.participantName || 'U').substring(0, 2).toUpperCase();
  }

  get qualityBars(): number {
    switch (this.connectionQuality) {
      case 'excellent': return 3;
      case 'good':      return 2;
      case 'poor':      return 1;
      default:          return 0;
    }
  }
}
