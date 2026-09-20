import React from 'react';
import { X, ZoomIn, Download } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Trade Chart Screenshot',
}) => {
  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `chart-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
      <div 
        className="relative max-w-5xl w-full bg-white border border-[#E7E0D6] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E7E0D6] bg-[#FAF7F2]">
          <div className="flex items-center gap-2 text-[#DB9F35]">
            <ZoomIn className="w-5 h-5" />
            <h3 className="text-sm font-bold text-[#1F1A16] tracking-wide">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-[#786F66] hover:text-[#DB9F35] hover:bg-[#F3EDE2] transition-colors"
              title="Download Screenshot"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#786F66] hover:text-[#1F1A16] hover:bg-[#F3EDE2] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#FAF7F2]/60">
          <img
            src={imageUrl}
            alt="Trading Chart"
            className="max-h-[75vh] w-auto object-contain rounded-xl border border-[#E7E0D6] shadow-md"
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-[#E7E0D6] bg-white flex justify-between items-center text-xs text-[#786F66]">
          <span>Charts pasted via <code className="text-[#DB9F35] font-bold">Ctrl + V</code> are saved in high resolution locally</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[#FAF7F2] hover:bg-[#F3EDE2] text-[#1F1A16] rounded-xl border border-[#E7E0D6] transition-colors font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
