import React from 'react';
import { Row, Col, Card, Typography } from 'antd';
import { TreePanel } from './TreePanel';
import { EditorPanel } from './EditorPanel';

const { Title } = Typography;

export const Explorer: React.FC = () => {
  return (
    <div>
      <Title level={2}>etcd Explorer</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={24} md={8} lg={7} xl={6}>
          <Card
            title="Keys"
            bodyStyle={{
              padding: '12px',
              height: 'calc(100vh - 250px)',
              overflow: 'auto'
            }}
          >
            <TreePanel />
          </Card>
        </Col>
        <Col xs={24} sm={24} md={16} lg={17} xl={18}>
          <Card
            title="Editor"
            bodyStyle={{
              padding: '12px',
              height: 'calc(100vh - 250px)',
              overflow: 'hidden'
            }}
          >
            <EditorPanel />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
