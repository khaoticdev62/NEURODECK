export function validateTabCreationOptions(payload: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!payload || typeof payload !== "object") {
    return { valid: false, errors: ["Payload must be an object"] };
  }
  if (payload.url !== undefined && typeof payload.url !== "string") {
    errors.push("url must be a string");
  }
  if (payload.profileId !== undefined && typeof payload.profileId !== "string") {
    errors.push("profileId must be a string");
  }
  return { valid: errors.length === 0, errors };
}

export function validateSessionClearOptions(payload: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!payload || typeof payload !== "object") {
    return { valid: false, errors: ["Payload must be an object"] };
  }
  const keys = ["cache", "cookies", "localStorage", "history", "bookmarks", "permissions"];
  for (const k of keys) {
    if (payload[k] !== undefined && typeof payload[k] !== "boolean") {
      errors.push(`${k} must be a boolean`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateBookmarkAddition(payload: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!payload || typeof payload !== "object") {
    return { valid: false, errors: ["Payload must be an object"] };
  }
  if (typeof payload.url !== "string" || !payload.url) {
    errors.push("url is required and must be a non-empty string");
  }
  if (payload.title !== undefined && typeof payload.title !== "string") {
    errors.push("title must be a string");
  }
  return { valid: errors.length === 0, errors };
}
