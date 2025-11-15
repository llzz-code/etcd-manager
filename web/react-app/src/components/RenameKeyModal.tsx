import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Checkbox, message, Typography } from 'antd';
import { kvApi } from '@/api';

const { Text } = Typography;

interface RenameKeyModalProps {
  open: boolean;
  currentKey: string | null;
  connId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RenameKeyModal: React.FC<RenameKeyModalProps> = ({
  open,
  currentKey,
  connId,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && currentKey) {
      form.setFieldsValue({
        newKey: currentKey,
        overwrite: false,
      });
    }
  }, [open, currentKey, form]);

  const handleRename = async () => {
    if (!connId || !currentKey) {
      message.error('No connection or key selected');
      return;
    }

    try {
      const values = await form.validateFields();
      const newKey = values.newKey.trim();

      if (newKey === currentKey) {
        message.warning('New key name is the same as current');
        return;
      }

      setLoading(true);

      await kvApi.rename({
        connId,
        from: currentKey,
        to: newKey,
        overwrite: values.overwrite || false,
      });

      message.success('Key renamed successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.response?.status === 409) {
        message.error('Destination key already exists. Enable "Overwrite" to replace it.');
      } else if (error.response?.status === 404) {
        message.error('Source key not found');
      } else if (error.errorFields) {
        // Form validation error
        return;
      } else {
        message.error('Failed to rename key');
      }
      console.error('Failed to rename key:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Rename Key"
      open={open}
      onOk={handleRename}
      onCancel={onClose}
      confirmLoading={loading}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item label="Current Key">
          <Text code>{currentKey}</Text>
        </Form.Item>

        <Form.Item
          label="New Key Name"
          name="newKey"
          rules={[
            { required: true, message: 'Please input new key name' },
            {
              pattern: /^[a-zA-Z0-9_\-./]+$/,
              message: 'Key name can only contain letters, numbers, underscores, hyphens, dots, and slashes'
            },
          ]}
        >
          <Input placeholder="new-key-name" />
        </Form.Item>

        <Form.Item name="overwrite" valuePropName="checked">
          <Checkbox>
            Overwrite if destination key exists
          </Checkbox>
        </Form.Item>

        <Text type="secondary" style={{ fontSize: 12 }}>
          Note: Renaming creates a copy at the new location and deletes the original.
          The operation is atomic.
        </Text>
      </Form>
    </Modal>
  );
};
