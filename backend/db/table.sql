DROP TABLE IF EXISTS `chat_groups`;

CREATE TABLE
  `chat_groups` (
    `group_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `creator_id` bigint (20) NOT NULL,
    `group_name` varchar(255) DEFAULT NULL,
    `group_avatar` text DEFAULT NULL,
    `type` enum('private', 'group') NOT NULL DEFAULT 'group',
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`group_id`),
    KEY `creator_id` (`creator_id`),
    KEY `idx_chat_groups_type` (`type`),
    CONSTRAINT `chat_groups_ibfk_1` FOREIGN KEY (`creator_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `close_friends`;

CREATE TABLE
  `close_friends` (
    `id` bigint (20) NOT NULL AUTO_INCREMENT,
    `user_id` bigint (20) NOT NULL,
    `friend_id` bigint (20) NOT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_close_friends` (`user_id`, `friend_id`),
    KEY `idx_close_friends_user_id` (`user_id`),
    KEY `idx_close_friends_friend_id` (`friend_id`),
    CONSTRAINT `close_friends_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `close_friends_ibfk_2` FOREIGN KEY (`friend_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `comments`;

CREATE TABLE
  `comments` (
    `comment_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `post_id` bigint (20) NOT NULL,
    `user_id` bigint (20) NOT NULL,
    `parent_id` bigint (20) DEFAULT NULL,
    `path` varchar(255) DEFAULT '',
    `content` text DEFAULT NULL,
    `reply_count` int (11) NOT NULL DEFAULT 0 COMMENT 'Direct reply count',
    `total_reply_count` int (11) NOT NULL DEFAULT 0 COMMENT 'Total descendant reply count',
    `type` enum ('text', 'icon', 'gif') NOT NULL DEFAULT 'text',
    `gif_url` varchar(512) DEFAULT NULL,
    `icon_name` varchar(100) DEFAULT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `like_count` int (11) NOT NULL DEFAULT 0,
    PRIMARY KEY (`comment_id`),
    KEY `idx_comments_post_id` (`post_id`),
    KEY `idx_comments_user_id` (`user_id`),
    KEY `idx_comments_parent_id` (`parent_id`),
    KEY `idx_comments_path` (`path`),
    CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
    CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB AUTO_INCREMENT = 14 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `followers`;

CREATE TABLE
  `followers` (
    `id` bigint (20) NOT NULL AUTO_INCREMENT,
    `follower_id` bigint (20) NOT NULL,
    `following_id` bigint (20) NOT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_followers_follow` (`follower_id`, `following_id`),
    KEY `idx_followers_follower_id` (`follower_id`),
    KEY `idx_followers_following_id` (`following_id`),
    CONSTRAINT `followers_ibfk_1` FOREIGN KEY (`follower_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `followers_ibfk_2` FOREIGN KEY (`following_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `group_members`;

CREATE TABLE
  `group_members` (
    `member_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `group_id` bigint (20) NOT NULL,
    `user_id` bigint (20) NOT NULL,
    `role` enum ('member', 'admin') DEFAULT 'member',
    `joined_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`member_id`),
    UNIQUE KEY `uq_group_member` (`group_id`, `user_id`),
    KEY `user_id` (`user_id`),
    CONSTRAINT `group_members_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `chat_groups` (`group_id`) ON DELETE CASCADE,
    CONSTRAINT `group_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `highlight_stories`;

CREATE TABLE
  `highlight_stories` (
    `id` bigint (20) NOT NULL AUTO_INCREMENT,
    `highlight_id` bigint (20) NOT NULL,
    `story_id` bigint (20) NOT NULL,
    `added_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_highlight_story` (`highlight_id`, `story_id`),
    KEY `idx_highlight_stories_highlight_id` (`highlight_id`),
    KEY `idx_highlight_stories_story_id` (`story_id`),
    CONSTRAINT `highlight_stories_ibfk_1` FOREIGN KEY (`highlight_id`) REFERENCES `highlights` (`highlight_id`) ON DELETE CASCADE,
    CONSTRAINT `highlight_stories_ibfk_2` FOREIGN KEY (`story_id`) REFERENCES `stories` (`story_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `highlights`;

CREATE TABLE
  `highlights` (
    `highlight_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `user_id` bigint (20) NOT NULL,
    `title` varchar(100) NOT NULL,
    `cover_image_url` text DEFAULT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`highlight_id`),
    KEY `idx_highlights_user_id` (`user_id`),
    CONSTRAINT `highlights_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `likes`;

CREATE TABLE
  `likes` (
    `like_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `user_id` bigint (20) NOT NULL,
    `post_id` bigint (20) DEFAULT NULL,
    `comment_id` bigint (20) DEFAULT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`like_id`),
    UNIQUE KEY `uq_likes_user_post_comment` (`user_id`, `post_id`, `comment_id`),
    KEY `idx_likes_user_id` (`user_id`),
    KEY `idx_likes_post_id` (`post_id`),
    KEY `idx_likes_comment_id` (`comment_id`),
    CONSTRAINT `likes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `likes_ibfk_2` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
    CONSTRAINT `likes_ibfk_3` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`comment_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB AUTO_INCREMENT = 154 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `login_history`;

CREATE TABLE
  `login_history` (
    `login_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `user_id` bigint (20) NOT NULL,
    `ip_address` varchar(45) NOT NULL,
    `device_info` varchar(255) NOT NULL,
    `login_time` timestamp NOT NULL DEFAULT current_timestamp(),
    `status` enum ('success', 'failed') NOT NULL,
    `session_token` varchar(500) DEFAULT NULL,
    PRIMARY KEY (`login_id`),
    KEY `user_id` (`user_id`),
    KEY `idx_login_history_time` (`login_time`),
    CONSTRAINT `login_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `media`;

CREATE TABLE
  `media` (
    `media_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `media_url` text NOT NULL,
    `media_type` enum ('image', 'video', 'gif', 'audio') NOT NULL,
    `file_size` int (11) DEFAULT NULL,
    `duration` int (11) DEFAULT NULL,
    `thumbnail_url` text DEFAULT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `post_id` bigint (20) DEFAULT NULL,
    `story_id` bigint (20) DEFAULT NULL,
    `message_id` bigint (20) DEFAULT NULL,
    `reel_id` bigint (20) DEFAULT NULL,
    `content_type` enum ('post', 'story', 'message', 'reel') NOT NULL,
    PRIMARY KEY (`media_id`),
    KEY `idx_media_post_id` (`post_id`),
    KEY `idx_media_story_id` (`story_id`),
    KEY `idx_media_message_id` (`message_id`),
    KEY `idx_media_reel_id` (`reel_id`),
    KEY `idx_media_content_type` (`content_type`),
    CONSTRAINT `media_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
    CONSTRAINT `media_ibfk_2` FOREIGN KEY (`story_id`) REFERENCES `stories` (`story_id`) ON DELETE CASCADE,
    CONSTRAINT `media_ibfk_3` FOREIGN KEY (`message_id`) REFERENCES `messages` (`message_id`) ON DELETE CASCADE,
    CONSTRAINT `media_ibfk_4` FOREIGN KEY (`reel_id`) REFERENCES `reels` (`reel_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB AUTO_INCREMENT = 27 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `media_edits`;

CREATE TABLE
  `media_edits` (
    `edit_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `media_id` bigint (20) NOT NULL,
    `edit_type` enum ('text', 'filter', 'overlay', 'music', 'effect') NOT NULL,
    `edit_data` longtext CHARACTER
    SET
      utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid (`edit_data`)),
      `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
      PRIMARY KEY (`edit_id`),
      KEY `idx_media_edits_media_id` (`media_id`),
      CONSTRAINT `media_edits_ibfk_1` FOREIGN KEY (`media_id`) REFERENCES `media` (`media_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `mentions`;

CREATE TABLE
  `mentions` (
    `mention_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `user_id` bigint (20) NOT NULL,
    `mentioned_by` bigint (20) NOT NULL,
    `post_id` bigint (20) DEFAULT NULL,
    `comment_id` bigint (20) DEFAULT NULL,
    `story_id` bigint (20) DEFAULT NULL,
    `reel_id` bigint (20) DEFAULT NULL,
    `message_id` bigint (20) DEFAULT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`mention_id`),
    KEY `mentions_ibfk_1` (`user_id`),
    KEY `mentions_ibfk_2` (`mentioned_by`),
    KEY `mentions_ibfk_3` (`post_id`),
    KEY `mentions_ibfk_4` (`comment_id`),
    KEY `mentions_ibfk_5` (`story_id`),
    KEY `mentions_ibfk_6` (`reel_id`),
    KEY `mentions_ibfk_7` (`message_id`),
    CONSTRAINT `mentions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `mentions_ibfk_2` FOREIGN KEY (`mentioned_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `mentions_ibfk_3` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
    CONSTRAINT `mentions_ibfk_4` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`comment_id`) ON DELETE CASCADE,
    CONSTRAINT `mentions_ibfk_5` FOREIGN KEY (`story_id`) REFERENCES `stories` (`story_id`) ON DELETE CASCADE,
    CONSTRAINT `mentions_ibfk_6` FOREIGN KEY (`reel_id`) REFERENCES `reels` (`reel_id`) ON DELETE CASCADE,
    CONSTRAINT `mentions_ibfk_7` FOREIGN KEY (`message_id`) REFERENCES `messages` (`message_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `messages`;

CREATE TABLE
  `messages` (
    `message_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `sender_id` bigint (20) NOT NULL,
    `receiver_id` bigint (20) NOT NULL,
    `content` text DEFAULT NULL,
    `message_type` enum ('text', 'media', 'call') NOT NULL DEFAULT 'text',
    `is_read` tinyint (1) DEFAULT 0,
    `sent_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `call_status` enum (
      'none',
      'initiated',
      'accepted',
      'rejected',
      'ended',
      'missed'
    ) DEFAULT 'none',
    `call_type` enum ('audio', 'video') DEFAULT NULL,
    `call_duration` int (11) DEFAULT NULL,
    `call_started_at` timestamp NULL DEFAULT NULL,
    `group_id` bigint (20) DEFAULT NULL,
    `reply_to_id` bigint (20) DEFAULT NULL,
    `disappears_at` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`message_id`),
    KEY `messages_ibfk_3` (`group_id`),
    KEY `idx_messages_sender_id` (`sender_id`),
    KEY `idx_messages_receiver_id` (`receiver_id`),
    KEY `idx_messages_created_at` (`sent_at`),
    KEY `messages_ibfk_4` (`reply_to_id`),
    CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `messages_ibfk_3` FOREIGN KEY (`group_id`) REFERENCES `chat_groups` (`group_id`) ON DELETE CASCADE,
    CONSTRAINT `messages_ibfk_4` FOREIGN KEY (`reply_to_id`) REFERENCES `messages` (`message_id`) ON DELETE SET NULL
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `notifications`;

CREATE TABLE
  `notifications` (
    `notification_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `user_id` bigint (20) NOT NULL,
    `type` enum (
      'like',
      'comment',
      'follow',
      'mention',
      'message',
      'story_view',
      'story_reply',
      'call',
      'reel_comment',
      'reel_like',
      'reel_mention',
      'close_friend_add',
      'reel'
    ) NOT NULL,
    `message` text DEFAULT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `is_read` tinyint (1) DEFAULT 0,
    `related_id` bigint (20) DEFAULT NULL,
    `story_id` bigint (20) DEFAULT NULL,
    `post_id` bigint (20) DEFAULT NULL,
    `comment_id` bigint (20) DEFAULT NULL,
    `message_id` bigint (20) DEFAULT NULL,
    PRIMARY KEY (`notification_id`),
    KEY `notifications_ibfk_2` (`story_id`),
    KEY `notifications_ibfk_4` (`post_id`),
    KEY `notifications_ibfk_5` (`comment_id`),
    KEY `notifications_ibfk_6` (`message_id`),
    KEY `idx_notifications_user_id` (`user_id`),
    KEY `idx_notifications_type` (`type`),
    CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`story_id`) REFERENCES `stories` (`story_id`) ON DELETE CASCADE,
    CONSTRAINT `notifications_ibfk_4` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
    CONSTRAINT `notifications_ibfk_5` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`comment_id`) ON DELETE CASCADE,
    CONSTRAINT `notifications_ibfk_6` FOREIGN KEY (`message_id`) REFERENCES `messages` (`message_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `posts`;

CREATE TABLE
  `posts` (
    `post_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `user_id` bigint (20) NOT NULL,
    `content` text DEFAULT NULL,
    `location` varchar(255) DEFAULT NULL,
    `post_privacy` enum ('public', 'private', 'followers') DEFAULT 'public',
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    `like_count` int (11) DEFAULT 0,
    `comment_count` int (11) DEFAULT 0,
    PRIMARY KEY (`post_id`),
    KEY `idx_posts_user_id` (`user_id`),
    KEY `idx_posts_created_at` (`created_at`),
    CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB AUTO_INCREMENT = 19 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `reel_comments`;

CREATE TABLE
  `reel_comments` (
    `comment_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `reel_id` bigint (20) NOT NULL,
    `user_id` bigint (20) NOT NULL,
    `parent_id` bigint (20) DEFAULT NULL,
    `content` text NOT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`comment_id`),
    KEY `reel_comments_ibfk_3` (`parent_id`),
    KEY `idx_reel_comments_reel_id` (`reel_id`),
    KEY `idx_reel_comments_user_id` (`user_id`),
    CONSTRAINT `reel_comments_ibfk_1` FOREIGN KEY (`reel_id`) REFERENCES `reels` (`reel_id`) ON DELETE CASCADE,
    CONSTRAINT `reel_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `reel_comments_ibfk_3` FOREIGN KEY (`parent_id`) REFERENCES `reel_comments` (`comment_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `reel_likes`;

CREATE TABLE
  `reel_likes` (
    `like_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `reel_id` bigint (20) NOT NULL,
    `user_id` bigint (20) NOT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`like_id`),
    UNIQUE KEY `uq_reel_likes_user_reel` (`user_id`, `reel_id`),
    KEY `idx_reel_likes_reel_id` (`reel_id`),
    KEY `idx_reel_likes_user_id` (`user_id`),
    CONSTRAINT `reel_likes_ibfk_1` FOREIGN KEY (`reel_id`) REFERENCES `reels` (`reel_id`) ON DELETE CASCADE,
    CONSTRAINT `reel_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `reel_statistics`;

CREATE TABLE
  `reel_statistics` (
    `stat_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `reel_id` bigint (20) NOT NULL,
    `views` int (11) DEFAULT 0,
    `likes` int (11) DEFAULT 0,
    `comments` int (11) DEFAULT 0,
    `shares` int (11) DEFAULT 0,
    `engagement_rate` float DEFAULT 0,
    `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`stat_id`),
    UNIQUE KEY `uq_reel_statistics_reel_id` (`reel_id`),
    CONSTRAINT `reel_statistics_ibfk_1` FOREIGN KEY (`reel_id`) REFERENCES `reels` (`reel_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `reel_tags`;

CREATE TABLE
  `reel_tags` (
    `tag_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `reel_id` bigint (20) NOT NULL,
    `tag_text` varchar(100) NOT NULL,
    PRIMARY KEY (`tag_id`),
    KEY `idx_reel_tags_reel_id` (`reel_id`),
    KEY `idx_reel_tags_text` (`tag_text`),
    CONSTRAINT `reel_tags_ibfk_1` FOREIGN KEY (`reel_id`) REFERENCES `reels` (`reel_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `reels`;

CREATE TABLE
  `reels` (
    `reel_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `user_id` bigint (20) NOT NULL,
    `video_url` text NOT NULL,
    `thumbnail_url` text DEFAULT NULL,
    `caption` text DEFAULT NULL,
    `duration` int (11) NOT NULL,
    `audio_track` varchar(255) DEFAULT NULL,
    `views_count` int (11) DEFAULT 0,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`reel_id`),
    KEY `idx_reels_user_id` (`user_id`),
    KEY `idx_reels_created_at` (`created_at`),
    CONSTRAINT `reels_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `refresh_tokens`;

CREATE TABLE
  `refresh_tokens` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `user_id` bigint (20) NOT NULL,
    `token` varchar(500) NOT NULL,
    `expires_at` datetime NOT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `idx_refresh_tokens_user_id` (`user_id`),
    KEY `idx_refresh_tokens_token` (`token`),
    KEY `idx_refresh_tokens_expires_at` (`expires_at`),
    CONSTRAINT `refresh_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB AUTO_INCREMENT = 403 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `reports`;

CREATE TABLE
  `reports` (
    `report_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `reporter_id` bigint (20) NOT NULL,
    `reported_user_id` bigint (20) DEFAULT NULL,
    `post_id` bigint (20) DEFAULT NULL,
    `comment_id` bigint (20) DEFAULT NULL,
    `reason` text NOT NULL,
    `status` enum ('pending', 'resolved') DEFAULT 'pending',
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`report_id`),
    KEY `reporter_id` (`reporter_id`),
    KEY `reported_user_id` (`reported_user_id`),
    KEY `post_id` (`post_id`),
    KEY `comment_id` (`comment_id`),
    CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `reports_ibfk_2` FOREIGN KEY (`reported_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `reports_ibfk_3` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
    CONSTRAINT `reports_ibfk_4` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`comment_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `saved_posts`;

CREATE TABLE
  `saved_posts` (
    `saved_post_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `user_id` bigint (20) NOT NULL,
    `post_id` bigint (20) NOT NULL,
    `collection_name` varchar(100) DEFAULT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`saved_post_id`),
    KEY `idx_saved_posts_user_id` (`user_id`),
    KEY `idx_saved_posts_post_id` (`post_id`),
    CONSTRAINT `saved_posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `saved_posts_ibfk_2` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `search_history`;

CREATE TABLE
  `search_history` (
    `history_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `user_id` bigint (20) NOT NULL,
    `search_text` varchar(255) NOT NULL,
    `type` enum ('user', 'post', 'hashtag', 'location') NOT NULL DEFAULT 'user',
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`history_id`),
    KEY `idx_search_history_user_id` (`user_id`),
    CONSTRAINT `search_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB AUTO_INCREMENT = 45 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `stories`;

CREATE TABLE
  `stories` (
    `story_id` bigint (20) NOT NULL AUTO_INCREMENT,
    `user_id` bigint (20) NOT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `