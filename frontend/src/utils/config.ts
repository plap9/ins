export const config = {
  API_BASE_URL: 'http://192.168.1.31:5000',
  
  AWS: {
    REGION: 'ap-southeast-2',
    S3_BUCKET_NAME: 'clone-ins-s3',
  },
  
  DEFAULT_AVATAR: 'https://clone-ins-s3.s3.ap-southeast-2.amazonaws.com/profile/default-avatar.png',
  POSTS_PER_PAGE: 10,
  REFRESH_RATE: 60000, // ms
};

export const getS3Url = (key: string): string => {
  if (!key) return '';
  
  if (key.startsWith('http://') || key.startsWith('https://')) {
    return key;
  }
  
  if (key.startsWith('s3:')) {
    key = key.substring(3);
  }
  
  return `https://${config.AWS.S3_BUCKET_NAME}.s3.${config.AWS.REGION}.amazonaws.com/${key}`;
};

export default config; 