import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { 
  listTeams, 
  createTeam, 
  addMember,
  getTeamMembers,
  joinTeamByCode,
  getAvailableTeams
} from '../controllers/teams.controller.js';

const router = Router();

// ✅ CHANGE: Apply requireAuth to ALL team routes
router.use(requireAuth);

/**
 * ✅ CHANGE 1: GET /api/teams - Updated to return team_code and memberCount
 */
router.get('/', listTeams);

/**
 * ✅ CHANGE 6: GET /api/teams/available-to-join - Get teams user can join
 * MUST be before /:teamId route to avoid conflict
 */
router.get('/available-to-join', getAvailableTeams);

/**
 * ✅ CHANGE 2: POST /api/teams - Create new team with team_code
 */
router.post('/', createTeam);

/**
 * ✅ CHANGE 5: POST /api/teams/join-by-code - Join team by code
 */
router.post('/join-by-code', joinTeamByCode);

/**
 * ✅ CHANGE 4: GET /api/teams/:teamId/members - Get team members (NEW)
 */
router.get('/:teamId/members', getTeamMembers);

/**
 * ✅ CHANGE 3: POST /api/teams/:teamId/members - Add member with role enforcement
 */
router.post('/:teamId/members', addMember);

export default router;
