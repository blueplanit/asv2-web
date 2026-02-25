/** Shared limits for the column-request feature (API + modal). Keep in sync. */
export const COLUMN_REQUEST_MAX_SCREENSHOTS = 5;
export const COLUMN_REQUEST_MAX_PER_FILE_BYTES = 5 * 1024 * 1024; // 5MB
export const COLUMN_REQUEST_MAX_TOTAL_BYTES = 10 * 1024 * 1024; // 10MB
export const COLUMN_REQUEST_MAX_TEXT_LENGTH = 5000;
export const COLUMN_REQUEST_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
