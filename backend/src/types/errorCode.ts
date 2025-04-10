export enum ErrorCode {
    MISSING_CREDENTIALS = "AUTH_001",
    INVALID_CREDENTIALS = "AUTH_002",
    ACCOUNT_NOT_FOUND = "AUTH_003",
    INVALID_PASSWORD = "AUTH_004",
    UNVERIFIED_ACCOUNT = "AUTH_005",
    INVALID_TOKEN = "AUTH_006",
    TOKEN_EXPIRED = "AUTH_007",
    TOO_MANY_ATTEMPTS = "AUTH_008",
    MISSING_TOKEN = "AUTH_009",
    EXISTING_USER = "AUTH_010",
    INVALID_FORMAT = "AUTH_011",
    INVALID_OTP = "AUTH_012",
    INVALID_VERIFICATION = "AUTH_013",
    ACCOUNT_DEACTIVATED = "AUTH_014",
  
    DUPLICATE_ENTRY = "DB_001",
    REFERENCED_DATA_NOT_FOUND = "DB_002",
    DATA_IN_USE = "DB_003",
    DB_CONNECTION_ERROR = "DB_004",
  
    FILE_TOO_LARGE = "FILE_001",
    TOO_MANY_FILES = "FILE_002",
    UNSUPPORTED_FILE_TYPE = "FILE_003",
    FILE_DOWNLOAD_ERROR = "FILE_004",
    FILE_PROCESSING_ERROR = "FILE_005",
    FILE_MISSING = "FILE_006",
    UPLOAD_FAILED = "FILE_007", 
    CANCEL_FAILED = "FILE_008",
    CHUNK_INVALID = "FILE_009",
  
    VALIDATION_ERROR = "VAL_001",
  
    MEDIA_NOT_FOUND = "MEDIA_001",
    MEDIA_PROCESSING_ERROR = "MEDIA_002",
    UNSUPPORTED_MEDIA_TYPE = "MEDIA_003",
    MISSING_MEDIA_URL = "MEDIA_004",
    MEDIA_UPLOAD_ERROR = "MEDIA_005",
    MISSING_EDIT_DATA = "MEDIA_006",
    MEDIA_UNSUPPORTED_TYPE = "MEDIA_007",
  
    NOT_FOUND = "GEN_001",
    SERVER_ERROR = "GEN_002",
    RESOURCE_ACCESS_DENIED = "GEN_003",
    INVALID_OPERATION = "GEN_004",
    RATE_LIMIT_EXCEEDED = "GEN_005",
    INVALID_PERMISSIONS = "GEN_006",
  
    STORY_NOT_FOUND = "STORY_001",
    STORY_EXPIRED = "STORY_002",
    STORY_NO_MEDIA = "STORY_003",
    STORY_ACCESS_DENIED = "STORY_004",
    STORY_ALREADY_ADDED = "STORY_005",
    STORY_INVALID_CONTENT = "STORY_006",
    STORY_MEDIA_UNSUPPORTED = "STORY_007",
  
    USER_NOT_FOUND = "USER_001",
    USER_SETTINGS_NOT_FOUND = "USER_002",
    USER_NO_UPDATE_DATA = "USER_003",
    USER_PROFILE_ACCESS_DENIED = "USER_004",
    USER_SEARCH_INVALID = "USER_005",
    USER_NOT_AUTHENTICATED = "USER_006",
  }