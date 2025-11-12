import React, { useEffect, useState, useCallback } from 'react';
import { Tree, Spin, Input, Space, Empty } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { kvApi } from '@/api';
import { useConnectionStore } from '@/store/connectionStore';
import { useEditorStore } from '@/store/editorStore';
import { FolderOutlined, FileOutlined, SearchOutlined } from '@ant-design/icons';
import type { KeyItem } from '@/types/kv';

export const TreePanel: React.FC = () => {
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const currentConnectionId = useConnectionStore((s) => s.currentConnectionId);
  const loadKey = useEditorStore((s) => s.loadKey);
  const currentKey = useEditorStore((s) => s.currentKey);

  const loadRootLevel = useCallback(async () => {
    if (!currentConnectionId) return;

    setLoading(true);
    try {
      const data = await kvApi.list(currentConnectionId, '/');
      const nodes = buildTreeNodes(data.children);
      setTreeData(nodes);
    } catch (error) {
      console.error('Failed to load root level:', error);
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
    <div>
      <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
        <Input
          placeholder="Search keys..."
          prefix={<SearchOutlined />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          allowClear
        />
      </Space>

      <Spin spinning={loading}>
        {filteredData.length > 0 ? (
          <Tree
            treeData={filteredData}
            loadData={onLoadData}
            onSelect={onSelect}
            selectedKeys={currentKey ? [currentKey] : []}
            showIcon
            style={{ background: '#fff' }}
          />
        ) : (
          <Empty description="No keys found" />
        )}
      </Spin>
    </div>
  );
};
