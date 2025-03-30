import { Request, Response, NextFunction } from 'express';
import * as giphyService from '../../../services/giphyService';
import { AppError } from '../../../middlewares/errorHandler'; 
import { ErrorCode } from '../../../types/errorCode';

export const handleSearchGifs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const query = req.query.q as string;
        if (!query || typeof query !== 'string' || query.trim() === '') {
            return next(new AppError('Thiếu hoặc không hợp lệ: query parameter "q"', 400, ErrorCode.VALIDATION_ERROR, 'q'));
        }

        const limit = parseInt(req.query.limit as string || '25', 10); 
        const offset = parseInt(req.query.offset as string || '0', 10);

        if (isNaN(limit) || limit <= 0 || limit > 100) { 
             return next(new AppError('Giá trị "limit" không hợp lệ (phải là số dương, <= 100)', 400, ErrorCode.VALIDATION_ERROR, 'limit'));
        }
         if (isNaN(offset) || offset < 0) {
             return next(new AppError('Giá trị "offset" không hợp lệ (phải là số >= 0)', 400, ErrorCode.VALIDATION_ERROR, 'offset'));
        }

        const results = await giphyService.searchGifs(query, limit, offset);

        res.status(200).json(results);

    } catch (error) {
        next(error);
    }
};

export const handleGetTrendingGifs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string || '25', 10);
        const offset = parseInt(req.query.offset as string || '0', 10);

        if (isNaN(limit) || limit <= 0 || limit > 100) {
             return next(new AppError('Giá trị "limit" không hợp lệ (phải là số dương, <= 100)', 400, ErrorCode.VALIDATION_ERROR, 'limit'));
        }
         if (isNaN(offset) || offset < 0) {
             return next(new AppError('Giá trị "offset" không hợp lệ (phải là số >= 0)', 400, ErrorCode.VALIDATION_ERROR, 'offset'));
        }

        const results = await giphyService.getTrendingGifs(limit, offset);

        res.status(200).json(results);

    } catch (error) {
        next(error);
    }
};

export const handleGetGifById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const gifId = req.params.id as string;

         if (!gifId || gifId.trim() === '') {
             return next(new AppError('Thiếu hoặc không hợp lệ: ID của GIF', 400, ErrorCode.VALIDATION_ERROR, 'id'));
         }

        const result = await giphyService.getGifById(gifId);

        res.status(200).json(result);

    } catch (error) {
        next(error);
    }
};