import apiClient from './client';
import type {
  KeyItem,
  ListKeysResp,
  PutKeyReq,
  RenameKeyReq,
  CopyKeyReq,
  BatchDeleteReq,
  GetHistoryResp,
  RollbackReq
} from '@/types/kv';

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
    await apiClient.put('/kv', data);
  },

  async create(data: PutKeyReq): Promise<void> {
    await apiClient.post('/kv', data);
  },

  async deleteKey(connId: string, key: string): Promise<void> {
    await apiClient.delete('/kv', {
      params: { connId, key },
    });
  },

  async batchDelete(data: BatchDeleteReq): Promise<{ deleted: number }> {
    const response = await apiClient.post('/kv/batch-delete', data);
    return response.data;
  },

  async rename(data: RenameKeyReq): Promise<void> {
    await apiClient.post('/kv/rename', data);
  },

  async copy(data: CopyKeyReq): Promise<void> {
    await apiClient.post('/kv/copy', data);
  },

  async getHistory(connId: string, key: string, limit = 10): Promise<GetHistoryResp> {
    const response = await apiClient.get('/kv/history', {
      params: { connId, key, limit },
    });
    return response.data;
  },

  async rollback(data: RollbackReq): Promise<void> {
    await apiClient.post('/kv/rollback', data);
  },
};
