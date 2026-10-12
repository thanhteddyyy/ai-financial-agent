/**
 * Interface cho response từ CoinGecko API
 */
export interface CoinGeckoPriceResponse {
  [key: string]: {
    [currency: string]: number;
  };
}

/**
 * Interface cho dữ liệu giá crypto được xử lý
 */
export interface CryptoPriceData {
  id: string;
  usd: number;
  eur: number;
  gbp: number;
  lastUpdated: Date;
}

/**
 * Interface cho API response trả về client
 */
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  timestamp: string;
}
