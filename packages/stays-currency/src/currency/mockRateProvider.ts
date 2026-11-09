/**
 * Deterministic test/mock `RateProvider`, standing in for the real adapter (T05) until it is
 * unblocked by the T01 provider-verification gate (impl-plan.md current blocker). Never used in
 * place of the real provider in production.
 */
import { RateProvider, RateQuote } from "./rateConversion";

export class MockRateProvider implements RateProvider {
  constructor(private readonly rates: Record<string, number>, private readonly now: () => Date = () => new Date()) {}

  async fetchRate(base: string, target: string): Promise<RateQuote> {
    const key = `${base}_${target}`;
    const rate = this.rates[key];
    if (rate === undefined) {
      throw new Error(`No mock rate configured for ${key}`);
    }
    return { rate, asOf: this.now().toISOString() };
  }
}
