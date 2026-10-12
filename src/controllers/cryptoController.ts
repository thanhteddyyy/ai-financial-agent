import { Request, Response, NextFunction } from 'express';
import cryptoService from '../services/cryptoService';
import { ApiResponse, CryptoPriceData } from '../types/crypto';

class CryptoController {
  /**
   * GET /api/crypto/:id
   * Lấy giá của một cryptocurrency
   */
  async getCryptoPrice(req: Request, res: Response<ApiResponse<CryptoPriceData>>, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || id.trim() === '') {
        res.status(400).json({
          status: 'error',
          message: 'Crypto ID is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const priceData = await cryptoService.getCryptoPrice(id);
      console.log("Đã lấy dữ liệu thành công cho:", id);
      res.status(200).json({
        status: 'success',
        data: priceData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/crypto
   * Lấy giá của nhiều cryptocurrency (query params: ids=bitcoin,ethereum)
   */
  async getMultipleCryptoPrices(req: Request, res: Response<ApiResponse<CryptoPriceData[]>>, next: NextFunction): Promise<void> {
    try {
      const { ids } = req.query;

      if (!ids || typeof ids !== 'string') {
        res.status(400).json({
          status: 'error',
          message: 'Query parameter "ids" is required and must be a comma-separated string',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const cryptoIds = ids.split(',').map(id => id.trim()).filter(id => id !== '');

      if (cryptoIds.length === 0) {
        res.status(400).json({
          status: 'error',
          message: 'At least one crypto ID is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const priceData = await cryptoService.getMultipleCryptoPrices(cryptoIds);

      if (priceData.length === 0) {
        res.status(404).json({
          status: 'error',
          message: 'No crypto data found for the provided IDs',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: priceData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new CryptoController();
