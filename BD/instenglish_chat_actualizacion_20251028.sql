
DROP PROCEDURE IF EXISTS add_column_if_not_exists;

DELIMITER $$
CREATE PROCEDURE add_column_if_not_exists(
  IN tbl VARCHAR(64),
  IN col VARCHAR(64),
  IN definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tbl
      AND COLUMN_NAME = col
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL add_column_if_not_exists('messages', 'message_type', 'VARCHAR(32) NOT NULL DEFAULT ''text''');
CALL add_column_if_not_exists('messages', 'file_url', 'VARCHAR(512) NULL');
CALL add_column_if_not_exists('messages', 'edited_at', 'DATETIME NULL DEFAULT NULL');
CALL add_column_if_not_exists('messages', 'is_deleted', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL add_column_if_not_exists('messages', 'deleted_at', 'DATETIME NULL DEFAULT NULL');
CALL add_column_if_not_exists('messages', 'deleted_by', 'INT NULL DEFAULT NULL');
CALL add_column_if_not_exists('messages', 'metadata', 'JSON NULL');

DROP PROCEDURE IF EXISTS add_column_if_not_exists;

CREATE TABLE IF NOT EXISTS `message_user_states` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `message_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deleted_at` DATETIME NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_message_user` (`message_id`, `user_id`),
  KEY `idx_user_states_user` (`user_id`),
  CONSTRAINT `fk_message_user_states_message`
    FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
