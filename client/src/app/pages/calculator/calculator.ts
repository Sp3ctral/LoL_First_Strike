import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { startWith } from 'rxjs';

interface Stats {
  attackDamage: number;
  abilityPower: number;
  armor: number;
  magicResist: number;
}

interface Champion {
  id: string;
  name: string;
  baseStats: Stats;
}

interface Item {
  id: string;
  name: string;
  stats: Partial<Stats>;
}

const CHAMPIONS: Champion[] = [
  {
    id: 'ahri',
    name: 'Ahri',
    baseStats: { attackDamage: 53, abilityPower: 0, armor: 21, magicResist: 30 },
  },
  {
    id: 'darius',
    name: 'Darius',
    baseStats: { attackDamage: 64, abilityPower: 0, armor: 39, magicResist: 32 },
  },
];

const ITEMS: Item[] = [
  { id: 'long-sword', name: 'Long Sword', stats: { attackDamage: 10 } },
  { id: 'amplifying-tome', name: 'Amplifying Tome', stats: { abilityPower: 20 } },
  { id: 'cloth-armor', name: 'Cloth Armor', stats: { armor: 15 } },
];

@Component({
  selector: 'app-calculator',
  imports: [ReactiveFormsModule],
  templateUrl: './calculator.html',
  styleUrl: './calculator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Calculator {
  private fb = inject(NonNullableFormBuilder);

  champions = signal(CHAMPIONS);
  items = signal(ITEMS);

  form = this.fb.group({
    championId: [''],
    itemIds: this.fb.array<string>([]),
    // Manual overrides
    attackDamage: [0],
    abilityPower: [0],
    armor: [0],
    magicResist: [0],
  });

  // Convert form value changes to signals
  private formValue = toSignal(this.form.valueChanges.pipe(startWith(this.form.value)), {
    initialValue: this.form.value,
  });

  selectedChampion = computed(() => {
    const id = this.formValue().championId;
    return this.champions().find((c) => c.id === id);
  });

  selectedItems = computed(() => {
    const ids = this.formValue().itemIds ?? [];
    return ids.map((id) => this.items().find((i) => i.id === id)).filter((i): i is Item => !!i);
  });

  // Total stats combining base + items + manual overrides
  totalStats = computed(() => {
    const champ = this.selectedChampion();
    const items = this.selectedItems();
    const val = this.formValue();

    const overrides = {
      attackDamage: val.attackDamage ?? 0,
      abilityPower: val.abilityPower ?? 0,
      armor: val.armor ?? 0,
      magicResist: val.magicResist ?? 0,
    };

    const base = champ?.baseStats ?? { attackDamage: 0, abilityPower: 0, armor: 0, magicResist: 0 };

    const itemBonus = items.reduce(
      (acc, item) => ({
        attackDamage: acc.attackDamage + (item.stats.attackDamage ?? 0),
        abilityPower: acc.abilityPower + (item.stats.abilityPower ?? 0),
        armor: acc.armor + (item.stats.armor ?? 0),
        magicResist: acc.magicResist + (item.stats.magicResist ?? 0),
      }),
      { attackDamage: 0, abilityPower: 0, armor: 0, magicResist: 0 },
    );

    return {
      attackDamage: base.attackDamage + itemBonus.attackDamage + overrides.attackDamage,
      abilityPower: base.abilityPower + itemBonus.abilityPower + overrides.abilityPower,
      armor: base.armor + itemBonus.armor + overrides.armor,
      magicResist: base.magicResist + itemBonus.magicResist + overrides.magicResist,
    };
  });

  addItem() {
    this.form.controls.itemIds.push(this.fb.control(''));
  }

  removeItem(index: number) {
    this.form.controls.itemIds.removeAt(index);
  }
}
