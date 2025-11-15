import React from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  PlusOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FolderAddOutlined,
} from '@ant-design/icons';

interface TreeContextMenuProps {
  node?: DataNode;
  onNewKey: () => void;
  onNewChild: (parentPath: string) => void;
  onRename: (key: string) => void;
  onCopy: (key: string) => void;
  onDelete: (key: string) => void;
  onRefresh: (key: string) => void;
  children: React.ReactNode;
}

export const TreeContextMenu: React.FC<TreeContextMenuProps> = ({
  node,
  onNewKey,
  onNewChild,
  onRename,
  onCopy,
  onDelete,
  onRefresh,
  children,
}) => {
  const handleMenuClick: MenuProps['onClick'] = ({ key, domEvent }) => {
    if (domEvent) {
      domEvent.stopPropagation();
    }

    if (!node) {
      if (key === 'newKey') {
        onNewKey();
      }
      return;
    }

    const nodeKey = node.key as string;

    switch (key) {
      case 'newChild':
        onNewChild(nodeKey);
        break;
      case 'rename':
        onRename(nodeKey);
        break;
      case 'copy':
        onCopy(nodeKey);
        break;
      case 'delete':
        onDelete(nodeKey);
        break;
      case 'refresh':
        onRefresh(nodeKey);
        break;
      default:
        break;
    }
  };

  const getMenuItems = (): MenuProps['items'] => {
    // No node selected (right-click on empty space)
    if (!node) {
      return [
        {
          key: 'newKey',
          label: 'New Key',
          icon: <PlusOutlined />,
        },
      ];
    }

    // Directory node
    if (!node.isLeaf) {
      return [
        {
          key: 'newChild',
          label: 'New Child Key',
          icon: <FolderAddOutlined />,
        },
        {
          key: 'refresh',
          label: 'Refresh',
          icon: <ReloadOutlined />,
        },
        {
          type: 'divider',
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: <DeleteOutlined />,
          danger: true,
        },
      ];
    }

    // File (leaf) node
    return [
      {
        key: 'rename',
        label: 'Rename',
        icon: <EditOutlined />,
      },
      {
        key: 'copy',
        label: 'Copy',
        icon: <CopyOutlined />,
      },
      {
        type: 'divider',
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: <DeleteOutlined />,
        danger: true,
      },
    ];
  };

  return (
    <Dropdown
      menu={{
        items: getMenuItems(),
        onClick: handleMenuClick,
      }}
      trigger={['contextMenu']}
    >
      {children}
    </Dropdown>
  );
};
