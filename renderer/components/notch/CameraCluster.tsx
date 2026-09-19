import React, { useState } from 'react'

interface CameraClusterProps {
  initialLedActive?: boolean
}

export const CameraCluster: React.FC<CameraClusterProps> = ({ initialLedActive = true }) => {
  const [ledActive, setLedActive] = useState(initialLedActive)

  return (
    <div className="flex items-center space-x-2.5">
      {/* Ambient Light Sensor */}
      <div
        className="w-[5px] h-[2.5px] rounded-full bg-[#141414] border border-white/[0.04]"
        title="Ambient Light Sensor"
      />

      {/* FaceTime HD Camera Lens */}
      <div
        className="relative w-[11.5px] h-[11.5px] rounded-full bg-[#0a0a0a] ring-1 ring-[#262626] flex items-center justify-center shadow-inner"
        title="FaceTime Camera"
      >
        {/* Multi-coated optical glass element */}
        <div className="w-[6px] h-[6px] rounded-full bg-gradient-to-tr from-[#050b1c] via-[#091538] to-[#1c0d2e] relative flex items-center justify-center">
          <div className="w-[2px] h-[2px] rounded-full bg-[#01030a]" />
          {/* Specular glare dot */}
          <div className="w-[1.2px] h-[1.2px] rounded-full bg-white/85 absolute top-[1px] left-[1px]" />
        </div>
      </div>

      {/* Privacy Camera LED Indicator */}
      <div
        onClick={() => setLedActive(!ledActive)}
        className={`w-[3px] h-[3px] rounded-full transition-all duration-300 cursor-pointer ${
          ledActive
            ? 'bg-[#30d158] shadow-[0_0_5px_#30d158,0_0_8px_rgba(48,209,88,0.7)]'
            : 'bg-[#102416]'
        }`}
        title="Privacy Indicator (Click to toggle)"
      />

      {/* Microphone Pinhole */}
      <div className="w-[1.5px] h-[1.5px] rounded-full bg-[#181818]" title="Microphone" />
    </div>
  )
}
