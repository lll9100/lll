import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Upload, Ruler, Target, Play, Pause, Square } from 'lucide-react';
import { CalibrationParams, HSLColor, TrackingData, Point } from '../types';
import { rgbToHsl, colorMatch } from '../tracking';

interface VideoWorkspaceProps {
  appState: 'setup' | 'calibrating' | 'picking_color' | 'tracking' | 'results';
  setAppState: (state: 'setup' | 'calibrating' | 'picking_color' | 'tracking' | 'results') => void;
  calibration: CalibrationParams;
  setCalibration: React.Dispatch<React.SetStateAction<CalibrationParams>>;
  onTrackingComplete: (data: TrackingData[]) => void;
  targetColor: HSLColor | null;
  setTargetColor: (color: HSLColor) => void;
  fps: number;
}

export function VideoWorkspace({
  appState,
  setAppState,
  calibration,
  setCalibration,
  onTrackingComplete,
  targetColor,
  setTargetColor,
  fps
}: VideoWorkspaceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const trackingDataRef = useRef<TrackingData[]>([]);
  const requestRef = useRef<number>();

  useEffect(() => {
    // any initialization if needed
  }, []);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setAppState('setup');
      trackingDataRef.current = [];
    }
  };

  const drawCanvas = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.videoWidth && video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Draw calibration line if exists
        if (calibration.pt1 && calibration.pt2) {
          ctx.beginPath();
          ctx.moveTo(calibration.pt1.x, calibration.pt1.y);
          ctx.lineTo(calibration.pt2.x, calibration.pt2.y);
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          ctx.fillStyle = '#00ff00';
          ctx.beginPath();
          ctx.arc(calibration.pt1.x, calibration.pt1.y, 4, 0, Math.PI * 2);
          ctx.arc(calibration.pt2.x, calibration.pt2.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw current tracked point
        if (appState === 'tracking' && trackingDataRef.current.length > 0) {
          const lastPoint = trackingDataRef.current[trackingDataRef.current.length - 1];
          ctx.fillStyle = 'red';
          ctx.beginPath();
          ctx.arc(lastPoint.x, lastPoint.y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [calibration, appState]);

  useEffect(() => {
    if (isPlaying || appState === 'tracking') {
      const tick = () => {
        drawCanvas();
        if (appState === 'tracking' && !videoRef.current?.paused) {
           processTrackingFrame();
        }
        requestRef.current = requestAnimationFrame(tick);
      };
      requestRef.current = requestAnimationFrame(tick);
    } else {
       // Draw once when paused
       drawCanvas();
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, appState, drawCanvas]);

  const processTrackingFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !targetColor) return;

    const ctx = canvas.getContext('2d',{ willReadFrequently: true });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Simple global tracking (or could optimize with ROI)
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let sumX = 0, sumY = 0, count = 0;
    
    // Use last position for ROI to speed up and prevent noise
    const lastPoint = trackingDataRef.current.length > 0 
      ? trackingDataRef.current[trackingDataRef.current.length - 1] 
      : null;
      
    const searchRadius = typeof lastPoint?.y === 'number' ? 100 : width;
    const startY = lastPoint ? Math.max(0, lastPoint.y - searchRadius/2) : 0;
    const endY = lastPoint ? Math.min(height, lastPoint.y + searchRadius) : height;
    const startX = lastPoint ? Math.max(0, lastPoint.x - searchRadius) : 0;
    const endX = lastPoint ? Math.min(width, lastPoint.x + searchRadius) : width;

    for (let y = Math.floor(startY); y < endY; y += 2) {
      for (let x = Math.floor(startX); x < endX; x += 2) {
        const i = (y * width + x) * 4;
        const r = data[i], g = data[i+1], b = data[i+2];
        const hsl = rgbToHsl(r, g, b);
        
        if (colorMatch(hsl, targetColor, 15, 0.2)) {
          sumX += x;
          sumY += y;
          count++;
        }
      }
    }

    if (count > 5) { // Threshold to consider found
      const cx = sumX / count;
      const cy = sumY / count;
      
      const time = video.currentTime;
      // Prevent duplicates from same frame
      const last = trackingDataRef.current[trackingDataRef.current.length - 1];
      if (!last || last.time !== time) {
          trackingDataRef.current.push({
            frame: Math.floor(time * fps),
            time,
            x: cx,
            y: cy
          });
      }
    }
    
    if (video.ended) {
       handleStopTracking();
    }
  };

  const handleStopTracking = () => {
      setAppState('results');
      videoRef.current?.pause();
      setIsPlaying(false);
      onTrackingComplete(trackingDataRef.current);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (appState === 'calibrating') {
      if (!calibration.pt1) {
        setCalibration(prev => ({ ...prev, pt1: { x, y } }));
      } else if (!calibration.pt2) {
        setCalibration(prev => ({ ...prev, pt2: { x, y } }));
        const len = window.prompt("请输入参考线代表的实际长度（毫米mm）：");
        if (len && !isNaN(parseFloat(len))) {
           setCalibration(prev => ({ ...prev, realLengthMM: parseFloat(len) }));
           setAppState('setup');
        } else {
           setCalibration(prev => ({ ...prev, pt1: null, pt2: null })); // reset
        }
      }
    } else if (appState === 'picking_color') {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const hsl = rgbToHsl(pixel[0], pixel[1], pixel[2]);
        setTargetColor(hsl);
        setAppState('setup');
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 border-x border-slate-700">
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between shadow-sm">
        <div className="flex gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition">
            <Upload size={18} />
            <span className="text-sm font-medium">上传视频</span>
            <input type="file" accept="video/mp4,video/webm,video/ogg" className="hidden" onChange={handleVideoUpload} />
          </label>
          <button 
            disabled={!videoSrc}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition text-sm font-medium ${appState === 'calibrating' ? 'bg-yellow-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
            onClick={() => {
                setAppState('calibrating');
                setCalibration({ pt1: null, pt2: null, realLengthMM: 0 });
            }}
          >
            <Ruler size={18} /> 标尺校准
          </button>
          <button 
            disabled={!videoSrc}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition text-sm font-medium ${appState === 'picking_color' ? 'bg-yellow-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
            onClick={() => setAppState('picking_color')}
          >
            <Target size={18} /> 吸色提取
          </button>
        </div>
        <div className="flex gap-2">
          {appState === 'tracking' ? (
             <button 
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium transition hover:bg-red-700"
                onClick={handleStopTracking}
             >
               <Square size={18} /> 停止
             </button>
          ) : (
            <button 
              disabled={!videoSrc || !targetColor}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                trackingDataRef.current = [];
                setAppState('tracking');
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play();
                }
              }}
            >
              <Play size={18} /> 开始追踪
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 relative bg-black flex items-center justify-center p-4">
         {!videoSrc && (
            <div className="text-slate-500 flex flex-col items-center">
               <Upload size={48} className="mb-4 opacity-50" />
               <p>请上传视频以继续分析。</p>
            </div>
         )}
         {videoSrc && (
           <div className="relative w-full h-full max-h-full flex items-center justify-center">
              <video 
                ref={videoRef} 
                src={videoSrc} 
                className="hidden" // hide video, we render to canvas
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onSeeked={drawCanvas}
                muted
                controls={false}
              />
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full object-contain cursor-crosshair border border-slate-700 rounded-sm shadow-xl"
                onClick={handleCanvasClick}
                onContextMenu={(e) => e.preventDefault()} // prevent context menu just in case
              />
           </div>
         )}
      </div>

      {videoSrc && appState !== 'tracking' && (
        <div className="h-14 bg-slate-800 border-t border-slate-700 flex items-center px-4 gap-4">
            <button 
                onClick={() => {
                   if (videoRef.current) {
                      if (isPlaying) videoRef.current.pause();
                      else videoRef.current.play();
                   }
                }}
                className="text-slate-300 hover:text-white"
            >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <input 
              type="range" 
              min={0} 
              max={videoRef.current?.duration || 100} 
              step={0.01}
              value={videoRef.current?.currentTime || 0}
              onChange={(e) => {
                 if (videoRef.current) videoRef.current.currentTime = parseFloat(e.target.value);
              }}
              className="flex-1"
            />
             {targetColor && (
                 <div className="flex items-center gap-2 text-sm text-slate-300">
                    目标颜色: 
                    <div className="w-4 h-4 rounded-full border border-slate-500" 
                         style={{backgroundColor: `hsl(${targetColor.h}, ${targetColor.s*100}%, ${targetColor.l*100}%)`}}></div>
                 </div>
             )}
        </div>
      )}
    </div>
  );
}
