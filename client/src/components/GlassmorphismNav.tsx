import { motion, useScroll, useTransform } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function GlassmorphismNav() {
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)
  const { scrollY } = useScroll()

  const navBg = useTransform(
    scrollY,
    [0, 50],
    ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.8)']
  )

  const borderOpacity = useTransform(
    scrollY,
    [0, 50],
    [0, 0.06]
  )

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: navBg,
        backdropFilter: isScrolled ? 'blur(16px)' : 'blur(0px)',
        WebkitBackdropFilter: isScrolled ? 'blur(16px)' : 'blur(0px)',
      }}
    >
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px bg-black"
        style={{ opacity: borderOpacity }}
      />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-24">
          {/* Logo */}
          <motion.div
            className="flex items-center"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <button
              onClick={() => navigate('/')}
              className="text-3xl font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors duration-200"
              style={{ fontFamily: 'var(--font-serif)' }}
              aria-label="Patronum Home"
            >
              Patronum
            </button>
          </motion.div>

          {/* Nav Items */}
          <motion.div
            className="flex items-center gap-8"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Login Button - Ghost Style */}
            <motion.button
              onClick={() => navigate('/auth')}
              className="px-6 py-2.5 text-[15px] font-semibold text-[var(--color-text-primary)] border-2 border-[var(--color-border-hover)] rounded-md hover:border-[var(--color-text-primary)] transition-all duration-150"
              style={{ fontFamily: 'var(--font-serif)' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              aria-label="Login"
            >
              Login
            </motion.button>
          </motion.div>
        </div>
      </div>
    </motion.nav>
  )
}
