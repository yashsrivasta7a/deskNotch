import React from 'react'

interface AudioVisualizerProps {
  isPlaying?: boolean
  className?: string
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isPlaying = true, className = '' }) => {
  return (
    <div className={`flex items-end space-x-[2px] h-[12px] ${className}`} title="Audio Visualizer">
      <span
        className={`w-[2px] bg-[#30d158] rounded-full ${
          isPlaying ? 'animate-eq-1' : 'h-[3px] opacity-40'
        }`}
      />
      <span
        className={`w-[2px] bg-[#30d158] rounded-full ${
          isPlaying ? 'animate-eq-2' : 'h-[3px] opacity-40'
        }`}
      />
      <span
        className={`w-[2px] bg-[#30d158] rounded-full ${
          isPlaying ? 'animate-eq-3' : 'h-[3px] opacity-40'
        }`}
      />
    </div>
  )
}
