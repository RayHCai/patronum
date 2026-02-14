import bcrypt from 'bcryptjs';
import { prisma } from '../prisma/client';
import { AuthenticationError, ValidationError } from '../types';

export class AuthService {
  /**
   * Admin Signup
   */
  static async adminSignup(email: string, password: string) {
    // Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    if (password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters');
    }

    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      throw new ValidationError('Admin with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const admin = await prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    // Return admin without password
    const { password: _, ...adminWithoutPassword } = admin;
    return adminWithoutPassword;
  }

  /**
   * Admin Login
   */
  static async adminLogin(email: string, password: string) {
    // Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Return admin without password
    const { password: _, ...adminWithoutPassword } = admin;
    return adminWithoutPassword;
  }

  /**
   * Verify Patient ID exists
   */
  static async verifyPatientId(patientId: string) {
    if (!patientId) {
      throw new ValidationError('Patient ID is required');
    }

    // Check if participant exists
    const participant = await prisma.participant.findUnique({
      where: { id: patientId },
      include: {
        patientUser: true,
      },
    });

    if (!participant) {
      throw new AuthenticationError('Invalid patient access link');
    }

    if (!participant.isActive) {
      throw new AuthenticationError('This patient account is inactive');
    }

    // Create PatientUser if doesn't exist
    let patientUser = participant.patientUser;
    if (!patientUser) {
      patientUser = await prisma.patientUser.create({
        data: {
          participantId: patientId,
        },
      });
    }

    return {
      patientUser,
      participant,
    };
  }
}
