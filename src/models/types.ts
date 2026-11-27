export type TransactionType = 'expense' | 'income' | 'savings' | 'transfer';
export type SharingMethod = 'equal' | 'percentage' | 'fixed' | 'individual';
export type PaymentStatus = 'planned' | 'unpaid' | 'paid' | 'overdue';
export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
export type RolloverRule = 'reset' | 'carry-unused' | 'carry-both';

export interface Person {
  id: string;
  name: string;
  sharePercent: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  monthlyBudget: number;
  archived: boolean;
  rollover?: RolloverRule;
  kind?: 'expense' | 'savings' | 'income';
}

export interface Sharing {
  method: SharingMethod;
  // percentage -> percents per person id, fixed -> amounts per person id, individual -> { [personId]: 100 }
  values?: Record<string, number>;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  date: string; // YYYY-MM-DD
  paidBy: string;
  sharing: Sharing;
  status: PaymentStatus;
  notes?: string;
  recurringBillId?: string; // link to the bill that produced this actual payment
  dueDate?: string;
}

export interface Settlement {
  id: string;
  date: string;
  from: string; // person who pays
  to: string; // person who receives
  amount: number;
  note?: string;
}

export interface RecurringBill {
  id: string;
  name: string;
  categoryId: string;
  frequency: Frequency;
  startDate: string;
  endDate?: string;
  active: boolean;
  paidBy: string;
  sharing: Sharing;
  notes?: string;
  // Price history; old entries are never rewritten, only appended.
  amountHistory: { from: string; amount: number }[];
}

export interface Contribution {
  id: string;
  date: string;
  amount: number; // negative = withdrawal
  note?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  targetDate?: string;
  owner: string; // 'shared' or person id
  monthlyTarget: number;
  description?: string;
  contributions: Contribution[];
}

export interface SinkingFund {
  id: string;
  name: string;
  target: number;
  expectedDate: string;
  owner: string;
  contributions: Contribution[];
}

export interface Debt {
  id: string;
  name: string;
  lender: string;
  original: number;
  balance: number;
  rate: number; // annual percent
  monthlyPayment: number;
  startDate: string;
  responsible: string;
  notes?: string;
}

export interface AppData {
  version: number;
  settings: {
    budgetModel: 'combined';
    currency: string;
    defaultSharing: { method: SharingMethod };
    warnPercent: number; // budget warning threshold
  };
  people: Person[];
  categories: Category[];
  transactions: Transaction[];
  recurringBills: RecurringBill[];
  settlements: Settlement[];
  savingsGoals: SavingsGoal[];
  sinkingFunds: SinkingFund[];
  debts: Debt[];
  monthlyOverrides: Record<string, Record<string, number>>; // month -> categoryId -> budget
  lastSaved: string | null;
  lastBackup: string | null;
  demo: boolean;
}
