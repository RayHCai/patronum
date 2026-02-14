import { motion } from 'framer-motion'

export default function AbstractTreeSVG() {
  return (
    <motion.div
      className="relative pointer-events-none w-full h-full max-w-[1400px] mx-auto scale-125"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -12, 0]
      }}
      transition={{
        opacity: { duration: 1.2, delay: 0.8 },
        scale: { duration: 1.2, delay: 0.8 },
        y: {
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.5
        }
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 600 700"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="opacity-80 h-screen"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Organic tree structure - inspired by exactly.ai */}
        <defs>
          <linearGradient id="treeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8C1515" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#8C1515" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#A01E1E" stopOpacity="0.15" />
          </linearGradient>

          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Main trunk */}
        <motion.path
          d="M 300 650 Q 295 600, 290 550 Q 285 500, 288 450 Q 290 400, 295 350"
          stroke="url(#treeGradient)"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
          filter="url(#glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 1, ease: "easeOut" }}
        />

        {/* Left primary branch */}
        <motion.path
          d="M 295 450 Q 250 430, 200 420 Q 150 410, 120 425"
          stroke="url(#treeGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          filter="url(#glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 1.3, ease: "easeOut" }}
        />

        {/* Right primary branch */}
        <motion.path
          d="M 295 430 Q 340 410, 390 405 Q 440 400, 470 415"
          stroke="url(#treeGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          filter="url(#glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 1.4, ease: "easeOut" }}
        />

        {/* Left secondary branches */}
        <motion.path
          d="M 200 420 Q 180 390, 160 360 Q 140 330, 135 300"
          stroke="url(#treeGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 1.6, ease: "easeOut" }}
        />

        <motion.path
          d="M 180 400 Q 160 370, 145 340 Q 130 310, 128 280"
          stroke="url(#treeGradient)"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 1.7, ease: "easeOut" }}
        />

        {/* Right secondary branches */}
        <motion.path
          d="M 390 405 Q 410 375, 425 345 Q 440 315, 445 285"
          stroke="url(#treeGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 1.6, ease: "easeOut" }}
        />

        <motion.path
          d="M 410 390 Q 435 360, 455 330 Q 475 300, 482 270"
          stroke="url(#treeGradient)"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 1.7, ease: "easeOut" }}
        />

        {/* Top branches */}
        <motion.path
          d="M 295 350 Q 280 320, 265 290 Q 250 260, 245 230"
          stroke="url(#treeGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.1, delay: 1.5, ease: "easeOut" }}
        />

        <motion.path
          d="M 295 340 Q 310 310, 325 280 Q 340 250, 348 220"
          stroke="url(#treeGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.1, delay: 1.5, ease: "easeOut" }}
        />

        {/* Delicate tertiary branches */}
        <motion.path
          d="M 265 290 Q 240 270, 220 250"
          stroke="url(#treeGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.9, ease: "easeOut" }}
        />

        <motion.path
          d="M 325 280 Q 350 260, 370 240"
          stroke="url(#treeGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.9, ease: "easeOut" }}
        />

        {/* Organic leaf clusters - circles with varying sizes */}
        <motion.circle
          cx="220"
          cy="250"
          r="12"
          fill="#8C1515"
          opacity="0.15"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.15 }}
          transition={{ duration: 0.6, delay: 2.1, ease: "easeOut" }}
        />

        <motion.circle
          cx="370"
          cy="240"
          r="14"
          fill="#8C1515"
          opacity="0.15"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.15 }}
          transition={{ duration: 0.6, delay: 2.2, ease: "easeOut" }}
        />

        <motion.circle
          cx="245"
          cy="230"
          r="10"
          fill="#8C1515"
          opacity="0.15"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.15 }}
          transition={{ duration: 0.6, delay: 2.3, ease: "easeOut" }}
        />

        <motion.circle
          cx="348"
          cy="220"
          r="11"
          fill="#8C1515"
          opacity="0.15"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.15 }}
          transition={{ duration: 0.6, delay: 2.4, ease: "easeOut" }}
        />

        <motion.circle
          cx="135"
          cy="300"
          r="9"
          fill="#8C1515"
          opacity="0.15"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.15 }}
          transition={{ duration: 0.6, delay: 2.2, ease: "easeOut" }}
        />

        <motion.circle
          cx="445"
          cy="285"
          r="10"
          fill="#8C1515"
          opacity="0.15"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.15 }}
          transition={{ duration: 0.6, delay: 2.3, ease: "easeOut" }}
        />

        <motion.circle
          cx="128"
          cy="280"
          r="8"
          fill="#8C1515"
          opacity="0.15"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.15 }}
          transition={{ duration: 0.6, delay: 2.4, ease: "easeOut" }}
        />

        <motion.circle
          cx="482"
          cy="270"
          r="9"
          fill="#8C1515"
          opacity="0.15"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.15 }}
          transition={{ duration: 0.6, delay: 2.5, ease: "easeOut" }}
        />
      </svg>
    </motion.div>
  )
}
