import React from 'react';
import { PhysicsParams } from '../types';
import { QrCode } from 'lucide-react';
import { QRCodeModal } from './QRCodeModal';

interface SidebarProps {
  params: PhysicsParams;
  setParams: React.Dispatch<React.SetStateAction<PhysicsParams>>;
}

export function Sidebar({ params, setParams }: SidebarProps) {
  const [showQR, setShowQR] = React.useState(false);
  const [currentUrl, setCurrentUrl] = React.useState('');

  React.useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParams(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  return (
    <div className="w-80 bg-slate-50 border-r border-slate-200 p-6 flex flex-col gap-6 overflow-y-auto">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">物理参数</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              小球直径 d (mm)
            </label>
            <input
              type="number"
              name="d"
              value={params.d}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              小球密度 ρ_b (kg/m³)
            </label>
            <input
              type="number"
              name="rho_b"
              value={params.rho_b}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              液体密度 ρ_l (kg/m³)
            </label>
            <input
              type="number"
              name="rho_l"
              value={params.rho_l}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              容器直径 D (mm)
            </label>
            <input
              type="number"
              name="D"
              value={params.D}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              重力加速度 g (m/s²)
            </label>
            <input
              type="number"
              name="g"
              value={params.g}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              视频帧率 (fps)
            </label>
            <input
              type="number"
              name="fps"
              value={params.fps}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
      
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">使用说明</h2>
        <ul className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
          <li>上传本地视频文件。</li>
          <li>点击“标尺校准”并在已知长度的一段距离上画线，输入实际长度。</li>
          <li>点击“吸色提取”并在视频中点击下落的小球获取追踪颜色。</li>
          <li>点击“开始追踪”进行自动化分析。</li>
          <li>在图表下方调整匀速运动区间来计算粘滞系数。</li>
        </ul>
      </div>

      <div className="mt-auto pt-6">
        <button 
          onClick={() => setShowQR(true)}
          className="flex items-center justify-center gap-2 w-full py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition font-medium text-sm"
        >
          <QrCode size={18} /> 手机端扫码使用
        </button>
      </div>

      <QRCodeModal isOpen={showQR} onClose={() => setShowQR(false)} url={currentUrl} />
    </div>
  );
}
