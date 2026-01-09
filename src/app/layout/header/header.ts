import { Component } from '@angular/core';
import { Button } from '../../ui/button/button';
import { BlinkingIndicator } from '../../ui/blinking-indicator/blinking-indicator';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { gameEnergyArrow } from '@ng-icons/game-icons';

@Component({
  selector: 'app-header',
  imports: [Button, BlinkingIndicator, NgIcon],
  viewProviders: [provideIcons({ gameEnergyArrow })],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header 
{
  // TODO: Fetch links from a static json maybe? future-proofing thoughts required...
  private readonly links = ["stream"];

  test()
  {
    console.log("TEST");
  }
}