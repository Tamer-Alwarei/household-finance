import { addMonths, parseDate, todayStr } from '../utils/dateUtils.js';
import { roundMoney } from '../utils/format.js';
export const balanceOf = (list) => roundMoney(list.reduce((s, c) => s + c.amount, 0));
export function goalStats(goal) {
    const balance = balanceOf(goal.contributions);
    const remaining = roundMoney(Math.max(goal.target - balance, 0));
    const percent = goal.target > 0 ? Math.min(100, Math.round((balance / goal.target) * 100)) : 0;
    return { balance, remaining, percent };
}
export function monthsBetween(from, to) {
    const a = parseDate(from);
    const b = parseDate(to);
    return (b.y - a.y) * 12 + (b.m - a.m);
}
// Expected completion from the average of positive contributions per month seen so far.
export function expectedCompletion(goal) {
    const { balance, remaining } = goalStats(goal);
    if (remaining === 0)
        return todayStr();
    const deposits = goal.contributions.filter((c) => c.amount > 0);
    const rate = goal.monthlyTarget > 0 ? goal.monthlyTarget : deposits.length ? deposits.reduce((s, c) => s + c.amount, 0) / deposits.length : 0;
    if (rate <= 0 || balance < 0)
        return null;
    return addMonths(todayStr(), Math.ceil(remaining / rate));
}
// Required monthly reserve = what is still missing spread over the months left (at least one).
export function requiredMonthly(fund, today = todayStr()) {
    const { remaining } = goalStats(fund);
    const months = Math.max(1, monthsBetween(today, fund.expectedDate));
    return roundMoney(remaining / months);
}
export function behindSchedule(goal, today = todayStr()) {
    if (!goal.targetDate)
        return false;
    const total = Math.max(1, monthsBetween(goal.contributions[0]?.date ?? today, goal.targetDate));
    const elapsed = Math.max(0, monthsBetween(goal.contributions[0]?.date ?? today, today));
    return goalStats(goal).percent < Math.min(100, Math.round((elapsed / total) * 100)) - 10;
}
//# sourceMappingURL=savingsService.js.map