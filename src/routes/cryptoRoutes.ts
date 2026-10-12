import { Router } from 'express';
import cryptoController from '../controllers/cryptoController';

const router = Router();

/**
 * GET /api/crypto/:id
 * Lấy giá của một cryptocurrency
 * Ví dụ: /api/crypto/bitcoin
 */
router.get('/:id', (req, res, next) => cryptoController.getCryptoPrice(req, res, next));

/**
 * GET /api/crypto
 * Lấy giá của nhiều cryptocurrency
 * Ví dụ: /api/crypto?ids=bitcoin,ethereum
 */
router.get('/', (req, res, next) => cryptoController.getMultipleCryptoPrices(req, res, next));

export default router;
