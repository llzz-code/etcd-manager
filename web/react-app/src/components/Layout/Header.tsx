import React from 'react';
import { Layout as AntLayout, Menu, Select, Space, Typography } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useConnectionStore } from '@/store/connectionStore';
import { DatabaseOutlined } from '@ant-design/icons';

const { Header: AntHeader } = AntLayout;
const { Option } = Select;
const { Text } = Typography;

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { connections, currentConnectionId, setCurrentConnection } = useConnectionStore();

  const connectedConnections = connections.filter((c) => c.status === 'connected');
  const currentConnection = connections.find((c) => c.id === currentConnectionId);

  const menuItems = [
    { key: '/connections', label: 'Connections' },
    { key: '/explorer', label: 'Explorer' },
  ];

  return (
    <AntHeader
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#001529',
        padding: '0 24px',
      }}
    >
      <Space size="large" style={{ flex: 1 }}>
        <Space>
          <DatabaseOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          <Text strong style={{ color: 'white', fontSize: 18 }}>
            etcd-manager
          </Text>
        </Space>

        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1, minWidth: 0, border: 'none' }}
        />
      </Space>

      <Space>
        <Text style={{ color: 'rgba(255,255,255,0.65)' }}>Connection:</Text>
        <Select
          style={{ width: 200 }}
          placeholder="Select connection"
          value={currentConnectionId}
          onChange={(value) => setCurrentConnection(value)}
          disabled={connectedConnections.length === 0}
        >
          {connectedConnections.map((conn) => (
            <Option key={conn.id} value={conn.id}>
              {conn.name}
            </Option>
          ))}
        </Select>
        {currentConnection && (
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
            {currentConnection.endpoints.join(', ')}
          </Text>
        )}
      </Space>
    </AntHeader>
  );
};
