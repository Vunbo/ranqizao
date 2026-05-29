export function formatRelativeTime(value: string | null) {
  if (!value) return '鏈煡';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return '鍒氬垰';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}鍒嗛挓鍓?`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}灏忔椂鍓?`;
  return date.toLocaleString();
}
