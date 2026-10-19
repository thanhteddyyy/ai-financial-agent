import axios from 'axios';
export interface CurrencyConversionResult{
    amount: number;
    from: string;
    to: string;
    rate: number;
    convertedAmount: number;
    lastUpdated: string;
}
export class CurrencyService {
  private baseUrl = 'https://open.er-api.com/v6/latest';
    /**
   * Quy đổi số tiền từ đơn vị tiền tệ này sang đơn vị tiền tệ khác
   * @param amount Số tiền cần đổi
   * @param from Mã tiền tệ gốc (ví dụ: USD, EUR)
   * @param to Mã tiền tệ đích (ví dụ: VND, JPY)
   */
  async convertCurrency(
    amount: number,
    from: string,
    to: string
  ): Promise<CurrencyConversionResult> {
    try {
      const sourceCurrency = from.toUpperCase().trim();
      const targetCurrency = to.toUpperCase().trim();

      const response = await axios.get(`${this.baseUrl}/${sourceCurrency}`);
      const rates = response.data.rates;

      if (!rates || !rates[targetCurrency]) {
        throw new Error(`Không tìm thấy tỷ giá cho đồng tiền ${targetCurrency}`);
      }

      const rate = rates[targetCurrency];
      const convertedAmount = amount * rate;

      return {
        amount,
        from: sourceCurrency,
        to: targetCurrency,
        rate,
        convertedAmount: Math.round(convertedAmount * 100) / 100,
        lastUpdated: response.data.time_last_update_utc,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Lỗi không xác định';
      throw new Error(`Lỗi khi quy đổi tiền tệ: ${msg}`);
    }
  }
}

export const currencyService = new CurrencyService();