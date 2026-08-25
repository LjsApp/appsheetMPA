import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import { Button } from './ui';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  isLoading?: boolean;
  confirmText?: string;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Hapus Data',
  description = 'Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.',
  isLoading = false,
  confirmText = 'Hapus',
}: DeleteConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-6">
        <div className="flex items-start gap-4 p-4 bg-red-50 text-red-800 rounded-lg border border-red-100">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">{description}</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={isLoading}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
