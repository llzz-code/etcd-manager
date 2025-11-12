import apiClient from './client';
import type { KeyItem, ListKeysResp, PutKeyReq } from '@/types/kv';

export const kvApi = {
  async list(connId: string, prefix: string, includeTTL = false): Promise<ListKeysResp> {
    const response = await apiClient.get('/kv/list', {
      params: { connId, prefix, includeTTL },
    });
    return response.data;
  },

  async get(connId: string, key: string): Promise<KeyItem> {
    const response = await apiClient.get('/kv', {
      params: { connId, key },
    });
    return response.data;
  },

  async put(data: PutKeyReq): Promise<void> {
    await apiClient.post('/kv/put', data);
  },

  async deleteKey(connId: string, key: string): Promise<void> {
    await apiClient.delete('/kv', {
      params: { connId, key },
    });
  },

  async create(data: PutKeyReq): Promise<void> {
    await apiClient.post('/kv/create', data);
  },
};
