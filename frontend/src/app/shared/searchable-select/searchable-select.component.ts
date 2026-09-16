import {
  Component,
  ElementRef,
  HostListener,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true,
    },
  ],
  template: `
    <div class="searchable-select" [class.searchable-select--open]="open()">
      <input
        type="text"
        class="searchable-select__input"
        [attr.name]="name() || null"
        [attr.required]="required() ? true : null"
        [placeholder]="placeholder()"
        [disabled]="isDisabled()"
        [ngModel]="displayText()"
        (ngModelChange)="onInputChange($event)"
        (focus)="onFocus()"
        (keydown)="onKeydown($event)"
        autocomplete="off"
        role="combobox"
        [attr.aria-expanded]="open()"
        aria-autocomplete="list"
      />

      @if (open()) {
        <ul class="searchable-select__list" role="listbox">
          @if (allowEmpty() && emptyLabel()) {
            <li
              role="option"
              class="searchable-select__option searchable-select__option--empty"
              (mousedown)="selectOption('')"
            >
              {{ emptyLabel() }}
            </li>
          }
          @if (!filteredOptions().length) {
            <li class="searchable-select__empty">Nema rezultata</li>
          } @else {
            @for (option of filteredOptions(); track option.value) {
              <li
                role="option"
                class="searchable-select__option"
                [class.searchable-select__option--active]="option.value === value()"
                (mousedown)="selectOption(option.value)"
              >
                {{ option.label }}
              </li>
            }
          }
        </ul>
      }
    </div>
  `,
  styles: [
    `
      .searchable-select {
        position: relative;
      }

      .searchable-select__input {
        width: 100%;
      }

      .searchable-select__list {
        position: absolute;
        z-index: 20;
        top: calc(100% + 4px);
        left: 0;
        right: 0;
        max-height: 220px;
        overflow-y: auto;
        margin: 0;
        padding: 0.25rem 0;
        list-style: none;
        background: #fff;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
      }

      .searchable-select__option {
        padding: 0.55rem 0.75rem;
        cursor: pointer;
      }

      .searchable-select__option:hover,
      .searchable-select__option--active {
        background: #eff6ff;
      }

      .searchable-select__option--empty,
      .searchable-select__empty {
        color: #64748b;
      }

      .searchable-select__empty {
        padding: 0.55rem 0.75rem;
      }
    `,
  ],
})
export class SearchableSelectComponent implements ControlValueAccessor {
  private readonly host = inject(ElementRef<HTMLElement>);

  options = input.required<SearchableSelectOption[]>();
  placeholder = input('Pretraži i odaberi...');
  emptyLabel = input('');
  allowEmpty = input(false);
  required = input(false);
  name = input('');

  readonly open = signal(false);
  readonly value = signal('');
  readonly query = signal('');
  readonly isDisabled = signal(false);

  readonly filteredOptions = computed(() => {
    const normalized = this.query().trim().toLowerCase();
    const items = this.options();

    if (!normalized) {
      return items;
    }

    return items.filter((option) => option.label.toLowerCase().includes(normalized));
  });

  readonly displayText = computed(() =>
    this.open() ? this.query() : this.selectedLabel(),
  );

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  onFocus(): void {
    if (this.isDisabled()) {
      return;
    }

    this.open.set(true);
    this.query.set(this.selectedLabel());
  }

  onInputChange(text: string): void {
    this.query.set(text);
    this.open.set(true);

    if (!text.trim()) {
      this.value.set('');
      this.onChange('');
    }
  }

  selectOption(optionValue: string): void {
    this.value.set(optionValue);
    this.onChange(optionValue);
    this.onTouched();
    this.query.set('');
    this.open.set(false);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  close(): void {
    if (!this.open()) {
      return;
    }

    this.open.set(false);
    this.query.set('');
    this.onTouched();
  }

  selectedLabel(): string {
    return this.options().find((option) => option.value === this.value())?.label ?? '';
  }
}
