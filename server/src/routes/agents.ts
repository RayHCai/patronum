// Agent routes
import { Router } from 'express';
import {
  generateAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  getAgentMemories,
} from '../services/agent';

const router = Router();

/**
 * POST /api/agents/generate
 * Generate agents for a participant
 */
router.post('/generate', async (req, res, next) => {
  try {
    console.log(`[Agents Route] POST /api/agents/generate - body:`, req.body);
    const agents = await generateAgents(req.body);

    console.log(`[Agents Route] Successfully generated ${agents.length} agents`);
    res.status(201).json({
      success: true,
      data: agents,
    });
  } catch (error) {
    console.error('[Agents Route] Error in POST /api/agents/generate:', error);
    next(error);
  }
});

/**
 * GET /api/agents/:id
 * Get agent by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`[Agents Route] GET /api/agents/${id}`);
    const agent = await getAgentById(id);

    console.log(`[Agents Route] Agent retrieved: ${agent.name}`);
    res.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    console.error(`[Agents Route] Error in GET /api/agents/${req.params.id}:`, error);
    next(error);
  }
});

/**
 * PUT /api/agents/:id
 * Update agent
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`[Agents Route] PUT /api/agents/${id} - body:`, req.body);
    const agent = await updateAgent(id, req.body);

    console.log(`[Agents Route] Agent updated: ${agent.name}`);
    res.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    console.error(`[Agents Route] Error in PUT /api/agents/${req.params.id}:`, error);
    next(error);
  }
});

/**
 * DELETE /api/agents/:id
 * Delete agent
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`[Agents Route] DELETE /api/agents/${id}`);
    await deleteAgent(id);

    console.log(`[Agents Route] Agent deleted successfully: ${id}`);
    res.json({
      success: true,
      message: 'Agent deleted successfully',
    });
  } catch (error) {
    console.error(`[Agents Route] Error in DELETE /api/agents/${req.params.id}:`, error);
    next(error);
  }
});

/**
 * GET /api/agents/:id/memories
 * Get all memories for an agent
 */
router.get('/:id/memories', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sessionId } = req.query;
    console.log(`[Agents Route] GET /api/agents/${id}/memories - sessionId: ${sessionId || 'all'}`);

    const memories = await getAgentMemories(id, sessionId as string);

    console.log(`[Agents Route] Retrieved ${memories.length} memories for agent ${id}`);
    res.json({
      success: true,
      data: memories,
    });
  } catch (error) {
    console.error(`[Agents Route] Error in GET /api/agents/${req.params.id}/memories:`, error);
    next(error);
  }
});

export default router;
