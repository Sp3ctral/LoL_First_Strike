import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { ChampionDataService } from '@services/champion-data';

@Component({
  selector: 'app-calculator',
  imports: [],
  templateUrl: './calculator.html',
  styleUrl: './calculator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Calculator
{
  championService = inject(ChampionDataService);
  
  constructor()
  {
    effect(() => 
    {
      console.log(this.championService.state());
      console.log(this.championService.version);
    })
  }
  
}
