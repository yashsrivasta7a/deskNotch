import type { AppProps } from 'next/app'
import { GeistSans } from 'geist/font/sans'

import '../styles/globals.css'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* One typeface everywhere, bundled with the app so it never depends on the
          network or on what fonts Windows happens to have. */}
      <style jsx global>{`
        html {
          font-family: ${GeistSans.style.fontFamily};
        }
      `}</style>
      <Component {...pageProps} />
    </>
  )
}

export default MyApp
