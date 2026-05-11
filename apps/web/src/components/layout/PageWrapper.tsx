import { motion } from 'framer-motion'
import { Topbar } from './Topbar'

interface PageWrapperProps {
  title:    string
  children: React.ReactNode
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.18, ease: 'easeIn' } },
}

export function PageWrapper({ title, children }: PageWrapperProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0, flex: 1, overflow: 'hidden' }}>
      <Topbar title={title} />
      <motion.main
        variants={pageVariants} initial="initial" animate="animate" exit="exit"
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '20px 24px 28px' }}
      >
        {children}
      </motion.main>
    </div>
  )
}
