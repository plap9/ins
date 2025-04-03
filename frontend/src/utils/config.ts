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
  if (!key) {
    console.log("getS3Url: key rỗng");
    return '';
  }
  
  console.log("getS3Url đã nhận key:", key);

  if (key.startsWith('http://') || key.startsWith('https://')) {
    console.log("getS3Url: key đã là URL đầy đủ");
    return key;
  }
  
  if (key.startsWith('s3:')) {
    key = key.substring(3);
    console.log("getS3Url: đã bỏ prefix s3:");
  }
  
  const fullUrl = `https://${config.AWS.S3_BUCKET_NAME}.s3.${config.AWS.REGION}.amazonaws.com/${key}`;
  console.log("getS3Url: trả về URL đầy đủ:", fullUrl);
  return fullUrl;
};

export default config; 