USE INS;

CREATE TABLE `users` (
    `user_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(255) DEFAULT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) DEFAULT NULL,
    `bio` TEXT DEFAULT NULL,
    `profile_pic` TEXT DEFAULT NULL,
    `phone_number` VARCHAR(15) DEFAULT NULL,
    `is_private` TINYINT(1) DEFAULT 0,
    `is_verified` TINYINT(1) DEFAULT 0,
    `website` VARCHAR(255) DEFAULT NULL,
    `gender` ENUM('male', 'female', 'other') DEFAULT NULL,
    `date_of_birth` DATE DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
    `last_login` TIMESTAMP NULL DEFAULT NULL,
    `status` ENUM('active', 'deactivated', 'banned') DEFAULT 'active',
    `verification_token` VARCHAR(255) DEFAULT NULL,
    `verification_expires` TIMESTAMP NULL DEFAULT NULL,
    `phone_verification_code` VARCHAR(6) DEFAULT NULL,
    `contact_type` ENUM('email', 'phone') NOT NULL,
    `phone_verification_expires` TIMESTAMP NULL DEFAULT NULL,
    `email_verified` TINYINT(1) DEFAULT 0,
    `phone_verified` TINYINT(1) DEFAULT 0,
    `allow_messages` BOOLEAN DEFAULT TRUE,
    `allow_tags` BOOLEAN DEFAULT TRUE,
    `allow_comments` BOOLEAN DEFAULT TRUE,
    `allow_follow_requests` BOOLEAN DEFAULT TRUE,
    `allow_like_notifications` BOOLEAN DEFAULT TRUE,
    `allow_comment_notifications` BOOLEAN DEFAULT TRUE,
    `allow_follow_notifications` BOOLEAN DEFAULT TRUE,
    `allow_mention_notifications` BOOLEAN DEFAULT TRUE,
    `allow_message_notifications` BOOLEAN DEFAULT TRUE,
    `allow_story_notifications` BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (`user_id`),
    UNIQUE KEY `uq_users_username` (`username`),
    UNIQUE KEY `uq_users_email` (`email`),
    UNIQUE KEY `uq_users_phone_number` (`phone_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX idx_users_phone_number ON users(phone_number);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);


CREATE TABLE `posts` (
    `post_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT(20) NOT NULL,
    `content` TEXT DEFAULT NULL,
    `location` VARCHAR(255) DEFAULT NULL,
    `privacy` ENUM('public', 'private', 'followers') DEFAULT 'public',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(), 
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
    `like_count` INT DEFAULT 0,
    `comment_count` INT DEFAULT 0,
    PRIMARY KEY (`post_id`),
    CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at); 


CREATE TABLE `media` (
    `media_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `post_id` BIGINT(20) NOT NULL,
    `media_url` TEXT NOT NULL,
    `media_type` ENUM('image', 'video') NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`media_id`),
    CONSTRAINT `media_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`photo_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX idx_media_post_id ON media(post_id);


CREATE TABLE `comments` (
    `comment_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `post_id` BIGINT(20) NOT NULL,
    `user_id` BIGINT(20) NOT NULL,
    `parent_id` BIGINT(20) DEFAULT NULL,
    `content` TEXT NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`comment_id`),
    CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`photo_id`) ON DELETE CASCADE,
    CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
     CONSTRAINT `comments_ibfk_3` FOREIGN KEY (`parent_id`) REFERENCES `comments` (`comment_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);



CREATE TABLE `likes` (
    `like_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT(20) NOT NULL,
    `post_id` BIGINT(20) DEFAULT NULL,
    `comment_id` BIGINT(20) DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`like_id`),
    CONSTRAINT `likes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `likes_ibfk_2` FOREIGN KEY (`post_id`) REFERENCES `posts` (`photo_id`) ON DELETE CASCADE,
     CONSTRAINT `likes_ibfk_3` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`comment_id`) ON DELETE CASCADE,
    UNIQUE KEY `uq_likes_user_post_comment` (`user_id`, `post_id`, `comment_id`)  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_comment_id ON likes(comment_id);


CREATE TABLE `saved_posts` (
    `saved_post_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT(20) NOT NULL,
    `post_id` BIGINT(20) NOT NULL,
    `collection_name` VARCHAR(100) DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`saved_post_id`),
    CONSTRAINT `saved_posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `saved_posts_ibfk_2` FOREIGN KEY (`post_id`) REFERENCES `posts` (`photo_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX idx_saved_posts_user_id ON saved_posts(user_id);
CREATE INDEX idx_saved_posts_post_id ON saved_posts(post_id);


CREATE TABLE `tags` (
    `tag_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `post_id` BIGINT(20) NOT NULL,
    `tag_text` VARCHAR(100) NOT NULL,
    PRIMARY KEY (`tag_id`),
    CONSTRAINT `tags_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`photo_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX idx_tags_post_id ON tags(post_id);
CREATE INDEX idx_tags_text ON tags(tag_text);


CREATE TABLE `stories` (
    `story_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT(20) NOT NULL,
    `media_url` TEXT NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    `expires_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 24 HOUR),
    `has_text` BOOLEAN DEFAULT FALSE,
    `sticker_data` TEXT,
    `filter_data` TEXT,
    `view_count` INT DEFAULT 0,
    `close_friends_only` BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (`story_id`),
    CONSTRAINT `stories_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_expires_at ON stories(expires_at);


CREATE TABLE `messages` (
    `message_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `sender_id` BIGINT(20) NOT NULL,
    `receiver_id` BIGINT(20) NOT NULL,
    `content` TEXT,
    `media_url` TEXT,
    `message_type` ENUM('text', 'image', 'video', 'gif', 'call') NOT NULL DEFAULT 'text',
    `is_read` BOOLEAN DEFAULT FALSE,
    `sent_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    `call_status` ENUM('none', 'initiated', 'accepted', 'rejected', 'ended', 'missed') DEFAULT 'none',
    `call_type` ENUM('audio', 'video') DEFAULT NULL,
    `call_duration` INT DEFAULT NULL,
    `call_started_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`message_id`),
    CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_created_at ON messages(sent_at);


CREATE TABLE `followers` (
    `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `follower_id` BIGINT(20) NOT NULL,
    `following_id` BIGINT(20) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`id`),
    CONSTRAINT `followers_ibfk_1` FOREIGN KEY (`follower_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `followers_ibfk_2` FOREIGN KEY (`following_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    UNIQUE KEY `uq_followers_follow` (`follower_id`, `following_id`)  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX idx_followers_follower_id ON followers(follower_id);
CREATE INDEX idx_followers_following_id ON followers(following_id);


CREATE TABLE `notifications` (
    `notification_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT(20) NOT NULL,
    `type` ENUM('like', 'comment', 'follow', 'mention', 'message', 'story_view', 'story_reply', 'call', 'reel_comment', 'reel_like', 'reel_mention', 'close_friend_add') NOT NULL,
    `message` TEXT,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    `is_read` BOOLEAN DEFAULT FALSE,
    `related_id` BIGINT(20) DEFAULT NULL,
    `story_id` BIGINT(20) DEFAULT NULL,
    `post_id` BIGINT(20) DEFAULT NULL,
    `comment_id` BIGINT(20) DEFAULT NULL,
    `message_id` BIGINT(20) DEFAULT NULL,
    PRIMARY KEY (`notification_id`),
    CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`story_id`) REFERENCES `stories` (`story_id`) ON DELETE CASCADE,
    CONSTRAINT `notifications_ibfk_4` FOREIGN KEY (`post_id`) REFERENCES `posts` (`photo_id`) ON DELETE CASCADE,
    CONSTRAINT `notifications_ibfk_5` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`comment_id`) ON DELETE CASCADE,
    CONSTRAINT `notifications_ibfk_6` FOREIGN KEY (`message_id`) REFERENCES `messages` (`message_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE TABLE `search_history` (
    `history_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT(20) NOT NULL,
    `search_text` VARCHAR(255) NOT NULL,
    `type` ENUM('user', 'post', 'hashtag', 'location') NOT NULL DEFAULT 'user',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`history_id`),
    CONSTRAINT `search_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX idx_search_history_user_id ON search_history(user_id);

CREATE TABLE `refresh_tokens` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT(20) NOT NULL,
    `token` VARCHAR(500) NOT NULL,
    `expires_at` DATETIME NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`id`),
    CONSTRAINT `refresh_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

CREATE TABLE `reels` (
    `reel_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT(20) NOT NULL,
    `video_url` TEXT NOT NULL,
    `thumbnail_url` TEXT DEFAULT NULL,
    `caption` TEXT DEFAULT NULL,
    `duration` INT NOT NULL, 
    `audio_track` VARCHAR(255) DEFAULT NULL,
    `views_count` INT DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
    PRIMARY KEY (`reel_id`),
    CONSTRAINT `reels_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX idx_reels_user_id ON reels(user_id);
CREATE INDEX idx_reels_created_at ON reels(created_at);

CREATE TABLE `reel_tags` (
    `tag_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `reel_id` BIGINT(20) NOT NULL,
    `tag_text` VARCHAR(100) NOT NULL,
    PRIMARY KEY (`tag_id`),
    CONSTRAINT `reel_tags_ibfk_1` FOREIGN KEY (`reel_id`) REFERENCES `reels` (`reel_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX idx_reel_tags_reel_id ON reel_tags(reel_id);
CREATE INDEX idx_reel_tags_text ON reel_tags(tag_text);

CREATE TABLE `reel_likes` (
    `like_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `reel_id` BIGINT(20) NOT NULL,
    `user_id` BIGINT(20) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`like_id`),
    CONSTRAINT `reel_likes_ibfk_1` FOREIGN KEY (`reel_id`) REFERENCES `reels` (`reel_id`) ON DELETE CASCADE,
    CONSTRAINT `reel_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    UNIQUE KEY `uq_reel_likes_user_reel` (`user_id`, `reel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX idx_reel_likes_reel_id ON reel_likes(reel_id);
CREATE INDEX idx_reel_likes_user_id ON reel_likes(user_id);

CREATE TABLE `reel_comments` (
    `comment_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `reel_id` BIGINT(20) NOT NULL,
    `user_id` BIGINT(20) NOT NULL,
    `parent_id` BIGINT(20) DEFAULT NULL,
    `content` TEXT NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`comment_id`),
    CONSTRAINT `reel_comments_ibfk_1` FOREIGN KEY (`reel_id`) REFERENCES `reels` (`reel_id`) ON DELETE CASCADE,
    CONSTRAINT `reel_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `reel_comments_ibfk_3` FOREIGN KEY (`parent_id`) REFERENCES `reel_comments` (`comment_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX idx_reel_comments_reel_id ON reel_comments(reel_id);
CREATE INDEX idx_reel_comments_user_id ON reel_comments(user_id);

CREATE TABLE `highlights` (
    `highlight_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT(20) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `cover_image_url` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
    PRIMARY KEY (`highlight_id`),
    CONSTRAINT `highlights_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX idx_highlights_user_id ON highlights(user_id);

CREATE TABLE `highlight_stories` (
    `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `highlight_id` BIGINT(20) NOT NULL,
    `story_id` BIGINT(20) NOT NULL,
    `added_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`id`),
    CONSTRAINT `highlight_stories_ibfk_1` FOREIGN KEY (`highlight_id`) REFERENCES `highlights` (`highlight_id`) ON DELETE CASCADE,
    CONSTRAINT `highlight_stories_ibfk_2` FOREIGN KEY (`story_id`) REFERENCES `stories` (`story_id`) ON DELETE CASCADE,
    UNIQUE KEY `uq_highlight_story` (`highlight_id`, `story_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX idx_highlight_stories_highlight_id ON highlight_stories(highlight_id);
CREATE INDEX idx_highlight_stories_story_id ON highlight_stories(story_id);

CREATE TABLE `close_friends` (
    `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT(20) NOT NULL,
    `friend_id` BIGINT(20) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`id`),
    CONSTRAINT `close_friends_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `close_friends_ibfk_2` FOREIGN KEY (`friend_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    UNIQUE KEY `uq_close_friends` (`user_id`, `friend_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX idx_close_friends_user_id ON close_friends(user_id);
CREATE INDEX idx_close_friends_friend_id ON close_friends(friend_id);

CREATE TABLE `mentions` (
    `mention_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT(20) NOT NULL, 
    `mentioned_by` BIGINT(20) NOT NULL, 
    `post_id` BIGINT(20) DEFAULT NULL,
    `comment_id` BIGINT(20) DEFAULT NULL,
    `story_id` BIGINT(20) DEFAULT NULL,
    `reel_id` BIGINT(20) DEFAULT NULL,
    `message_id` BIGINT(20) DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`mention_id`),
    CONSTRAINT `mentions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `mentions_ibfk_2` FOREIGN KEY (`mentioned_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `mentions_ibfk_3` FOREIGN KEY (`post_id`) REFERENCES `posts` (`photo_id`) ON DELETE CASCADE,
    CONSTRAINT `mentions_ibfk_4` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`comment_id`) ON DELETE CASCADE,
    CONSTRAINT `mentions_ibfk_5` FOREIGN KEY (`story_id`) REFERENCES `stories` (`story_id`) ON DELETE CASCADE,
    CONSTRAINT `mentions_ibfk_6` FOREIGN KEY (`reel_id`) REFERENCES `reels` (`reel_id`) ON DELETE CASCADE,
    CONSTRAINT `mentions_ibfk_7` FOREIGN KEY (`message_id`) REFERENCES `messages` (`message_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `reel_statistics` (
    `stat_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `reel_id` BIGINT(20) NOT NULL,
    `views` INT DEFAULT 0,
    `likes` INT DEFAULT 0,
    `comments` INT DEFAULT 0,
    `shares` INT DEFAULT 0,
    `engagement_rate` FLOAT DEFAULT 0,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
    PRIMARY KEY (`stat_id`),
    CONSTRAINT `reel_statistics_ibfk_1` FOREIGN KEY (`reel_id`) REFERENCES `reels` (`reel_id`) ON DELETE CASCADE,
    UNIQUE KEY `uq_reel_statistics_reel_id` (`reel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;