import React, { useState } from 'react'
import { useClock } from '../../hooks/useClock'

export const ClockWidget: React.FC = () => {
  const { time, date } = useClock()
  const [showDate, setShowDate] = useState(false)

  return (
    <div
      onClick={() => setShowDate(!showDate)}
      className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors cursor-pointer"
      title="Click to toggle Date/Time"
    >
      <span className="text-[10.5px] font-mono tracking-tight font-medium">
        {showDate ? date : time || '09:41'}
      </span>
    </div>
  )
}
