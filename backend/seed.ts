import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:aayan237@localhost:5432/ai_app_generator';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const seedData = [
  {
    company: "amazon",
    role: "SDE II",
    level: "L5",
    location: "Bangalore",
    experience_years: 4,
    base_salary: 4000000,
    bonus: 200000,
    stock: 1500000,
    total_compensation: 5700000,
    confidence_score: 0.95
  },
  {
    company: "amazon",
    role: "SDE I",
    level: "L4",
    location: "Hyderabad",
    experience_years: 1,
    base_salary: 2000000,
    bonus: 100000,
    stock: 800000,
    total_compensation: 2900000,
    confidence_score: 0.91
  },
  {
    company: "microsoft",
    role: "Software Engineer",
    level: "L60",
    location: "Noida",
    experience_years: 3,
    base_salary: 3500000,
    bonus: 300000,
    stock: 1200000,
    total_compensation: 5000000,
    confidence_score: 0.88
  },
  {
    company: "microsoft",
    role: "Senior Software Engineer",
    level: "L63",
    location: "Bangalore",
    experience_years: 8,
    base_salary: 6000000,
    bonus: 800000,
    stock: 3000000,
    total_compensation: 9800000,
    confidence_score: 0.96
  },
  {
    company: "google",
    role: "Software Engineer",
    level: "L3",
    location: "Bangalore",
    experience_years: 1,
    base_salary: 3000000,
    bonus: 450000,
    stock: 1500000,
    total_compensation: 4950000,
    confidence_score: 0.93
  },
  {
    company: "google",
    role: "Senior Software Engineer",
    level: "L5",
    location: "Remote",
    experience_years: 7,
    base_salary: 8000000,
    bonus: 1200000,
    stock: 5000000,
    total_compensation: 14200000,
    confidence_score: 0.99
  },
  {
    company: "atlassian",
    role: "Frontend Engineer",
    level: "P4",
    location: "Bangalore",
    experience_years: 5,
    base_salary: 5500000,
    bonus: 500000,
    stock: 2000000,
    total_compensation: 8000000,
    confidence_score: 0.89
  },
  {
    company: "uber",
    role: "Backend Engineer",
    level: "L4",
    location: "Bangalore",
    experience_years: 3.5,
    base_salary: 4800000,
    bonus: 500000,
    stock: 2500000,
    total_compensation: 7800000,
    confidence_score: 0.92
  }
];

async function main() {
  console.log('Seeding data...');
  for (const data of seedData) {
    try {
      await prisma.salary.create({ data });
      console.log(`Inserted: ${data.company} - ${data.role} (${data.level})`);
    } catch (e) {
      console.log(`Skipped or Error on ${data.company} - ${data.role}:`, e.message);
    }
  }
  console.log('Done!');
}

main().finally(() => prisma.$disconnect());
