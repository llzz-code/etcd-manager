export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString();
};

export const formatTTL = (ttl: number): string => {
  if (ttl === 0) return 'No TTL';
  if (ttl < 60) return `${ttl}s`;
  if (ttl < 3600) return `${Math.floor(ttl / 60)}m`;
  if (ttl < 86400) return `${Math.floor(ttl / 3600)}h`;
  return `${Math.floor(ttl / 86400)}d`;
};

export const getKeyName = (key: string): string => {
  const parts = key.split('/').filter(Boolean);
  return parts[parts.length - 1] || key;
};

export const getParentPath = (key: string): string => {
  const parts = key.split('/').filter(Boolean);
  parts.pop();
  return '/' + parts.join('/');
};

export const validateEndpoint = (endpoint: string): boolean => {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};
