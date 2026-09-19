import React from 'react'
import Head from 'next/head'
import { NotchChassis } from '../components/notch/NotchChassis'
import { ClockWidget } from '../components/notch/ClockWidget'
import { CameraCluster } from '../components/notch/CameraCluster'
import { AudioVisualizer } from '../components/notch/AudioVisualizer'
import { BatteryWidget } from '../components/notch/BatteryWidget'

export default function HomePage() {
  return (
    <React.Fragment>
      <Head>
        <title>deskNotch</title>
      </Head>

      <NotchChassis>
        {/* Left Wing: Clock & Date */}
        <ClockWidget />

        {/* Center: Camera & Sensors */}
        <CameraCluster />

        {/* Right Wing: Audio & Battery */}
        <div className="flex items-center space-x-2 text-gray-300">
          <AudioVisualizer />
          <BatteryWidget percentage={85} />
        </div>
      </NotchChassis>
    </React.Fragment>
  )
}
