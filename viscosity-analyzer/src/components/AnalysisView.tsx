import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { TrackingData, PhysicsParams, CalibrationParams } from '../types';
import { calculateLinearRegression, calculateViscosity } from '../tracking';
import { Download } from 'lucide-react';

interface AnalysisViewProps {
  data: TrackingData[];
  params: PhysicsParams;
  calibration: CalibrationParams;
}

export function AnalysisView({ data, params, calibration }: AnalysisViewProps) {
  const [range, setRange] = useState<[number, number]>([0, data.length - 1]);

  // Convert pixel data to true displacement data
  const processedData = useMemo(() => {
    if (data.length === 0) return [];
    
    // Pixel distance between calibration points
    let pxToMm = 1; 
    // Default to 1 if no calibration
    if (calibration.pt1 && calibration.pt2 && calibration.realLengthMM > 0) {
       const dx = calibration.pt2.x - calibration.pt1.x;
       const dy = calibration.pt2.y - calibration.pt1.y;
       const pxDist = Math.sqrt(dx*dx + dy*dy);
       pxToMm = calibration.realLengthMM / pxDist;
    }

    // Assume Y increases downwards in image, so falling decreases y.
    // Actually, in canvas Y=0 is top. Falling means Y increases.
    const y0 = data[0].y;

    return data.map((d) => ({
      time: parseFloat(d.time.toFixed(3)),
      displacement_mm: (d.y - y0) * pxToMm, // only vertical displacement used for falling ball
      displacement_m: ((d.y - y0) * pxToMm) / 1000,
      y_px: d.y,
      x_px: d.x
    }));
  }, [data, calibration]);

  const fitResult = useMemo(() => {
    if (processedData.length < 2) return null;
    const startIdx = Math.max(0, Math.min(range[0], processedData.length - 1));
    const endIdx = Math.max(0, Math.min(range[1], processedData.length - 1));
    if (startIdx >= endIdx) return null;

    const segment = processedData.slice(startIdx, endIdx + 1);
    const fitData = segment.map(d => ({ x: d.time, y: d.displacement_m }));
    
    const { slope: v, r2 } = calculateLinearRegression(fitData);
    
    let eta = 0;
    if (v > 0) {
      eta = calculateViscosity({ ...params, v });
    }

    return { v, eta, r2, startIdx, endIdx };
  }, [processedData, range, params]);

  const handleExport = () => {
    if (processedData.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "时间 (s),位移 (m),X (px),Y (px)\n";
    
    processedData.forEach(row => {
      csvContent += `${row.time},${row.displacement_m},${row.x_px},${row.y_px}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "tracking_data.csv");
    document.body.appendChild(link); // Required for FF
    link.click();
    link.remove();
  };

  if (processedData.length === 0) {
    return (
      <div className="w-80 bg-white border-l border-slate-200 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
        <p>暂无追踪数据，请先提取视频中的数据。</p>
      </div>
    );
  }

  return (
    <div className="w-96 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-200 shrink-0 flex justify-between items-center bg-slate-50">
        <h2 className="text-lg font-semibold text-slate-800">分析结果</h2>
        <button 
          onClick={handleExport}
          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
          title="导出为CSV"
        >
          <Download size={18} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="h-64 border border-slate-200 rounded-lg p-2 bg-white shadow-sm">
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                  <XAxis 
                    dataKey="time" 
                    type="number" 
                    domain={['dataMin', 'dataMax']} 
                    tickFormatter={(v) => v.toFixed(1)} 
                    label={{ value: '时间 (s)', position: 'insideBottom', offset: -5, style: { fontSize: '12px' } }}
                  />
                  <YAxis 
                    label={{ value: '位移 (mm)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }} 
                    tickFormatter={(v) => v.toFixed(0)} 
                  />
                  <Tooltip formatter={(val: number) => val.toFixed(2)} labelFormatter={(val: number) => `时间: ${val}s`} />
                  <Line type="monotone" dataKey="displacement_mm" dot={false} stroke="#2563eb" strokeWidth={2} />
                  
                  {fitResult && (
                      <>
                        {/* @ts-ignore */}
                        <ReferenceArea 
                           {...({
                             x1: processedData[fitResult.startIdx]?.time,
                             x2: processedData[fitResult.endIdx]?.time,
                             fill: "#fef08a",
                             fillOpacity: 0.4
                           } as any)}
                        />
                      </>
                  )}
                </LineChart>
             </ResponsiveContainer>
          </div>
          
          <div className="space-y-2">
             <label className="block text-sm font-medium text-slate-700">
               选择匀速下落区间
             </label>
             <div className="flex items-center gap-4">
                 <span className="text-xs text-slate-500 w-8">{processedData[range[0]]?.time.toFixed(1)}s</span>
                 <input 
                   type="range" 
                   min={0} 
                   max={processedData.length - 1} 
                   value={range[0]} 
                   onChange={(e) => setRange([Math.min(parseInt(e.target.value), range[1] - 1), range[1]])}
                   className="flex-1"
                 />
             </div>
             <div className="flex items-center gap-4">
                 <span className="text-xs text-slate-500 w-8">{processedData[range[1]]?.time.toFixed(1)}s</span>
                 <input 
                   type="range" 
                   min={0} 
                   max={processedData.length - 1} 
                   value={range[1]} 
                   onChange={(e) => setRange([range[0], Math.max(parseInt(e.target.value), range[0] + 1)])}
                   className="flex-1"
                 />
             </div>
          </div>

          {fitResult ? (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-blue-900 mb-4 uppercase tracking-wider">计算结果</h3>
              <div className="space-y-3">
                 <div className="flex justify-between border-b border-blue-200 pb-2">
                    <span className="text-sm text-blue-800">收尾速度 (v)</span>
                    <span className="font-mono font-medium text-slate-900">{(fitResult.v).toFixed(4)} m/s</span>
                 </div>
                 <div className="flex justify-between border-b border-blue-200 pb-2">
                    <span className="text-sm text-blue-800">拟合优度 (R²)</span>
                    <span className="font-mono font-medium text-slate-900">{fitResult.r2.toFixed(4)}</span>
                 </div>
                 <div className="flex justify-between items-center pt-2">
                    <span className="text-base font-bold text-slate-900">粘滞系数 (η)</span>
                    <span className="text-lg font-mono font-bold text-blue-700">{(fitResult.eta).toFixed(4)} Pa·s</span>
                 </div>
              </div>
            </div>
          ) : (
             <div className="text-sm text-amber-600 bg-amber-50 p-4 rounded-md border border-amber-100">
               请选择有效的计算区间。
             </div>
          )}
      </div>
    </div>
  );
}
