import AsyncStorage from '@react-native-async-storage/async-storage';

export const config = {
  API_BASE_URL: 'http://192.168.1.31:5000',
  
  AWS: {
    REGION: 'ap-southeast-2',
    S3_BUCKET_NAME: 'clone-ins-s3',
  },
  
  DEFAULT_AVATAR: 'https://clone-ins-s3.s3.ap-southeast-2.amazonaws.com/profile/default-avatar.png',
  POSTS_PER_PAGE: 10,
  REFRESH_RATE: 60000,
};

export const getS3Url = (key: string): string => {
  if (!key) {
    return '';
  }
  

  if (key.startsWith('http://') || key.startsWith('https://')) {
    return key;
  }
  
  if (key.startsWith('s3:')) {
    key = key.substring(3);
  }
  
  const fullUrl = `https://${config.AWS.S3_BUCKET_NAME}.s3.${config.AWS.REGION}.amazonaws.com/${key}`;
  return fullUrl;
};

export const isS3Url = (url: string): boolean => {
  if (!url) return false;
  return url.includes(`${config.AWS.S3_BUCKET_NAME}.s3.${config.AWS.REGION}.amazonaws.com`) || 
         url.includes('amazonaws.com');
};

export const getKeyFromS3Url = (url: string): string => {
  if (!url) return '';
  
  try {
    if (url.includes('amazonaws.com/')) {
      return url.split('amazonaws.com/')[1];
    }
    return url;
  } catch (error) {
    console.error("Lỗi khi trích xuất key từ URL S3:", error);
    return url;
  }
};

export const getAlternativeS3Url = async (url: string): Promise<string> => {
  if (!url) return '';
  
  try {
    if (!isS3Url(url)) return url;
    
    const key = getKeyFromS3Url(url);
    let token = null;
    try {
      const authData = await AsyncStorage.getItem('@AuthData');
      if (authData) {
        const parsed = JSON.parse(authData);
        token = parsed.token;
      }
    } catch (e) {
      console.error('Lỗi khi lấy token từ AsyncStorage:', e);
    }
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(
      `${config.API_BASE_URL}/stories/presigned-url?key=${encodeURIComponent(key)}`,
      { 
        method: 'GET',
        headers 
      }
    );
    
    if (!response.ok) {
      console.error("Lỗi HTTP khi lấy presigned URL:", response.status, response.statusText);
      return url;
    }
    
    const data = await response.json();
    
    if (data.success && data.presignedUrl) {
      let cleanUrl = data.presignedUrl;
      
      if (cleanUrl.includes('&amp;')) {
        cleanUrl = cleanUrl.replace(/&amp;/g, '&');
      }
      
      if (cleanUrl.includes('%25')) {
        cleanUrl = cleanUrl.replace(/%25/g, '%');
      }
      
      return cleanUrl;
    } else {
      console.error("Không thể lấy presigned URL:", data.message || "Lỗi không xác định");
      return url;
    }
  } catch (error) {
    console.error("Lỗi khi lấy URL thay thế:", error);
    return url;
  }
};

export default config; 