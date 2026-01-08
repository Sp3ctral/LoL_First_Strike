import { Component } from '@angular/core';
import { Button } from '../../UI/button/button';
import { BlinkingIndicator } from '../../UI/blinking-indicator/blinking-indicator';

@Component({
  selector: 'app-header',
  imports: [Button, BlinkingIndicator],
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