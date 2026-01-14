import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-blinking-indicator',
  imports: [],
  templateUrl: './blinking-indicator.html',
  styleUrl: './blinking-indicator.scss',
  
  host: 
  { 
    '[class]': 'indicatorClasses()'
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlinkingIndicator 
{
  // Inputs
  size = input<'small' | 'medium' | 'large'>('medium');
  isLive = input<boolean>(false);


  // Computed classes
  indicatorClasses = computed(() => 
  {
    return `${this.isLive() ? "live" : "offline"} ${this.size()}`.trim();
  });
}
