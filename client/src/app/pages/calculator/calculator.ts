import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ChampionDataService, type ChampionOption } from '@services/champion-data';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { ionSearchOutline, ionClose } from '@ng-icons/ionicons';

@Component({
  selector: 'app-calculator',
  imports: [ReactiveFormsModule, NgIcon],
  templateUrl: './calculator.html',
  styleUrl: './calculator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ ionSearchOutline, ionClose })],
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class Calculator {
  private championData = inject(ChampionDataService);
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly form = new FormGroup({
    championId: new FormControl<string | null>(null),
    championQuery: new FormControl('', { nonNullable: true }),
  });

  readonly championIdControl = this.form.controls.championId;
  readonly championQueryControl = this.form.controls.championQuery;
  readonly isDropdownOpen = signal(false);

  readonly champions = this.championData.champions;
  readonly loading = this.championData.loading;
  readonly loadError = this.championData.error;

  private championQuery = toSignal(this.championQueryControl.valueChanges, {
    initialValue: this.championQueryControl.value,
  });

  private selectedChampionId = toSignal(this.championIdControl.valueChanges, {
    initialValue: this.championIdControl.value,
  });

  readonly selectedChampion = computed(() => {
    const championId = this.selectedChampionId();

    if (!championId) {
      return undefined;
    }

    return this.champions().find(champion => champion.id === championId);
  });

  readonly filteredChampions = computed(() => {
    const query = this.championQuery().trim().toLowerCase();
    const champions = this.champions();

    if (!query) {
      return champions;
    }

    return champions.filter(champion => champion.name.toLowerCase().startsWith(query));
  });

  constructor() {
    this.championData.loadChampions();
  }

  openDropdown(): void {
    this.isDropdownOpen.set(true);
  }

  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  onSearchInput(): void {
    const selectedChampion = this.selectedChampion();
    const currentQuery = this.championQueryControl.value;

    if (selectedChampion && selectedChampion.name !== currentQuery) {
      this.championIdControl.setValue(null);
    }

    this.openDropdown();
  }

  onSearchBlur(): void {
    this.closeDropdown();
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeDropdown();
      return;
    }

    if (event.key === 'ArrowDown') {
      this.openDropdown();
      return;
    }

    if (event.key === 'Enter' && this.isDropdownOpen()) {
      const firstChampion = this.filteredChampions()[0];
      if (firstChampion) {
        event.preventDefault();
        this.selectChampion(firstChampion);
      }
    }
  }

  onChampionOptionPointerDown(event: MouseEvent, champion: ChampionOption): void {
    event.preventDefault();
    this.selectChampion(champion);
  }

  clearSelectedChampion(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.championIdControl.setValue(null);
    this.championQueryControl.setValue('');
    this.openDropdown();

    queueMicrotask(() => {
      this.elementRef.nativeElement.querySelector<HTMLInputElement>('#champion-search')?.focus();
    });
  }

  onDocumentClick(event: MouseEvent): void {
    const clickedNode = event.target;
    if (!(clickedNode instanceof Element)) {
      return;
    }

    const clickedInsidePicker = !!clickedNode.closest('.champion-picker');
    if (!clickedInsidePicker) {
      this.closeDropdown();
    }
  }

  private selectChampion(champion: ChampionOption): void {
    this.championIdControl.setValue(champion.id);
    this.championQueryControl.setValue(champion.name);
    this.closeDropdown();
  }
}
