## 11. Animation & Transition Implementation Guide — Aura Health Spring Physics

**Core Animation Philosophy:** All transitions use spring physics for natural, organic movement. Target: stiffness 400, damping 30.

### 10.1 Page Transitions with Framer Motion

**Spring Configuration (Global Standard):**
```typescript
// lib/animations.ts
export const SPRING_CONFIG = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
  mass: 1
};

export const SPRING_SOFT = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
  mass: 1
};

export const SPRING_STIFF = {
  type: 'spring',
  stiffness: 500,
  damping: 35,
  mass: 1
};
```

**PageTransition Component:**
```typescript
// components/layout/PageTransition.tsx
import { motion } from 'framer-motion';
import { SPRING_CONFIG } from '@/lib/animations';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export const PageTransition = ({ children }) => (
  <motion.div
    initial="initial"
    animate="animate"
    exit="exit"
    variants={pageVariants}
    transition={SPRING_CONFIG}
  >
    {children}
  </motion.div>
);
```

**Router Setup with AnimatePresence:**
```typescript
// App.tsx
import { AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* routes */}
      </Routes>
    </AnimatePresence>
  );
}
```

### 10.2 Staggered Load — Cards Slide Up & Fade In Sequentially

**Aura Health Stagger Pattern:**
Cards slide up from below while fading in with 50ms sequential delay.

```typescript
import { SPRING_CONFIG } from '@/lib/animations';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, // 50ms delay between items
      delayChildren: 0.1     // Initial delay before stagger
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRING_CONFIG
  }
};

// Usage in Bento Grid Dashboard
<motion.div
  className="grid grid-cols-12 gap-4"
  variants={containerVariants}
  initial="hidden"
  animate="visible"
>
  {metricCards.map((card, i) => (
    <motion.div
      key={card.id}
      variants={itemVariants}
      className="col-span-3"
    >
      <MetricCard {...card} />
    </motion.div>
  ))}
</motion.div>
```

**Hover States — Subtle Lift + Border Color Shift:**
```typescript
// Card hover with spring physics
<motion.div
  className="metric-card border border-zinc-200/50"
  whileHover={{
    y: -2,                          // Subtle lift
    borderColor: 'rgb(6, 95, 70)',  // Shift to emerald-800
    transition: SPRING_CONFIG
  }}
  whileTap={{
    scale: 0.99,
    transition: SPRING_STIFF
  }}
>
  {/* Card content */}
</motion.div>

// Alternative: Hover with shadow increase
<motion.div
  whileHover={{
    y: -2,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    transition: SPRING_CONFIG
  }}
>
  {/* Card content */}
</motion.div>
```

### 10.3 Voice & Audio Animations

**Pulsing Voice Indicator:**
```typescript
// components/conversation/VoiceAnimation.tsx
const pulseVariants = {
  pulse: {
    scale: [1, 1.1, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

<motion.div
  className="voice-indicator"
  variants={pulseVariants}
  animate={isActive ? 'pulse' : 'idle'}
/>
```

**Waveform Animation:**
```typescript
const waveformVariants = {
  idle: { height: 4 },
  active: {
    height: [4, 20, 8, 24, 4],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};
```

### 10.4 Microinteractions

**Button Press Feedback:**
```typescript
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
>
  Click me
</motion.button>
```

**Layout Transitions — Dashboard Tab Morphing:**

Content should "morph" smoothly when switching between dashboard tabs using Framer Motion's layout animations.

```typescript
import { AnimatePresence, motion } from 'framer-motion';
import { SPRING_CONFIG } from '@/lib/animations';

// Tab content morphs using layout prop
const DashboardTabs = ({ activeTab }: { activeTab: string }) => {
  return (
    <div className="dashboard-tabs">
      {/* Tab headers */}
      <div className="tab-header flex gap-2 border-b border-zinc-200">
        {tabs.map(tab => (
          <motion.button
            key={tab.id}
            className={`tab-button relative px-4 py-2 text-sm font-medium ${
              activeTab === tab.id ? 'text-emerald-800' : 'text-zinc-600'
            }`}
            onClick={() => setActiveTab(tab.id)}
            whileHover={{ color: 'rgb(6, 95, 70)' }}
            transition={SPRING_CONFIG}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-800"
                layoutId="tab-indicator"
                transition={SPRING_CONFIG}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Tab content with morphing */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={SPRING_CONFIG}
          className="tab-content"
        >
          {getTabContent(activeTab)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Shared layout animations for dashboard cards
const DashboardCard = ({ data }) => (
  <motion.div
    layout // Enables automatic morphing on position/size changes
    className="dashboard-card"
    transition={SPRING_CONFIG}
  >
    {data.content}
  </motion.div>
);

// Example: Expanding card detail view
const [isExpanded, setIsExpanded] = useState(false);

<motion.div
  layout
  className="metric-card"
  onClick={() => setIsExpanded(!isExpanded)}
  transition={SPRING_CONFIG}
>
  <motion.h3 layout="position">Sleep Quality</motion.h3>
  <motion.div layout="position" className="metric-value">
    8.2 hrs
  </motion.div>

  <AnimatePresence>
    {isExpanded && (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={SPRING_CONFIG}
      >
        {/* Expanded details */}
      </motion.div>
    )}
  </AnimatePresence>
</motion.div>
```

**Layout Animation Best Practices:**
- Use `layout` prop for elements that change position or size
- Use `layout="position"` for position-only changes (more performant)
- Use `layout="size"` for size-only changes
- Combine with `layoutId` for shared element transitions across components
- Always apply spring physics for smooth, natural morphing

### 10.5 Chart Animations

**Recharts with Framer Motion:**
```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.2 }}
>
  <LineChart data={data}>
    <Line
      animationDuration={800}
      animationEasing="ease-out"
    />
  </LineChart>
</motion.div>
```

### 10.6 Loading States

**Smooth Loading Spinner:**
```typescript
// components/ui/LoadingSpinner.tsx
const spinnerVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear'
    }
  }
};

<motion.div
  className="spinner"
  variants={spinnerVariants}
  animate="animate"
/>
```

### 10.7 Accessibility Considerations

**Respect prefers-reduced-motion:**
```typescript
import { useReducedMotion } from 'framer-motion';

function Component() {
  const shouldReduceMotion = useReducedMotion();

  const variants = shouldReduceMotion ? {
    // Simpler, instant transitions
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  } : {
    // Full animations
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return <motion.div variants={variants} />;
}
```

**Global CSS for reduced motion:**
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 10.8 Performance Optimization

**Use transform and opacity for animations:**
- ✅ Use: `transform`, `opacity`, `scale`, `rotate`, `translateX/Y`
- ❌ Avoid: `width`, `height`, `top`, `left`, `margin`, `padding`

**Layout animations for natural movement:**
```typescript
<motion.div layout transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
  Content that changes size/position
</motion.div>
```

**Lazy loading with intersection observer:**
```typescript
const controls = useAnimation();
const [ref, inView] = useInView();

useEffect(() => {
  if (inView) {
    controls.start('visible');
  }
}, [controls, inView]);

<motion.div
  ref={ref}
  animate={controls}
  initial="hidden"
  variants={variants}
/>
```

---

## 11.9 Aura Health Design Implementation Checklist

**Critical Design Requirements — Must-Have Implementation:**

### Visual Style Checklist
- [ ] All cards use 1px inner borders: `border border-zinc-200/50`
- [ ] All shadows follow soft pattern: `shadow-[0_1px_3px_rgba(0,0,0,0.1)]`
- [ ] Backdrop blur on modals/overlays: `backdrop-blur-md`
- [ ] 12-column grid layout with `gap-4` (16px)
- [ ] Zinc-50 base background throughout
- [ ] Deep Emerald (#065f46) for primary accents
- [ ] Rose tint for alerts/warnings

### Typography Checklist
- [ ] Inter or Geist as primary font stack
- [ ] Headings use `tracking-tight`
- [ ] Secondary metadata uses `text-xs font-medium`
- [ ] No mixing font families (strict sans-serif only)

### Animation Checklist
- [ ] All animations use spring physics: `stiffness: 400, damping: 30`
- [ ] Staggered card load: `staggerChildren: 0.05`
- [ ] Hover states lift cards: `y: -2`
- [ ] Border color shifts to emerald on hover
- [ ] Tab transitions use `layoutId` for morphing effect
- [ ] Layout animations use `layout` prop with spring physics
- [ ] Respect `prefers-reduced-motion`

### Component Checklist
- [ ] Vitals Command Bar: Cmd+K shortcut, fuzzy search
- [ ] Health-Metric Bento Cards: Clean SVG sparklines (not bulky charts)
- [ ] Consultation List: Linear-style rows, hover-reveal actions
- [ ] Patient Timeline: Thin vertical lines, muted dots
- [ ] All lists use stagger animations
- [ ] Join Call buttons appear only on hover

### Interaction Patterns
- [ ] Cards lift 2px on hover with spring physics
- [ ] Buttons scale to 0.99 on tap
- [ ] Tab indicators slide smoothly with `layoutId`
- [ ] Expanded cards use `layout` prop for morphing
- [ ] Command bar opens with backdrop blur
- [ ] All transitions feel organic (no linear easing)

### Color Usage
- [ ] Primary actions: Emerald-800 (#065f46)
- [ ] Positive metrics: Emerald-600
- [ ] Alerts: Rose-700 (#BE123C)
- [ ] Neutral text: Zinc-600
- [ ] Borders: Zinc-200/50 (semi-transparent)
- [ ] Backgrounds: White cards on Zinc-50 base

### Performance
- [ ] Use transform & opacity for animations (not width/height)
- [ ] Lazy load dashboard cards with intersection observer
- [ ] Code-split heavy chart libraries
- [ ] Optimize SVG sparklines (inline, not external)

---

