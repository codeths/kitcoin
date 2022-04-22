/**
 * Round balance to 2 decimal places
 * @param balance The balance to check
 */
export function roundCurrency(balance: number): number {
	return Math.round(balance * 100) / 100;
}
