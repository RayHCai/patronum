import { motion } from 'framer-motion'
import GlassmorphismNav from '../components/GlassmorphismNav'
import AbstractTreeSVG from '../components/AbstractTreeSVG'

// Staggered animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15
    }
  }
}

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 12,
    filter: 'blur(6px)'
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.45,
      ease: [0.34, 1.56, 0.64, 1]
    }
  }
}

export default function Landing() {
  return (
    <div className="h-screen bg-[var(--color-bg-primary)] relative overflow-hidden">
      {/* Glassmorphism Navigation */}
      <GlassmorphismNav />

      {/* Soft gradient background - exactly.ai inspired */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 via-white to-red-50/20 pointer-events-none" />

      {/* Main Hero Section */}
      <motion.main
        className="relative z-10 h-full flex items-center justify-center px-6 sm:px-8 lg:px-12 pt-20"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="max-w-5xl w-full mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-16 lg:gap-24">
            {/* Left Column - Content */}
            <div className="space-y-10 text-center lg:text-left">
              {/* Heading */}
              <motion.h1
                className="text-6xl sm:text-7xl font-semibold leading-[0.95] tracking-tight"
                style={{
                  fontFamily: 'var(--font-serif)',
                  background: 'linear-gradient(135deg, var(--color-text-primary) 0%, #4B5563 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
                variants={itemVariants}
              >
                Compassionate
                <br />
                conversations
              </motion.h1>

              {/* Subtext */}
              <motion.p
                className="text-xl sm:text-2xl leading-relaxed text-[var(--color-text-secondary)] max-w-2xl mx-auto lg:mx-0"
                style={{ fontFamily: 'var(--font-sans)' }}
                variants={itemVariants}
              >
                Empowering meaningful connections through AI-assisted group conversations designed for dementia care.
              </motion.p>

            </div>

            {/* Right Column - Abstract Tree Illustration */}
            <div className="relative flex items-center justify-center">
              <AbstractTreeSVG />
            </div>
          </div>
        </div>
      </motion.main>

    </div>
  )
}
