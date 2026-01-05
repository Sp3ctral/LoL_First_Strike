import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header 
{
  private readonly tabs = ["stream"];

  test()
  {
    console.log("TEST");
  }
}