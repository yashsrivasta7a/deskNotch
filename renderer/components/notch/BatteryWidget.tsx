import React from 'react'

interface BatteryWidgetProps {
  percentage?: number
  isCharging?: boolean
}

export const BatteryWidget: React.FC<BatteryWidgetProps> = ({ percentage = 85, isCharging = false }) => {
  return (
    <div className="flex items-center space-x-1" title={`Battery: ${percentage}%`}>
      <div className="relative w-[16px] h-[8.5px] border border-gray-400/80 rounded-[2.5px] p-[1px] flex items-center">
        <div
          className="h-full bg-emerald-400 rounded-[1px] transition-all duration-300"
          style={{ width: `${Math.max(5, Math.min(100, percentage))}%` }}
        />
        {/* Battery Terminal Nub */}
        <div className="w-[1px] h-[3.5px] bg-gray-400/80 rounded-r-[1px] -right-[2.5px] absolute" />
      </div>
      <span className="text-[9.5px] font-mono text-gray-400">
        {percentage}%{isCharging ? '⚡' : ''}
      </span>
    </div>
  )
}
