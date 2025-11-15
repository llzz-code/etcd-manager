import React, { useEffect, useState, useCallback } from 'react';
import { Tree, Spin, Input, Space, Empty, Button, Popconfirm, message } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { kvApi } from '@/api';
import { useConnectionStore } from '@/store/connectionStore';
import { useEditorStore } from '@/store/editorStore';
import {
  FolderOutlined,
  FileOutlined,
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  CheckSquareOutlined,
  CloseSquareOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { KeyItem } from '@/types/kv';
import { TreeContextMenu } from '@/components/TreeContextMenu';
import { CreateKeyModal } from '@/components/CreateKeyModal';
import { RenameKeyModal } from '@/components/RenameKeyModal';

export const TreePanel: React.FC = () => {
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
  const [contextMenuNode, setContextMenuNode] = useState<DataNode | undefined>();

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createParentPath, setCreateParentPath] = useState<string>('');
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameKey, setRenameKey] = useState<string>('');

  const currentConnectionId = useConnectionStore((s) => s.currentConnectionId);
  const loadKey = useEditorStore((s) => s.loadKey);
  const currentKey = useEditorStore((s) => s.currentKey);
  const resetEditor = useEditorStore((s) => s.reset);

  const loadRootLevel = useCallback(async () => {
    if (!currentConnectionId) return;

    setLoading(true);
    try {
      const data = await kvApi.list(currentConnectionId, '/');
      const nodes = buildTreeNodes(data.children);
      setTreeData(nodes);
    } catch (error) {
      console.error('Failed to load root level:', error);
      message.error('Failed to load keys');
    } finally {
      setLoading(false);
    }
  }, [currentConnectionId]);

  useEffect(() => {
    if (currentConnectionId) {
      loadRootLevel();
    } else {
      setTreeData([]);
    }
  }, [currentConnectionId, loadRootLevel]);

  const buildTreeNodes = (items: KeyItem[]): DataNode[] => {
    return items.map((item) => ({
      key: item.key,
      title: item.key.split('/').filter(Boolean).pop() || item.key,
      isLeaf: !item.isDir,
      icon: item.isDir ? <FolderOutlined /> : <FileOutlined />,
    }));
  };

  const onLoadData = async (node: DataNode): Promise<void> => {
    if (!currentConnectionId || node.isLeaf) return;

    try {
      const data = await kvApi.list(currentConnectionId, node.key as string);
      const children = buildTreeNodes(data.children);

      setTreeData((prevData) => updateTreeData(prevData, node.key as string, children));
    } catch (error) {
      console.error('Failed to load children:', error);
      message.error('Failed to load directory');
    }
  };

  const updateTreeData = (
    list: DataNode[],
    key: string,
    children: DataNode[]
  ): DataNode[] => {
    return list.map((node) => {
      if (node.key === key) {
        return { ...node, children };
      }
      if (node.children) {
        return { ...node, children: updateTreeData(node.children, key, children) };
      }
      return node;
    });
  };

  const onSelect = async (selectedKeys: React.Key[]) => {
    if (selectedKeys.length === 0 || !currentConnectionId) return;

    const key = selectedKeys[0] as string;
    const node = findNode(treeData, key);

    if (node && node.isLeaf) {
      try {
        await loadKey(currentConnectionId, key);
      } catch (error) {
        // Error handled in store
      }
    }
  };

  const findNode = (nodes: DataNode[], key: string): DataNode | null => {
    for (const node of nodes) {
      if (node.key === key) return node;
      if (node.children) {
        const found = findNode(node.children, key);
        if (found) return found;
      }
    }
    return null;
  };

  const filterTreeData = (nodes: DataNode[], search: string): DataNode[] => {
    if (!search) return nodes;

    const filtered: DataNode[] = [];

    for (const node of nodes) {
      const title = node.title as string;
      const matches = title.toLowerCase().includes(search.toLowerCase());
      const filteredChildren = node.children
        ? filterTreeData(node.children, search)
        : [];

      if (matches || filteredChildren.length > 0) {
        filtered.push({ ...node, children: filteredChildren });
      }
    }

    return filtered;
  };

  // Context menu handlers
  const handleNewKey = () => {
    setCreateParentPath('');
    setCreateModalOpen(true);
  };

  const handleNewChild = (parentPath: string) => {
    setCreateParentPath(parentPath);
    setCreateModalOpen(true);
  };

  const handleRename = (key: string) => {
    setRenameKey(key);
    setRenameModalOpen(true);
  };

  const handleCopy = async (key: string) => {
    if (!currentConnectionId) return;

    const newKey = prompt(`Copy "${key}" to:`, key + '-copy');
    if (!newKey || newKey === key) return;

    try {
      await kvApi.copy({
        connId: currentConnectionId,
        from: key,
        to: newKey,
        overwrite: false,
      });
      message.success('Key copied successfully');
      loadRootLevel();
    } catch (error: any) {
      if (error.response?.status === 409) {
        message.error('Destination key already exists');
      } else {
        message.error('Failed to copy key');
      }
    }
  };

  const handleDelete = async (key: string) => {
    if (!currentConnectionId) return;

    try {
      await kvApi.deleteKey(currentConnectionId, key);
      message.success('Key deleted successfully');
      if (currentKey === key) {
        resetEditor();
      }
      loadRootLevel();
    } catch (error) {
      message.error('Failed to delete key');
    }
  };

  const handleRefresh = async (key: string) => {
    // Refresh directory by reloading its children
    const node = findNode(treeData, key);
    if (node && !node.isLeaf) {
      await onLoadData(node);
    }
  };

  // Batch operations
  const handleBatchDelete = async () => {
    if (!currentConnectionId || checkedKeys.length === 0) return;

    try {
      const result = await kvApi.batchDelete({
        connId: currentConnectionId,
        keys: checkedKeys as string[],
      });
      message.success(`${result.deleted} keys deleted successfully`);
      setCheckedKeys([]);
      setBatchMode(false);
      if (currentKey && checkedKeys.includes(currentKey)) {
        resetEditor();
      }
      loadRootLevel();
    } catch (error) {
      message.error('Failed to delete keys');
    }
  };

  const handleCreateSuccess = () => {
    loadRootLevel();
  };

  const handleRenameSuccess = () => {
    loadRootLevel();
    if (currentKey === renameKey) {
      resetEditor();
    }
  };

  if (!currentConnectionId) {
    return (
      <Empty
        description="No connection selected. Please select a connection from the header."
        style={{ marginTop: 50 }}
      />
    );
  }

  const filteredData = filterTreeData(treeData, searchValue);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Space direction="vertical" style={{ width: '100%', marginBottom: 12 }}>
        <Input
          placeholder="Search keys..."
          prefix={<SearchOutlined />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          allowClear
        />

        <Space wrap style={{ width: '100%' }}>
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={handleNewKey}
          >
            New Key
          </Button>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={loadRootLevel}
          >
            Refresh
          </Button>
          <Button
            size="small"
            icon={batchMode ? <CloseSquareOutlined /> : <CheckSquareOutlined />}
            onClick={() => {
              setBatchMode(!batchMode);
              setCheckedKeys([]);
            }}
          >
            {batchMode ? 'Exit Batch' : 'Batch Mode'}
          </Button>
        </Space>

        {batchMode && checkedKeys.length > 0 && (
          <Popconfirm
            title={`Delete ${checkedKeys.length} selected keys?`}
            description="This action cannot be undone."
            onConfirm={handleBatchDelete}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              style={{ width: '100%' }}
            >
              Delete {checkedKeys.length} Selected
            </Button>
          </Popconfirm>
        )}
      </Space>

      <Spin spinning={loading}>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {filteredData.length > 0 ? (
            <TreeContextMenu
              node={contextMenuNode}
              onNewKey={handleNewKey}
              onNewChild={handleNewChild}
              onRename={handleRename}
              onCopy={handleCopy}
              onDelete={handleDelete}
              onRefresh={handleRefresh}
            >
              <Tree
                treeData={filteredData}
                loadData={onLoadData}
                onSelect={onSelect}
                selectedKeys={currentKey ? [currentKey] : []}
                checkable={batchMode}
                checkedKeys={batchMode ? checkedKeys : undefined}
                onCheck={(checked) => {
                  if (Array.isArray(checked)) {
                    setCheckedKeys(checked);
                  } else {
                    setCheckedKeys(checked.checked);
                  }
                }}
                onRightClick={({ node }) => setContextMenuNode(node)}
                showIcon
                style={{ background: '#fff' }}
              />
            </TreeContextMenu>
          ) : (
            <Empty description="No keys found" />
          )}
        </div>
      </Spin>

      <CreateKeyModal
        open={createModalOpen}
        parentPath={createParentPath}
        connId={currentConnectionId}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <RenameKeyModal
        open={renameModalOpen}
        currentKey={renameKey}
        connId={currentConnectionId}
        onClose={() => setRenameModalOpen(false)}
        onSuccess={handleRenameSuccess}
      />
    </div>
  );
};
