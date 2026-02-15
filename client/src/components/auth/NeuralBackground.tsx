import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  connections: number[];
}

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  connectionIndex: number;
}

export default function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize nodes (neurons)
    const nodeCount = 30;
    const nodes: Node[] = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 1,
        connections: []
      });
    }

    // Create connections between nearby nodes
    for (let i = 0; i < nodes.length; i++) {
      const distances: { index: number; distance: number }[] = [];

      for (let j = 0; j < nodes.length; j++) {
        if (i !== j) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          distances.push({ index: j, distance });
        }
      }

      // Connect to 2-4 nearest nodes
      distances.sort((a, b) => a.distance - b.distance);
      const connectionCount = Math.floor(Math.random() * 3) + 2;
      nodes[i].connections = distances.slice(0, connectionCount).map(d => d.index);
    }

    nodesRef.current = nodes;

    // Initialize particles (neurotransmitters)
    const particles: Particle[] = [];
    const particleCount = 15;

    for (let i = 0; i < particleCount; i++) {
      const node = nodes[Math.floor(Math.random() * nodes.length)];
      const connection = node.connections[Math.floor(Math.random() * node.connections.length)];
      const targetNode = nodes[connection];

      particles.push({
        x: node.x,
        y: node.y,
        targetX: targetNode.x,
        targetY: targetNode.y,
        progress: Math.random(),
        speed: 0.003 + Math.random() * 0.002,
        connectionIndex: i % nodes.length
      });
    }

    particlesRef.current = particles;

    // Animation loop
    let time = 0;
    const animate = () => {
      time += 0.01;

      // Clear canvas with fade effect for trails
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw nodes
      nodes.forEach((node, i) => {
        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // Keep in bounds
        node.x = Math.max(0, Math.min(canvas.width, node.x));
        node.y = Math.max(0, Math.min(canvas.height, node.y));

        // Draw connections
        node.connections.forEach((connIndex) => {
          const targetNode = nodes[connIndex];
          const dx = targetNode.x - node.x;
          const dy = targetNode.y - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Only draw if not too far
          if (distance < 250) {
            const alpha = Math.max(0, 1 - distance / 250);
            const pulse = Math.sin(time + i * 0.5) * 0.3 + 0.7;

            // Draw connection line
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(targetNode.x, targetNode.y);
            ctx.strokeStyle = `rgba(140, 21, 21, ${alpha * 0.15 * pulse})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw glow
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(targetNode.x, targetNode.y);
            ctx.strokeStyle = `rgba(220, 38, 38, ${alpha * 0.08 * pulse})`;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = `rgba(220, 38, 38, ${alpha * 0.3})`;
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        });

        // Draw node with pulse
        const pulse = Math.sin(time * 2 + i * 0.3) * 0.4 + 0.6;
        const nodeRadius = node.radius * (1 + pulse * 0.3);

        // Outer glow
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, nodeRadius * 3);
        gradient.addColorStop(0, `rgba(220, 38, 38, ${0.4 * pulse})`);
        gradient.addColorStop(0.5, `rgba(220, 38, 38, ${0.1 * pulse})`);
        gradient.addColorStop(1, 'rgba(220, 38, 38, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius * 3, 0, Math.PI * 2);
        ctx.fill();

        // Node core
        ctx.fillStyle = `rgba(140, 21, 21, ${0.8 + pulse * 0.2})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Inner highlight
        ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * pulse})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Update and draw particles
      particles.forEach((particle, i) => {
        particle.progress += particle.speed;

        if (particle.progress >= 1) {
          // Reset particle to new connection
          const startNodeIndex = Math.floor(Math.random() * nodes.length);
          const startNode = nodes[startNodeIndex];

          if (startNode.connections.length > 0) {
            const connectionIndex = Math.floor(Math.random() * startNode.connections.length);
            const targetNode = nodes[startNode.connections[connectionIndex]];

            particle.x = startNode.x;
            particle.y = startNode.y;
            particle.targetX = targetNode.x;
            particle.targetY = targetNode.y;
            particle.progress = 0;
          }
        }

        // Interpolate position
        const x = particle.x + (particle.targetX - particle.x) * particle.progress;
        const y = particle.y + (particle.targetY - particle.y) * particle.progress;

        // Draw particle
        const particleSize = 2;
        const alpha = Math.sin(particle.progress * Math.PI) * 0.8 + 0.2;

        // Particle glow
        const particleGradient = ctx.createRadialGradient(x, y, 0, x, y, particleSize * 3);
        particleGradient.addColorStop(0, `rgba(220, 38, 38, ${alpha})`);
        particleGradient.addColorStop(0.5, `rgba(220, 38, 38, ${alpha * 0.4})`);
        particleGradient.addColorStop(1, 'rgba(220, 38, 38, 0)');
        ctx.fillStyle = particleGradient;
        ctx.beginPath();
        ctx.arc(x, y, particleSize * 3, 0, Math.PI * 2);
        ctx.fill();

        // Particle core
        ctx.fillStyle = `rgba(255, 100, 100, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, particleSize, 0, Math.PI * 2);
        ctx.fill();

        // Bright center
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(x, y, particleSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Canvas for neural network */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0.6 }}
      />

      {/* Gradient overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-red-50/40 via-white/60 to-pink-50/30 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />

      {/* Vignette effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(255, 255, 255, 0.4) 100%)'
        }}
      />
    </>
  );
}
