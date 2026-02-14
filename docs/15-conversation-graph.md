## 15. Conversation Graph & Component Visualization

### 13.1 Conversation Graph Data Structure

The conversation graph visualizes the flow of conversation between participants. It's stored as JSON in the `Session.conversationGraph` field.

**Graph Schema:**
```typescript
interface ConversationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
}

interface GraphNode {
  id: string;                    // speaker ID (participant, agent, moderator)
  type: 'participant' | 'agent' | 'moderator';
  label: string;                 // speaker name
  color: string;                 // avatar color
  metrics: {
    turnCount: number;           // total turns taken
    wordCount: number;           // total words spoken
    avgTurnLength: number;       // average words per turn
    topicRelevance: number;      // 0-1 score
  };
  position?: { x: number; y: number };  // for layout
}

interface GraphEdge {
  id: string;
  source: string;                // source node ID
  target: string;                // target node ID
  type: 'response' | 'prompt' | 'acknowledgment';
  weight: number;                // interaction strength (1-10)
  interactions: number;          // number of direct exchanges
  topics: string[];              // topics discussed in this interaction
}

interface GraphMetadata {
  sessionId: string;
  topic: string;
  duration: number;
  totalTurns: number;
  dominantSpeaker: string;
  conversationBalance: number;   // 0-1, how evenly distributed
}
```

### 13.2 Graph Generation Algorithm

**Generate graph after session completion:**
```typescript
// server/src/services/graphGenerator.ts

async function generateConversationGraph(sessionId: string): Promise<ConversationGraph> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { turns: true, participant: true }
  });

  const nodes = createNodes(session);
  const edges = createEdges(session.turns);
  const metadata = calculateMetadata(session, nodes, edges);

  return { nodes, edges, metadata };
}

function createNodes(session: Session): GraphNode[] {
  // Aggregate metrics per speaker
  const speakerStats = new Map();

  session.turns.forEach(turn => {
    const key = turn.speakerId || turn.speakerType;
    if (!speakerStats.has(key)) {
      speakerStats.set(key, {
        turnCount: 0,
        wordCount: 0,
        name: turn.speakerName,
        type: turn.speakerType,
        color: getColorForSpeaker(turn)
      });
    }

    const stats = speakerStats.get(key);
    stats.turnCount++;
    stats.wordCount += turn.content.split(' ').length;
  });

  return Array.from(speakerStats.entries()).map(([id, stats]) => ({
    id,
    type: stats.type,
    label: stats.name,
    color: stats.color,
    metrics: {
      turnCount: stats.turnCount,
      wordCount: stats.wordCount,
      avgTurnLength: stats.wordCount / stats.turnCount,
      topicRelevance: 0.8 // calculate via NLP
    }
  }));
}

function createEdges(turns: Turn[]): GraphEdge[] {
  const edges = new Map();

  for (let i = 1; i < turns.length; i++) {
    const prevTurn = turns[i - 1];
    const currTurn = turns[i];

    const sourceId = prevTurn.speakerId || prevTurn.speakerType;
    const targetId = currTurn.speakerId || currTurn.speakerType;

    const edgeKey = `${sourceId}->${targetId}`;

    if (!edges.has(edgeKey)) {
      edges.set(edgeKey, {
        id: edgeKey,
        source: sourceId,
        target: targetId,
        type: classifyInteractionType(prevTurn, currTurn),
        weight: 0,
        interactions: 0,
        topics: []
      });
    }

    const edge = edges.get(edgeKey);
    edge.interactions++;
    edge.weight = Math.min(10, edge.interactions);
  }

  return Array.from(edges.values());
}
```

### 13.3 Conversation Components Analysis

Track which conversation components are active during the session:

**Component Types:**
```typescript
type ConversationComponent =
  | 'memory_recall'       // Participant recalls past events
  | 'storytelling'        // Narrative sharing
  | 'question_answer'     // Q&A exchanges
  | 'emotional_expression'// Emotional content
  | 'topic_coherence'     // On-topic contributions
  | 'social_engagement'   // Social interactions
  | 'opinion_sharing'     // Sharing viewpoints
  | 'comparison'          // Comparing experiences
  | 'humor'               // Jokes, laughter
  | 'confusion'           // Off-topic, unclear;

interface ComponentActivity {
  component: ConversationComponent;
  active: boolean;
  confidence: number;      // 0-1 AI confidence
  turnNumber: number;      // when detected
  timestamp: Date;
  excerpt: string;         // relevant text
}

interface ComponentAnalysis {
  sessionId: string;
  activities: ComponentActivity[];
  summary: {
    [K in ConversationComponent]: {
      count: number;
      percentage: number;
      averageConfidence: number;
    }
  };
  timeline: ComponentTimeline[];
}

interface ComponentTimeline {
  turnNumber: number;
  timestamp: Date;
  activeComponents: ConversationComponent[];
}
```

**Component Detection via Claude:**
```typescript
// Analyze each turn for active components
async function analyzeComponents(turn: Turn, context: Turn[]): Promise<ConversationComponent[]> {
  const prompt = `
Analyze this conversation turn and identify which components are present:

TURN: "${turn.content}"

COMPONENTS TO DETECT:
- memory_recall: Speaker recalls past personal memories
- storytelling: Speaker shares a narrative story
- question_answer: Asking or answering questions
- emotional_expression: Expressing feelings, emotions
- topic_coherence: On-topic, relevant to conversation
- social_engagement: Engaging with others' statements
- opinion_sharing: Sharing personal opinions/views
- comparison: Comparing experiences with others
- humor: Jokes, laughter, lightheartedness
- confusion: Off-topic, unclear, disoriented

Return JSON array of detected components with confidence scores:
[{ "component": "memory_recall", "confidence": 0.9, "excerpt": "..." }]
`;

  const response = await claude.analyze(prompt);
  return response.components;
}
```

### 13.4 Frontend Visualization

**React Flow Graph Component:**
```typescript
// components/graphs/ConversationGraph.tsx
import ReactFlow, { Node, Edge } from 'reactflow';

export function ConversationGraph({ graphData }: { graphData: ConversationGraph }) {
  const nodes: Node[] = graphData.nodes.map(node => ({
    id: node.id,
    type: 'custom',
    position: node.position || { x: 0, y: 0 },
    data: {
      label: node.label,
      metrics: node.metrics,
      color: node.color
    }
  }));

  const edges: Edge[] = graphData.edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: edge.type === 'response',
    style: { strokeWidth: edge.weight / 2 },
    label: `${edge.interactions} exchanges`
  }));

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      nodeTypes={{ custom: CustomNode }}
    />
  );
}
```

**Component Timeline Visualization:**
```typescript
// components/graphs/ComponentTimeline.tsx
export function ComponentTimeline({ analysis }: { analysis: ComponentAnalysis }) {
  return (
    <div className="timeline">
      {analysis.timeline.map((point, i) => (
        <motion.div
          key={i}
          className="timeline-point"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <div className="time">{formatTime(point.timestamp)}</div>
          <div className="components">
            {point.activeComponents.map(comp => (
              <Badge key={comp} color={getComponentColor(comp)}>
                {comp.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
```

**Component Distribution Chart:**
```typescript
// components/graphs/ComponentChart.tsx
import { BarChart, Bar, XAxis, YAxis } from 'recharts';

export function ComponentChart({ analysis }: { analysis: ComponentAnalysis }) {
  const data = Object.entries(analysis.summary).map(([component, stats]) => ({
    name: component.replace('_', ' '),
    count: stats.count,
    percentage: stats.percentage
  }));

  return (
    <BarChart data={data}>
      <XAxis dataKey="name" />
      <YAxis />
      <Bar dataKey="count" fill="#0D9488" />
    </BarChart>
  );
}
```

---

