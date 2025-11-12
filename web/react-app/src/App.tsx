import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, ConfigProvider } from 'antd';
import { Header } from '@/components/Layout/Header';
import { Sidebar } from '@/components/Layout/Sidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Connections } from '@/pages/Connections';
import { Explorer } from '@/pages/Explorer';

const { Content } = Layout;

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <ErrorBoundary>
        <BrowserRouter>
          <Layout style={{ minHeight: '100vh' }}>
            <Header />
            <Layout>
              <Sidebar />
              <Layout style={{ padding: '24px' }}>
                <Content
                  style={{
                    background: '#fff',
                    padding: 24,
                    margin: 0,
                    minHeight: 280,
                  }}
                >
                  <Routes>
                    <Route path="/" element={<Navigate to="/connections" replace />} />
                    <Route path="/connections" element={<Connections />} />
                    <Route path="/explorer" element={<Explorer />} />
                  </Routes>
                </Content>
              </Layout>
            </Layout>
          </Layout>
        </BrowserRouter>
      </ErrorBoundary>
    </ConfigProvider>
  );
}

export default App;
