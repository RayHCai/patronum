import { motion } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'

interface Neuron {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
}

export default function NeuralNetworkBackground() {
  const [neurons, setNeurons] = useState<Neuron[]>([])
  const connectionDistance = 300 // Increased for more connections
  const neuronCount = 20 // Slightly more neurons for better connectivity
  const animationRef = useRef<number>()

  useEffect(() => {
    // Initialize neurons with random positions and velocities
    const initialNeurons: Neuron[] = Array.from({ length: neuronCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.012, // Even slower for smoother movement
      vy: (Math.random() - 0.5) * 0.012,
      size: Math.random() * 2 + 2.5
    }))
    setNeurons(initialNeurons)

    // Animate neurons at 30fps for smoother React performance
    let lastTime = Date.now()
    const fps = 30
    const frameDuration = 1000 / fps

    const animate = () => {
      const now = Date.now()
      const delta = now - lastTime

      // Only update if enough time has passed (throttle to 30fps)
      if (delta >= frameDuration) {
        lastTime = now - (delta % frameDuration)

        setNeurons(prev => prev.map(neuron => {
          let { x, y, vx, vy } = neuron

          // Update position with delta time
          const movement = delta / 16.67
          x += vx * movement
          y += vy * movement

          // Smooth bounce with damping
          if (x <= 5 || x >= 95) {
            vx *= -0.95
            x = x <= 5 ? 5 : 95
          }
          if (y <= 5 || y >= 95) {
            vy *= -0.95
            y = y <= 5 ? 5 : 95
          }

          // Keep in bounds
          x = Math.max(5, Math.min(95, x))
          y = Math.max(5, Math.min(95, y))

          return { ...neuron, x, y, vx, vy }
        }))
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // Calculate connections between nearby neurons
  const connections = neurons.flatMap((neuron1, i) =>
    neurons.slice(i + 1).map(neuron2 => {
      const dx = neuron2.x - neuron1.x
      const dy = neuron2.y - neuron1.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const maxDistance = connectionDistance / 10

      if (distance < maxDistance) {
        // Smoother opacity falloff for more elegant connections
        const opacity = Math.pow(1 - distance / maxDistance, 1.5)
        return {
          x1: neuron1.x,
          y1: neuron1.y,
          x2: neuron2.x,
          y2: neuron2.y,
          opacity
        }
      }
      return null
    }).filter(Boolean)
  ).filter((conn): conn is NonNullable<typeof conn> => conn !== null)

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          willChange: 'transform',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden'
        }}
      >
        <defs>
          {/* Glow filter for neurons */}
          <filter id="neuronGlow">
            <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Gradient for synapses - more vibrant */}
          <linearGradient id="synapseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8C1515" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#9C1717" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#A01E1E" stopOpacity="0.3" />
          </linearGradient>

          {/* Pulsing gradient for active connections */}
          <linearGradient id="synapseGradientActive" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B01E1E" stopOpacity="0.8">
              <animate attributeName="stop-opacity" values="0.8;0.6;0.8" dur="3s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
            </stop>
            <stop offset="100%" stopColor="#8C1515" stopOpacity="0.4">
              <animate attributeName="stop-opacity" values="0.4;0.25;0.4" dur="3s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
            </stop>
          </linearGradient>
        </defs>

        {/* Render connections (synapses) */}
        {connections.map((conn, i) => {
          const isStrongConnection = conn.opacity > 0.7
          return (
            <g key={`connection-${i}`}>
              {/* Base connection line */}
              <motion.line
                x1={`${conn.x1}%`}
                y1={`${conn.y1}%`}
                x2={`${conn.x2}%`}
                y2={`${conn.y2}%`}
                stroke={isStrongConnection ? "url(#synapseGradientActive)" : "url(#synapseGradient)"}
                strokeWidth={isStrongConnection ? "0.25" : "0.18"}
                initial={{ opacity: 0 }}
                animate={{ opacity: conn.opacity * 0.7 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                strokeLinecap="round"
              />
              {/* Glow effect for stronger connections */}
              {isStrongConnection && (
                <motion.line
                  x1={`${conn.x1}%`}
                  y1={`${conn.y1}%`}
                  x2={`${conn.x2}%`}
                  y2={`${conn.y2}%`}
                  stroke="#8C1515"
                  strokeWidth="0.4"
                  opacity={conn.opacity * 0.2}
                  filter="url(#neuronGlow)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{
                    pathLength: 1,
                    opacity: [conn.opacity * 0.2, conn.opacity * 0.35, conn.opacity * 0.2]
                  }}
                  transition={{
                    pathLength: {
                      duration: 1.2,
                      ease: [0.4, 0, 0.2, 1]
                    },
                    opacity: {
                      duration: 3.5,
                      repeat: Infinity,
                      ease: [0.4, 0, 0.6, 1],
                      repeatType: "reverse"
                    }
                  }}
                  strokeLinecap="round"
                />
              )}
            </g>
          )
        })}

        {/* Render neurons */}
        {neurons.map((neuron) => (
          <motion.g key={neuron.id}>
            {/* Outer glow circle */}
            <motion.circle
              cx={`${neuron.x}%`}
              cy={`${neuron.y}%`}
              r={neuron.size * 0.15}
              fill="#8C1515"
              opacity="0.15"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.15, 0.25, 0.15]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: [0.4, 0, 0.6, 1],
                repeatType: "reverse",
                delay: neuron.id * 0.1
              }}
            />

            {/* Main neuron */}
            <motion.circle
              cx={`${neuron.x}%`}
              cy={`${neuron.y}%`}
              r={neuron.size * 0.08}
              fill="#8C1515"
              opacity="0.75"
              filter="url(#neuronGlow)"
              animate={{
                opacity: [0.75, 0.95, 0.75]
              }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: [0.4, 0, 0.6, 1],
                repeatType: "reverse",
                delay: neuron.id * 0.15
              }}
            />
          </motion.g>
        ))}
      </svg>

      {/* Vignette overlay for depth */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-white/80" />
    </div>
  )
}
