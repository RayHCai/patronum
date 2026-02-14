import { Router } from 'express';
import { AuthService } from '../services/auth';
import { ValidationError } from '../types';

const router = Router();

/**
 * POST /api/auth/admin/signup
 * Admin signup
 */
router.post('/admin/signup', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const admin = await AuthService.adminSignup(email, password);

    res.status(201).json({
      success: true,
      data: {
        user: admin,
        userType: 'admin',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/admin/login
 * Admin login
 */
router.post('/admin/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const admin = await AuthService.adminLogin(email, password);

    res.json({
      success: true,
      data: {
        user: admin,
        userType: 'admin',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/patient/verify
 * Verify patient access link
 */
router.post('/patient/verify', async (req, res, next) => {
  try {
    const { patientId } = req.body;

    const { patientUser, participant } = await AuthService.verifyPatientId(patientId);

    res.json({
      success: true,
      data: {
        user: patientUser,
        participant,
        userType: 'patient',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/patient/verify/:patientId
 * Verify patient access link via URL parameter
 */
router.get('/patient/verify/:patientId', async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const { patientUser, participant } = await AuthService.verifyPatientId(patientId);

    res.json({
      success: true,
      data: {
        user: patientUser,
        participant,
        userType: 'patient',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
