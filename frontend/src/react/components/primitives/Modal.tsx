import { type ReactNode } from "react";
import { Modal as DSModal, type ModalSize } from "../../../design-system/components/feedback/Modal";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  children: ReactNode;
  footer?: ReactNode;
  closeOnBackdrop?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
  closeOnBackdrop = true,
}: ModalProps) {
  return (
    <DSModal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      footer={footer}
      closeOnBackdrop={closeOnBackdrop}
      closable={true}
      trap={true}
    >
      {children}
    </DSModal>
  );
}
