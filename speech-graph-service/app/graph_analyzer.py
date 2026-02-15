"""
Speech Graph Analysis
Based on Mota et al. (2012) and Botezatu et al. (2023)
Implements 30-word sliding window with 3-word steps
"""

import networkx as nx
from typing import List, Dict, Tuple
import re


class SpeechGraphAnalyzer:
    """
    Implements Speech Graph Analysis based on Mota et al. (2012) and Botezatu et al. (2023).
    Uses 30-word sliding window with 3-word steps.
    """

    def __init__(self, window_size: int = 30, step_size: int = 3):
        self.window_size = window_size
        self.step_size = step_size

    def preprocess_text(self, text: str) -> List[str]:
        """Clean and tokenize text."""
        # Convert to lowercase
        text = text.lower()
        # Remove punctuation except apostrophes in contractions
        text = re.sub(r"[^\w\s']", '', text)
        # Tokenize
        words = text.split()
        # Remove very short words and numbers
        words = [w for w in words if len(w) > 1 and not w.isdigit()]
        return words

    def build_speech_graph(self, words: List[str]) -> nx.DiGraph:
        """
        Build directed graph where:
        - Nodes = unique words
        - Edges = temporal adjacency (word A followed by word B)
        - Edge weights = frequency of co-occurrence
        """
        G = nx.DiGraph()

        # Add edges based on word sequence
        for i in range(len(words) - 1):
            source = words[i]
            target = words[i + 1]

            if G.has_edge(source, target):
                G[source][target]['weight'] += 1
            else:
                G.add_edge(source, target, weight=1)

        return G

    def sliding_window_analysis(self, text: str) -> List[Dict]:
        """
        Apply sliding window analysis as per Botezatu et al. (2023).
        Window size: 30 words, Step size: 3 words
        """
        words = self.preprocess_text(text)

        if len(words) < self.window_size:
            # If text is too short, analyze as single window
            return [self.analyze_window(words)]

        windows = []
        for i in range(0, len(words) - self.window_size + 1, self.step_size):
            window_words = words[i:i + self.window_size]
            window_metrics = self.analyze_window(window_words)
            window_metrics['window_start'] = i
            window_metrics['window_end'] = i + self.window_size
            windows.append(window_metrics)

        return windows

    def analyze_window(self, words: List[str]) -> Dict:
        """Analyze a single window of words."""
        if not words:
            return {
                'nodes': 0,
                'edges': 0,
                'lsc': 0,
                'lcc': 0,
                'loops': {'L1': 0, 'L2': 0, 'L3': 0},
                'parallel_edges': 0,
                'density': 0,
                'avg_degree': 0,
            }

        G = self.build_speech_graph(words)

        return {
            'nodes': G.number_of_nodes(),
            'edges': G.number_of_edges(),
            'lsc': self.calculate_lsc(G),
            'lcc': self.calculate_lcc(G),
            'loops': self.count_loops(G),
            'parallel_edges': self.count_parallel_edges(G),
            'density': nx.density(G) if G.number_of_nodes() > 0 else 0,
            'avg_degree': sum(dict(G.degree()).values()) / G.number_of_nodes() if G.number_of_nodes() > 0 else 0,
        }

    def calculate_lsc(self, G: nx.DiGraph) -> int:
        """
        Largest Strongly Connected Component (LSC).
        Key metric for dementia detection - captures long-range word recurrence.
        Botezatu et al.: LSC correlates with cognitive function and verbal fluency.
        """
        if G.number_of_nodes() == 0:
            return 0

        strongly_connected = list(nx.strongly_connected_components(G))
        if not strongly_connected:
            return 0

        return len(max(strongly_connected, key=len))

    def calculate_lcc(self, G: nx.DiGraph) -> int:
        """
        Largest Connected Component (LCC).
        Measures overall connectedness of speech graph.
        """
        if G.number_of_nodes() == 0:
            return 0

        # Convert to undirected for LCC
        G_undirected = G.to_undirected()
        connected = list(nx.connected_components(G_undirected))

        if not connected:
            return 0

        return len(max(connected, key=len))

    def count_loops(self, G: nx.DiGraph) -> Dict[str, int]:
        """
        Count loops of different lengths (L1, L2, L3).
        Higher loop counts indicate repetitive speech patterns common in dementia.
        """
        loops = {
            'L1': 0,  # Self-loops (same word repeated)
            'L2': 0,  # Two-word cycles (A->B->A)
            'L3': 0,  # Three-word cycles (A->B->C->A)
        }

        # L1: Self-loops
        loops['L1'] = nx.number_of_selfloops(G)

        # L2 and L3: Use cycle detection
        try:
            cycles = list(nx.simple_cycles(G))
            for cycle in cycles:
                cycle_length = len(cycle)
                if cycle_length == 2:
                    loops['L2'] += 1
                elif cycle_length == 3:
                    loops['L3'] += 1
        except:
            pass  # Graph too large for cycle detection

        return loops

    def count_parallel_edges(self, G: nx.DiGraph) -> int:
        """
        Count parallel edges (multiple paths between same nodes).
        Indicates word repetition patterns.
        """
        parallel = 0
        for u, v, data in G.edges(data=True):
            if data.get('weight', 1) > 1:
                parallel += 1

        return parallel

    def generate_visualization_data(self, words: List[str]) -> Dict:
        """
        Generate graph structure for D3.js visualization.
        Returns nodes and links (edges) in format compatible with D3.
        """
        G = self.build_speech_graph(words)

        # Map node names to indices for D3
        node_to_index = {node: idx for idx, node in enumerate(G.nodes())}

        nodes = [
            {
                'id': idx,
                'word': node,
                'degree': G.degree(node),
                'in_degree': G.in_degree(node),
                'out_degree': G.out_degree(node),
            }
            for node, idx in node_to_index.items()
        ]

        links = [
            {
                'source': node_to_index[u],
                'target': node_to_index[v],
                'weight': data.get('weight', 1),
            }
            for u, v, data in G.edges(data=True)
        ]

        return {
            'nodes': nodes,
            'links': links,
        }

    def analyze_full_transcript(self, text: str) -> Dict:
        """
        Complete analysis of a full conversation transcript.
        Returns aggregated metrics and visualization data.
        """
        words = self.preprocess_text(text)

        if not words:
            return {
                'full_metrics': {
                    'nodes': 0,
                    'edges': 0,
                    'lsc': 0,
                    'lcc': 0,
                    'loops': {'L1': 0, 'L2': 0, 'L3': 0},
                    'parallel_edges': 0,
                    'density': 0,
                    'avg_degree': 0,
                },
                'window_metrics': [],
                'aggregated_metrics': {},
                'visualization': {'nodes': [], 'links': []},
                'word_count': 0,
                'unique_words': 0,
                'lexical_diversity': 0,
            }

        # Full graph analysis
        full_graph = self.build_speech_graph(words)
        full_metrics = self.analyze_window(words)

        # Sliding window analysis (if text is long enough)
        window_metrics = self.sliding_window_analysis(text) if len(words) >= self.window_size else []

        # Aggregate window statistics
        avg_metrics = self._aggregate_window_metrics(window_metrics)

        # Visualization data
        viz_data = self.generate_visualization_data(words)

        return {
            'full_metrics': full_metrics,
            'window_metrics': window_metrics,
            'aggregated_metrics': avg_metrics,
            'visualization': viz_data,
            'word_count': len(words),
            'unique_words': full_graph.number_of_nodes(),
            'lexical_diversity': full_graph.number_of_nodes() / len(words) if len(words) > 0 else 0,
        }

    def _aggregate_window_metrics(self, windows: List[Dict]) -> Dict:
        """Calculate average metrics across all windows."""
        if not windows:
            return {}

        keys = ['nodes', 'edges', 'lsc', 'lcc', 'density', 'avg_degree']
        aggregated = {}

        for key in keys:
            values = [w[key] for w in windows if key in w]
            aggregated[f'avg_{key}'] = sum(values) / len(values) if values else 0
            aggregated[f'min_{key}'] = min(values) if values else 0
            aggregated[f'max_{key}'] = max(values) if values else 0

        return aggregated
