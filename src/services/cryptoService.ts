import axios from 'axios';
import { CoinGeckoPriceResponse, CryptoPriceData } from '../types/crypto';

class CryptoService {
  private readonly COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price';
  private readonly CURRENCIES = 'usd,eur,gbp';

  /**
   * Lấy giá crypto từ CoinGecko API
   * @param cryptoId - ID của crypto (ví dụ: bitcoin, ethereum)
   * @returns CryptoPriceData chứa giá tiền tệ đa dạng
   */
  async getCryptoPrice(cryptoId: string): Promise<CryptoPriceData> {
    try {
      const response = await axios.get<CoinGeckoPriceResponse>(this.COINGECKO_API_URL, {
        params: {
          ids: cryptoId.toLowerCase(),
          vs_currencies: this.CURRENCIES,
        },
      });

      const data = response.data[cryptoId.toLowerCase()];

      if (!data) {
        throw new Error(`Crypto ID "${cryptoId}" not found`);
      }

      return {
        id: cryptoId,
        usd: data.usd || 0,
        eur: data.eur || 0,
        gbp: data.gbp || 0,
        lastUpdated: new Date(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch crypto price: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Lấy giá của nhiều crypto cùng lúc
   * @param cryptoIds - Mảng ID của crypto
   * @returns Mảng CryptoPriceData
   */
  async getMultipleCryptoPrices(cryptoIds: string[]): Promise<CryptoPriceData[]> {
    const results: CryptoPriceData[] = [];

    for (const id of cryptoIds) {
      try {
        const priceData = await this.getCryptoPrice(id);
        results.push(priceData);
      } catch (error) {
        console.error(`Error fetching price for ${id}:`, error);
        // Continue fetching other cryptos even if one fails
      }
    }

    return results;
  }
}

export default new CryptoService();
