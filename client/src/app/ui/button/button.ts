import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-button',
  templateUrl: './button.html',
  styleUrl: './button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgTemplateOutlet],
  host: 
  {
    '[style.display]': '"contents"'
  }
})
export class Button {
  // Inputs
  href = input<string>();
  variant = input<'primary' | 'secondary' | 'outline'>('outline');
  size = input<'small' | 'medium' | 'large'>('medium');
  disabled = input<boolean>(false);
  role = input<string>('button');
  
  // Computed classes
  buttonClasses = computed(() => {
    return `btn btn--${this.variant()} btn--${this.size()} ${this.disabled() ? 'btn--disabled' : ''}`.trim();
  });
}
