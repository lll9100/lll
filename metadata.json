import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
}

export function QRCodeModal({ isOpen, onClose, url }: QRCodeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-xl shadow-2xl relative max-w-sm w-full mx-4 flex flex-col items-center">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
        >
          <X size={20} />
        </button>
        <h3 className="text-lg font-bold text-slate-800 mb-4">扫码在手机上打开</h3>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
          <QRCodeSVG value={url} size={200} level="H" />
        </div>
        <p className="mt-4 text-sm text-slate-500 text-center break-all">
          {url}
        </p>
      </div>
    </div>
  );
}
