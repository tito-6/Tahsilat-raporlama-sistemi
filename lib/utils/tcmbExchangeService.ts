// TCMB Exchange Rate Service
// This service fetches and manages Turkish Central Bank exchange rates

interface ExchangeRate {
  currency: string;
  buying: number;  // Döviz Alış
  selling: number; // Döviz Satış (we use this one)
  date: string;
}

interface ExchangeRates {
  USD: ExchangeRate;
  EUR: ExchangeRate;
  lastUpdated: string;
}

// Default TCMB rates (should be updated with real API)
// These are approximate rates - in production should fetch from TCMB API
const DEFAULT_TCMB_RATES: ExchangeRates = {
  USD: {
    currency: 'USD',
    buying: 34.00,
    selling: 34.10,  // Döviz Satış rate
    date: '2025-09-21'
  },
  EUR: {
    currency: 'EUR',
    buying: 37.50,
    selling: 37.65,  // Döviz Satış rate  
    date: '2025-09-21'
  },
  lastUpdated: '2025-09-21'
};

export class TCMBExchangeService {
  private static rates: ExchangeRates = DEFAULT_TCMB_RATES;

  // Get current TCMB selling rate for a currency
  static getSellingRate(currency: string): number {
    switch (currency.toUpperCase()) {
      case 'USD':
        return this.rates.USD.selling;
      case 'EUR':
        return this.rates.EUR.selling;
      case 'TRY':
      case 'TL':
        return 1; // TL to TL is always 1
      default:
        console.warn(`Unknown currency: ${currency}, using USD rate`);
        return this.rates.USD.selling;
    }
  }

  // Convert amount between currencies using TCMB selling rates
  static convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) return amount;

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    // Convert to TL first, then to target currency
    let tlAmount: number;
    
    if (from === 'TL' || from === 'TRY') {
      tlAmount = amount;
    } else {
      // Foreign currency to TL: multiply by selling rate
      const rate = this.getSellingRate(from);
      tlAmount = amount * rate;
    }

    // Convert TL to target currency
    if (to === 'TL' || to === 'TRY') {
      return tlAmount;
    } else {
      // TL to foreign currency: divide by selling rate
      const rate = this.getSellingRate(to);
      return tlAmount / rate;
    }
  }

  // Update rates (for future TCMB API integration)
  static updateRates(newRates: ExchangeRates): void {
    this.rates = newRates;
  }

  // Get current rates
  static getCurrentRates(): ExchangeRates {
    return this.rates;
  }
}

export default TCMBExchangeService;