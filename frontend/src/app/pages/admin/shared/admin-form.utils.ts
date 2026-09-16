import { FormGroup } from '@angular/forms';

export function showFieldError(form: FormGroup, field: string): boolean {
  const control = form.get(field);
  return !!(control && control.invalid && control.touched);
}

export function fieldErrorMessage(form: FormGroup, field: string): string {
  const control = form.get(field);
  if (!control?.errors) {
    return '';
  }

  if (control.errors['required']) {
    return 'Obavezno polje';
  }
  if (control.errors['email']) {
    return 'Neispravan email';
  }
  if (control.errors['minlength']) {
    return `Min. ${control.errors['minlength'].requiredLength} znakova`;
  }
  if (control.errors['min']) {
    return `Min. ${control.errors['min'].min}`;
  }

  return 'Neispravna vrijednost';
}

export function confirmDelete(label: string): boolean {
  return window.confirm(`Obrisati ${label}? Ova radnja se ne može poništiti.`);
}

export function filterByQuery<T>(
  items: T[],
  query: string,
  fields: (item: T) => Array<string | null | undefined>,
): T[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return items;
  }

  return items.filter((item) =>
    fields(item).some((value) => (value ?? '').toLowerCase().includes(normalized)),
  );
}
