import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { DatabaseOutlined, FolderOpenOutlined } from '@ant-design/icons';

const { Sider } = Layout;

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    {
      key: '/connections',
      icon: <DatabaseOutlined />,
      label: 'Connections',
    },
    {
      key: '/explorer',
      icon: <FolderOpenOutlined />,
      label: 'Explorer',
    },
  ];

  return (
    <Sider
      width={200}
      collapsedWidth={80}
      breakpoint="lg"
      collapsed={collapsed}
      onCollapse={setCollapsed}
      style={{ background: '#fff' }}
    >
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{ height: '100%', borderRight: 0 }}
      />
    </Sider>
  );
};
