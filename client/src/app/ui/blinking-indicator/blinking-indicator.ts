import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-blinking-indicator',
  imports: [],
  templateUrl: './blinking-indicator.html',
  styleUrl: './blinking-indicator.scss',
  
  host: 
  { 
    '[class]': 'indicatorClasses()',
    '(click)': 'navigate()'
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlinkingIndicator 
{
  // Inputs
  size = input<'small' | 'medium' | 'large'>('medium');
  isLive = input<boolean | undefined>(undefined);


  // Computed classes
  indicatorClasses = computed(() => 
  {
    return `${this.isLive() === undefined ? "loading" 
      : this.isLive() ? "live" : "offline"} ${this.size()}`.trim();
  });

  navigate() 
  {
    window.open(`https://twitch.tv/${environment.streamerUsername}`, "_blank");
  }
}


