import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Modal, Button } from '@/components/ui';
import { AlertCircle } from 'lucide-react';

interface ConfirmContextType {
  confirm: (message: string, options?: { title?: string; confirmText?: string; cancelText?: string; variant?: 'destructive' | 'default' }) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
};

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [resolveFn, setResolveFn] = useState<(value: boolean) => void>();
  const [message, setMessage] = useState('');
  const [options, setOptions] = useState<{ title?: string; confirmText?: string; cancelText?: string; variant?: 'destructive' | 'default' }>({});

  const confirm = useCallback((msg: string, opts?: typeof options) => {
    setMessage(msg);
    setOptions(opts ?? {});
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolveFn(() => resolve);
    });
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    if (resolveFn) resolveFn(false);
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolveFn) resolveFn(true);
  };

  const isDestructive = options.variant !== 'default';

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal open={isOpen} onClose={handleClose} title={options.title || 'Xác nhận yêu cầu'} maxWidth="max-w-md">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className={`p-4 rounded-full ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'}`}>
            <AlertCircle className="w-10 h-10" />
          </div>
          <p className="text-zinc-600 font-medium leading-relaxed">{message}</p>
          <div className="flex gap-3 w-full mt-6 pt-4">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              {options.cancelText || 'Hủy bỏ'}
            </Button>
            <Button variant={isDestructive ? 'destructive' : 'default'} className="flex-1" onClick={handleConfirm}>
              {options.confirmText || 'Đồng ý'}
            </Button>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
};
