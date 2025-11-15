export interface KeyItem {
  key: string;
  value?: string;
  isDir: boolean;
  ttl: number;
}

export interface ListKeysResp {
  prefix: string;
  children: KeyItem[];
}

export interface GetKeyReq {
  connId: string;
  key: string;
}

export interface PutKeyReq {
  connId: string;
  key: string;
  value: string;
  ttl?: number;
}

export interface ListKeysReq {
  connId: string;
  prefix: string;
  includeTTL?: boolean;
}

export interface RenameKeyReq {
  connId: string;
  from: string;
  to: string;
  overwrite?: boolean;
}

export interface CopyKeyReq {
  connId: string;
  from: string;
  to: string;
  overwrite?: boolean;
}

export interface BatchDeleteReq {
  connId: string;
  keys: string[];
}

export interface KeyRevision {
  revision: number;
  value: string;
  modRevision: number;
  createTime: number;
  version: number;
}

export interface GetHistoryResp {
  key: string;
  history: KeyRevision[];
  note: string;
}

export interface RollbackReq {
  connId: string;
  key: string;
  revision: number;
}
