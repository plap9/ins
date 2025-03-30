import axios, { AxiosError } from "axios";
import { config } from "dotenv";
import { AppError } from "../middlewares/errorHandler";
import { ErrorCode } from "../types/errorCode";
import { getCachedData, cacheAnyData } from "../utils/cacheUtils";

config();

const GIPHY_API_KEY = process.env.GIPHY_API_KEY;
const GIPHY_BASE_URL = "https://api.giphy.com/v1/gifs";
const REDIS_URL = process.env.REDIS_URL;
const CACHE_TTL = 3600;

interface GiphyImageFormat {
  url: string;
}

interface GiphyImages {
  fixed_height: GiphyImageFormat;
  fixed_height_small: GiphyImageFormat;
  original: GiphyImageFormat;
}

interface GiphyGifObject {
  id: string;
  title: string;
  images: GiphyImages;
}

interface GiphyApiResponse<T> {
  data: T;
  pagination?: {
    total_count: number;
    count: number;
    offset: number;
  };
  meta?: {
    status: number;
    msg: string;
    response_id: string;
  };
}

interface FormattedGif {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  original?: string;
}

interface FormattedGiphyListResponse {
  gifs: FormattedGif[];
  pagination?: {
    total_count: number;
    count: number;
    offset: number;
  };
}

interface FormattedSingleGifResponse extends FormattedGif {}

const formatGiphyObject = (gif: GiphyGifObject): FormattedGif => ({
  id: gif.id,
  url: gif.images?.fixed_height?.url || gif.images?.original?.url || "",
  thumbnail:
    gif.images?.fixed_height_small?.url || gif.images?.fixed_height?.url || "",
  title: gif.title || "",
});

const formatSingleGiphyObject = (
  gif: GiphyGifObject
): FormattedSingleGifResponse => ({
  ...formatGiphyObject(gif),
  original: gif.images?.original?.url || "",
});

const handleGiphyAxiosError = (
  error: AxiosError<GiphyApiResponse<any>>,
  context: string,
  resourceId?: string
): AppError => {
  console.error(
    `Giphy API Error Context [${context}]${
      resourceId ? ` for ID ${resourceId}` : ""
    }:`,
    error.response?.status,
    error.response?.data || error.message
  );
  const errorMessage = error.response?.data?.meta?.msg || error.message;
  const statusCode = error.response?.status || 500;
  const errorCode =
    statusCode === 404 ? ErrorCode.NOT_FOUND : ErrorCode.SERVER_ERROR;

  return new AppError(
    `Lỗi khi ${context}${resourceId ? ` ${resourceId}` : ""}: ${errorMessage}`,
    statusCode,
    errorCode
  );
};

export const searchGifs = async (
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<FormattedGiphyListResponse> => {
  if (!GIPHY_API_KEY)
    throw new AppError(
      "Giphy API Key chưa được cấu hình",
      500,
      ErrorCode.SERVER_ERROR,
      "SERVER_ERROR"
    );
  if (!query || query.trim() === "")
    throw new AppError(
      "Từ khóa tìm kiếm không được để trống",
      400,
      ErrorCode.VALIDATION_ERROR,
      "query"
    );

    const cacheKey = `giphy:search:<span class="math-inline">\{query\.trim\(\)\}\:</span>{limit}:${offset}`;

  try {
    const cachedData = await getCachedData(cacheKey) as FormattedGiphyListResponse;
    if (cachedData) return cachedData;

    const response = await axios.get<any>(
      `${GIPHY_BASE_URL}/search`,
      {
        params: {
          api_key: GIPHY_API_KEY,
          q: query.trim(),
          limit,
          offset,
          rating: "g",
          lang: "vi",
        },
      }
    );

    const formattedData: FormattedGiphyListResponse = {
      gifs: response.data.data.map(formatGiphyObject),
      pagination: response.data.pagination,
    };

    await cacheAnyData(cacheKey, formattedData, CACHE_TTL);
    return formattedData;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw handleGiphyAxiosError(error, "tìm kiếm GIF");
    }
    console.error("Unknown Giphy Search Error:", error);
    throw new AppError(
      "Lỗi máy chủ nội bộ khi tìm kiếm GIF",
      500,
      ErrorCode.SERVER_ERROR
    );
  }
};

export const getTrendingGifs = async (
  limit: number = 20,
  offset: number = 0
): Promise<FormattedGiphyListResponse> => {
  if (!GIPHY_API_KEY)
    throw new AppError(
      "Giphy API Key chưa được cấu hình",
      500,
      ErrorCode.SERVER_ERROR,
      "SERVER_ERROR"
    );

    const cacheKey = `giphy:trending:<span class="math-inline">\{limit\}\:</span>{offset}`;

  try {
    const cachedData = await getCachedData(cacheKey) as FormattedGiphyListResponse;
    if (cachedData) return cachedData;

    const response = await axios.get<any>(
      `${GIPHY_BASE_URL}/trending`,
      {
        params: { api_key: GIPHY_API_KEY, limit, offset, rating: "g" },
      }
    );

    const formattedData: FormattedGiphyListResponse = {
      gifs: response.data.data.map(formatGiphyObject),
      pagination: response.data.pagination,
    };

    await cacheAnyData(cacheKey, formattedData, CACHE_TTL);
    return formattedData;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw handleGiphyAxiosError(error, "lấy GIF thịnh hành");
    }
    console.error("Unknown Giphy Trending Error:", error);
    throw new AppError(
      "Lỗi máy chủ nội bộ khi lấy GIF thịnh hành",
      500,
      ErrorCode.SERVER_ERROR
    );
  }
};

export const getGifById = async (
  gifId: string
): Promise<FormattedSingleGifResponse> => {
  if (!GIPHY_API_KEY)
    throw new AppError(
      "Giphy API Key chưa được cấu hình",
      500,
      ErrorCode.SERVER_ERROR,
      "SERVER_ERROR"
    );
  if (!gifId || gifId.trim() === "")
    throw new AppError(
      "ID GIF không được để trống",
      400,
      ErrorCode.VALIDATION_ERROR,
      "gifId"
    );

  const cleanGifId = gifId.trim();
  const cacheKey = `giphy:gif:${cleanGifId}`;

  try {
    const cachedData = await getCachedData(cacheKey) as FormattedSingleGifResponse;
    if (cachedData) return cachedData;

    const response = await axios.get<any>(
      `${GIPHY_BASE_URL}/${cleanGifId}`,
      {
        params: { api_key: GIPHY_API_KEY },
      }
    );

    if (!response.data.data || Object.keys(response.data.data).length === 0) {
      throw new AppError(
        `Không tìm thấy GIF với ID: ${cleanGifId}`,
        404,
        ErrorCode.NOT_FOUND
      );
    }

    const formattedData = formatSingleGiphyObject(response.data.data);

    await cacheAnyData(cacheKey, formattedData, CACHE_TTL);
    return formattedData;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (axios.isAxiosError(error)) {
      throw handleGiphyAxiosError(error, "lấy thông tin GIF", cleanGifId);
    }
    console.error(`Unknown Giphy Get By ID Error for ${cleanGifId}:`, error);
    throw new AppError(
      `Lỗi máy chủ nội bộ khi lấy thông tin GIF ${cleanGifId}`,
      500,
      ErrorCode.SERVER_ERROR
    );
  }
};
