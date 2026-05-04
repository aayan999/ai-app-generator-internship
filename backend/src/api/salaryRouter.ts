import 'dotenv/config';
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
export const salaryRouter = Router();

// Zod Schema for validation
const salarySchema = z.object({
  company: z.string().min(1, 'Company name is required'),
  role: z.string().min(1, 'Role is required'),
  level_standardized: z.string().min(1, 'Level is required'),
  location: z.string().optional().default('Remote'),
  experience_years: z.number().nonnegative('Experience years cannot be negative'),
  base_salary: z.number().positive('Base salary must be positive'),
  bonus: z.number().nonnegative().optional().default(0),
  stock: z.number().nonnegative().optional().default(0),
  confidence: z.number().min(0).max(1).optional()
});

// POST /ingest-salary
salaryRouter.post('/ingest-salary', async (req: Request, res: Response) => {
  try {
    // Validate schema (MANDATORY per requirements)
    const result = salarySchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid data schema', 
        details: result.error.format() 
      });
    }

    const data = result.data;

    // --- REQUIREMENT 1: Normalize Company Name ---
    const normalizedCompany = data.company.trim().toLowerCase();

    // --- REQUIREMENT 2 & 3: Calculate Total Comp & Handle Missing Values ---
    const totalCompensation = data.base_salary + data.bonus + data.stock;

    // --- REQUIREMENT 4: Dummy AI Confidence Score if missing ---
    const confidenceScore = data.confidence !== undefined 
      ? data.confidence 
      : parseFloat((Math.random() * (0.99 - 0.85) + 0.85).toFixed(2));

    // --- REQUIREMENT 5: Handle Duplicate Entries ---
    const existingSalary = await prisma.salary.findFirst({
      where: {
        company: normalizedCompany,
        role: data.role,
        level: data.level_standardized,
        location: data.location,
        experience_years: data.experience_years,
        base_salary: data.base_salary,
        bonus: data.bonus,
        stock: data.stock
      }
    });

    if (existingSalary) {
      return res.status(409).json({ 
        success: false, 
        error: 'Duplicate entry detected. This salary record already exists.' 
      });
    }

    // Save the record
    const newSalary = await prisma.salary.create({
      data: {
        company: normalizedCompany,
        role: data.role,
        level: data.level_standardized,
        location: data.location,
        experience_years: data.experience_years,
        base_salary: data.base_salary,
        bonus: data.bonus,
        stock: data.stock,
        total_compensation: totalCompensation,
        confidence_score: confidenceScore,
      },
    });

    res.status(201).json({ success: true, data: newSalary });
  } catch (error) {
    console.error('Error ingesting salary:', error);
    res.status(500).json({ success: false, error: 'Failed to ingest salary data' });
  }
});

// GET /salaries
salaryRouter.get('/salaries', async (req: Request, res: Response) => {
  try {
    const { company, role, level, location } = req.query;

    // Build filter object dynamically
    const filter: any = {};
    if (typeof company === 'string' && company.trim()) {
      filter.company = company.trim().toLowerCase();
    }
    if (typeof role === 'string' && role.trim()) {
      filter.role = { contains: role.trim(), mode: 'insensitive' };
    }
    if (typeof level === 'string' && level.trim()) {
      filter.level = { contains: level.trim(), mode: 'insensitive' };
    }
    if (typeof location === 'string' && location.trim()) {
      filter.location = { contains: location.trim(), mode: 'insensitive' };
    }

    const salaries = await prisma.salary.findMany({
      where: filter,
      orderBy: { total_compensation: 'desc' }, // sort by total_compensation
    });

    res.status(200).json({ success: true, data: salaries });
  } catch (error) {
    console.error('Error fetching salaries:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch salaries' });
  }
});

// GET /company/:company
salaryRouter.get('/company/:company', async (req: Request, res: Response) => {
  try {
    const companyParam = String(req.params.company).trim().toLowerCase();

    const salaries = await prisma.salary.findMany({
      where: { company: companyParam },
      orderBy: { total_compensation: 'desc' },
    });

    if (salaries.length === 0) {
      return res.status(404).json({ success: false, error: 'Company not found or no salary data' });
    }

    // Calculate median total compensation
    const totalComps = salaries.map(s => s.total_compensation).sort((a, b) => a - b);
    let median = 0;
    const mid = Math.floor(totalComps.length / 2);
    if (totalComps.length % 2 === 0) {
      median = (totalComps[mid - 1] + totalComps[mid]) / 2;
    } else {
      median = totalComps[mid];
    }

    // Level distribution
    const levelDistribution: Record<string, number> = {};
    salaries.forEach(s => {
      levelDistribution[s.level] = (levelDistribution[s.level] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: {
        company: companyParam,
        median_total_compensation: median,
        level_distribution: levelDistribution,
        salaries: salaries
      }
    });
  } catch (error) {
    console.error('Error fetching company stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch company data' });
  }
});

// GET /compare
salaryRouter.get('/compare', async (req: Request, res: Response) => {
  try {
    const { salaryId1, salaryId2 } = req.query;

    if (typeof salaryId1 !== 'string' || typeof salaryId2 !== 'string') {
      return res.status(400).json({ success: false, error: 'Must provide salaryId1 and salaryId2 query params' });
    }

    const [salary1, salary2] = await Promise.all([
      prisma.salary.findUnique({ where: { id: salaryId1 } }),
      prisma.salary.findUnique({ where: { id: salaryId2 } })
    ]);

    if (!salary1 || !salary2) {
      return res.status(404).json({ success: false, error: 'One or both salaries not found' });
    }

    const comparison = {
      salary1: salary1,
      salary2: salary2,
      base_difference: salary1.base_salary - salary2.base_salary,
      bonus_difference: salary1.bonus - salary2.bonus,
      stock_difference: salary1.stock - salary2.stock,
      total_difference: salary1.total_compensation - salary2.total_compensation,
    };

    res.status(200).json({ success: true, data: comparison });
  } catch (error) {
    console.error('Error comparing salaries:', error);
    res.status(500).json({ success: false, error: 'Failed to compare salaries' });
  }
});

