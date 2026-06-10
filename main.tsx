import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { VideoWorkspace } from './components/VideoWorkspace';
import { AnalysisView } from './components/AnalysisView';
import { PhysicsParams, CalibrationParams, TrackingData, HSLColor } from './types';

export default function App() {
  const [params, setParams] = useState<PhysicsParams>({
    d: 2.0,      // mm
    rho_b: 7800, // kg/m^3 (steel)
    rho_l: 960,  // kg/m^3 (castor oil typical)
    D: 50.0,     // mm
    g: 9.8,      // m/s^2
    fps: 30,
  });

  const [appState, setAppState] = useState<'setup' | 'calibrating' | 'picking_color' | 'tracking' | 'results'>('setup');
  
  const [calibration, setCalibration] = useState<CalibrationParams>({
    pt1: null,
    pt2: null,
    realLengthMM: 0,
  });

  const [targetColor, setTargetColor] = useState<HSLColor | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingData[]>([]);

  return (
    <div className="w-full h-screen bg-slate-100 flex overflow-hidden font-sans text-slate-900">
      <Sidebar 
        params={params} 
        setParams={setParams} 
      />
      
      <VideoWorkspace 
        appState={appState}
        setAppState={setAppState}
        calibration={calibration}
        setCalibration={setCalibration}
        onTrackingComplete={setTrackingData}
        targetColor={targetColor}
        setTargetColor={setTargetColor}
        fps={params.fps}
      />
      
      <AnalysisView 
        data={trackingData} 
        params={params} 
        calibration={calibration}
      />
    </div>
  );
}
