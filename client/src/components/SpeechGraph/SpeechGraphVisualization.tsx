import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Node {
  id: number;
  word: string;
  degree: number;
  in_degree: number;
  out_degree: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: number | Node;
  target: number | Node;
  weight: number;
}

interface SpeechGraphVisualizationProps {
  nodes: Node[];
  links: Link[];
  width?: number;
  height?: number;
  animate?: boolean;
}

export const SpeechGraphVisualization: React.FC<SpeechGraphVisualizationProps> = ({
  nodes,
  links,
  width = 800,
  height = 600,
  animate = false,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [animationIndex, setAnimationIndex] = useState(0);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height] as any);

    // Add zoom behavior
    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Determine which nodes/links to show (for animation)
    const visibleNodes = animate ? nodes.slice(0, animationIndex + 1) : nodes;
    const visibleLinks = animate ? links.filter(l => {
      const sourceId = typeof l.source === 'number' ? l.source : l.source.id;
      const targetId = typeof l.target === 'number' ? l.target : l.target.id;
      return sourceId <= animationIndex && targetId <= animationIndex;
    }) : links;

    // Create force simulation
    const simulation = d3.forceSimulation(visibleNodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(visibleLinks)
        .id((d: any) => d.id)
        .distance(100)
        .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create arrow markers for directed edges
    svg.append('defs').selectAll('marker')
      .data(['end'])
      .enter().append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#999');

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(visibleLinks)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: any) => Math.sqrt(d.weight) * 2)
      .attr('marker-end', 'url(#arrowhead)');

    // Draw nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(visibleNodes)
      .enter().append('circle')
      .attr('r', (d: any) => Math.max(5, Math.sqrt(d.degree) * 5))
      .attr('fill', (d: any) => {
        // Color by degree centrality
        const scale = d3.scaleSequential(d3.interpolateRdYlGn).domain([0, 10]);
        return scale(d.degree);
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .call(d3.drag<SVGCircleElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

    // Add labels
    const label = g.append('g')
      .selectAll('text')
      .data(visibleNodes)
      .enter().append('text')
      .text((d: any) => d.word)
      .attr('font-size', 12)
      .attr('font-family', 'var(--font-sans)')
      .attr('dx', 15)
      .attr('dy', 4)
      .attr('fill', '#333')
      .style('pointer-events', 'none');

    // Add tooltips
    node.append('title')
      .text((d: any) => `${d.word}\nDegree: ${d.degree}\nIn: ${d.in_degree}, Out: ${d.out_degree}`);

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      label
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, Node, Node>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, Node, Node>) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGCircleElement, Node, Node>) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    // Animate if requested
    if (animate && animationIndex < nodes.length - 1) {
      const timer = setTimeout(() => {
        setAnimationIndex(prev => prev + 1);
      }, 200); // Add new node every 200ms

      return () => clearTimeout(timer);
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height, animate, animationIndex]);

  return (
    <div className="relative">
      <svg ref={svgRef} className="border border-gray-200 rounded-lg bg-white" />
      {animate && animationIndex < nodes.length - 1 && (
        <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-200">
          <span className="text-xs text-gray-600">
            Building graph: {animationIndex + 1} / {nodes.length} nodes
          </span>
        </div>
      )}
    </div>
  );
};
