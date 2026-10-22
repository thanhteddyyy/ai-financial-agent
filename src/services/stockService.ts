// src/services/stockService.ts

// 1. Định nghĩa cấu trúc dữ liệu trả về từ Finnhub
interface FinnhubQuoteResponse {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
}
interface FinnhubNews {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

class StockService {
  async getStockPrice(symbol: string) {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      throw new Error('FINNHUB_API_KEY is missing in .env');
    }

    const formattedSymbol = symbol.toUpperCase();
    const url = `https://finnhub.io/api/v1/quote?symbol=${formattedSymbol}&token=${apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.status}`);
      }

      // 2. Ép kiểu dữ liệu JSON về đúng interface đã định nghĩa
      const data = (await response.json()) as FinnhubQuoteResponse;

      if (data.c === 0 && data.pc === 0) {
        throw new Error(`Không tìm thấy mã cổ phiếu: ${formattedSymbol}`);
      }

      return {
        symbol: formattedSymbol,
        currentPrice: data.c,
        changeAmount: data.d,
        changePercent: data.dp,
        highDay: data.h,
        lowDay: data.l
      };
    } catch (error) {
      throw error;
    }
  }
  async getMarketNews(category: string = 'general') {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      throw new Error('FINNHUB_API_KEY is missing in .env');
    }

    // Các danh mục Finnhub hỗ trợ: general, forex, crypto, merger
    const url = `https://finnhub.io/api/v1/news?category=${category}&minId=10&token=${apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.status}`);
      }

      const data = (await response.json()) as FinnhubNews[];

      // Lấy 3 tin tức mới nhất (tránh lấy nhiều làm tràn token và tốn tiền LLM)
      const topNews = data.slice(0, 3).map(article => ({
        headline: article.headline,
        summary: article.summary,
        source: article.source,
        url: article.url
      }));

      return topNews;
    } catch (error) {
      throw error;
    }
  }

}

export default new StockService();