import type { Person, Sharing, Transaction } from '../models/types.js';
import { roundMoney } from '../utils/format.js';

// Returns an error message, or null when the transaction is valid.
export function validateTransaction(tx: Transaction, people: Person[]): string | null {
  if (!tx.title.trim()) return 'Title is required.';
  if (!(tx.amount > 0)) return 'Amount must be greater than 0.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) return 'Date is required.';
  if (!tx.categoryId) return 'Category is required.';
  return validateSharing(tx.sharing, tx.amount, people);
}

export function validateSharing(s: Sharing, amount: number, people: Person[]): string | null {
  const sum = people.reduce((a, p) => a + (s.values?.[p.id] ?? 0), 0);
  if (s.method === 'percentage' && roundMoney(sum) !== 100) return 'Percentages must total exactly 100.';
  if (s.method === 'fixed' && roundMoney(sum) !== roundMoney(amount)) return 'Fixed amounts must total the transaction amount.';
  if (s.method === 'individual' && !people.some((p) => s.values?.[p.id] === 100)) return 'Choose the responsible person.';
  return null;
}
