import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { hash } from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is missing. Set it in apps/api/.env before running prisma db seed.');
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const demoPass = await hash('Admin@123', 10);
  const demoUser = await prisma.user.upsert({
    where: { phoneNumber: '+2348000000001' },
    update: {},
    create: {
      phoneNumber: '+2348000000001',
      passwordHash: demoPass,
      referralCode: 'SEEDUSR1',
      kycStatus: 'VERIFIED',
    },
  });

  await prisma.wallet.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: { userId: demoUser.id },
  });

  const staffHash = await hash('Admin@123', 10);
  await prisma.admin.upsert({
    where: { email: 'admin@i-invest.dev' },
    update: { passwordHash: staffHash, isActive: true },
    create: {
      email: 'admin@i-invest.dev',
      passwordHash: staffHash,
      name: 'Platform Admin',
      isActive: true,
    },
  });

  await prisma.platformSettings.upsert({
    where: { id: 'platform' },
    update: {
      welcomeMessage: 'Welcome to I-Invest — grow your wealth with smart daily returns.',
    },
    create: {
      id: 'platform',
      maintenanceMode: false,
      rechargeTimeoutMinutes: 30,
      welcomeMessage: 'Welcome to I-Invest — grow your wealth with smart daily returns.',
      urgentAdminNote: null,
    },
  });

  const methods: Array<{
    code: string;
    label: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    sortOrder: number;
  }> = [
    {
      code: 'A',
      label: 'Transfer account A',
      bankName: 'PAGA',
      accountName: 'I‑INVEST LTD',
      accountNumber: '0123456781',
      sortOrder: 0,
    },
    {
      code: 'B',
      label: 'Transfer account B',
      bankName: 'Moniepoint',
      accountName: 'I‑INVEST LTD',
      accountNumber: '0123456782',
      sortOrder: 1,
    },
  ];

  for (const m of methods) {
    await prisma.depositMethod.upsert({
      where: { code: m.code },
      update: {
        label: m.label,
        bankName: m.bankName,
        accountName: m.accountName,
        accountNumber: m.accountNumber,
        sortOrder: m.sortOrder,
        isEnabled: true,
      },
      create: { ...m, isEnabled: true },
    });
  }

  const banks = ['Access Bank', 'GTBank', 'Zenith Bank', 'First Bank', 'UBA', 'Fidelity Bank','Opay','Moniepoint','PAGA'];
  let sort = 0;
  for (const name of banks) {
    const id = `seed-bank-${name.toLowerCase().replace(/\s+/g, '-')}`;
    await prisma.catalogBank.upsert({
      where: { id },
      update: { name, isEnabled: true, sortOrder: sort },
      create: { id, name, isEnabled: true, sortOrder: sort },
    });
    sort += 1;
  }

  const pkgs = [
    {
      name: 'Smart Start',
      slug: 'smart-start',
      description: 'Beginner investment package',
      dailyYieldPercent: '2',
      maturityDays: 90,
      minAmount: '5000',
      maxAmount: '100000',
      price: '5000',
      firstTimeBonus: '100',
    },
    {
      name: 'Starter Growth',
      slug: 'starter-growth',
      description: 'Entry-level investment plan with stable returns',
      dailyYieldPercent: '3',
      maturityDays: 90,
      minAmount: '14000',
      maxAmount: '500000',
      price: '14000',
      firstTimeBonus: '300',
    },
    {
      name: 'Investor Plus',
      slug: 'investor-plus',
      description: 'Balanced plan for growing capital',
      dailyYieldPercent: '3',
      maturityDays: 90,
      minAmount: '50000',
      maxAmount: '1000000',
      price: '50000',
      firstTimeBonus: '750',
    },
    {
      name: 'Wealth Builder',
      slug: 'wealth-builder',
      description: 'Mid-tier investment package with enhanced yield',
      dailyYieldPercent: '3.5',
      maturityDays: 90,
      minAmount: '120000',
      maxAmount: '3000000',
      price: '120000',
      firstTimeBonus: '1500',
    },
    {
      name: 'Elite Capital',
      slug: 'elite-capital',
      description: 'Premium investment package for larger portfolios',
      dailyYieldPercent: '3.5',
      maturityDays: 90,
      minAmount: '300000',
      maxAmount: '5000000',
      price: '300000',
      firstTimeBonus: '3000',
    },
  ];

  for (const p of pkgs) {
    await prisma.investmentPackage.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        dailyYieldPercent: p.dailyYieldPercent,
        maturityDays: p.maturityDays,
        minAmount: p.minAmount,
        maxAmount: p.maxAmount,
        price: p.price,
        firstTimeBonus: p.firstTimeBonus,
        isActive: true,
      },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        dailyYieldPercent: p.dailyYieldPercent,
        maturityDays: p.maturityDays,
        minAmount: p.minAmount,
        maxAmount: p.maxAmount,
        price: p.price,
        firstTimeBonus: p.firstTimeBonus,
        isActive: true,
      },
    });
  }

  await prisma.dailyTask.upsert({
    where: { id: 'seed-youtube-task' },
    update: {},
    create: {
      id: 'seed-youtube-task',
      title: 'Watch welcome video',
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      watchSeconds: 30,
      rewardAmount: '50',
      sortOrder: 0,
      isActive: true,
    },
  });

  const vipDefs = [
    { level: 0, levelName: 'Member', minInvestmentRequired: '0', minTeamMembers: 0, minCommissionEarned: '0', dividendRate: '0', weeklySalary: '0', membersUnlockCount: 0, maxWithdrawalPercent: '100' },
    { level: 1, levelName: 'Bronze', minInvestmentRequired: '50000', minTeamMembers: 3, minCommissionEarned: '5000', dividendRate: '1', weeklySalary: '2000', membersUnlockCount: 5, maxWithdrawalPercent: '30' },
    { level: 2, levelName: 'Silver', minInvestmentRequired: '150000', minTeamMembers: 8, minCommissionEarned: '15000', dividendRate: '2', weeklySalary: '5000', membersUnlockCount: 10, maxWithdrawalPercent: '40' },
    { level: 3, levelName: 'Gold', minInvestmentRequired: '350000', minTeamMembers: 15, minCommissionEarned: '40000', dividendRate: '3', weeklySalary: '10000', membersUnlockCount: 20, maxWithdrawalPercent: '50' },
    { level: 4, levelName: 'Platinum', minInvestmentRequired: '750000', minTeamMembers: 25, minCommissionEarned: '100000', dividendRate: '4', weeklySalary: '20000', membersUnlockCount: 35, maxWithdrawalPercent: '60' },
    { level: 5, levelName: 'Diamond', minInvestmentRequired: '1500000', minTeamMembers: 40, minCommissionEarned: '250000', dividendRate: '5', weeklySalary: '40000', membersUnlockCount: 50, maxWithdrawalPercent: '70' },
    { level: 6, levelName: 'Crown', minInvestmentRequired: '3000000', minTeamMembers: 60, minCommissionEarned: '500000', dividendRate: '6', weeklySalary: '75000', membersUnlockCount: 75, maxWithdrawalPercent: '80' },
    { level: 7, levelName: 'Imperial', minInvestmentRequired: '6000000', minTeamMembers: 90, minCommissionEarned: '1000000', dividendRate: '8', weeklySalary: '120000', membersUnlockCount: 100, maxWithdrawalPercent: '90' },
    { level: 8, levelName: 'Legend', minInvestmentRequired: '12000000', minTeamMembers: 120, minCommissionEarned: '2500000', dividendRate: '10', weeklySalary: '200000', membersUnlockCount: 150, maxWithdrawalPercent: '100' },
  ];
  for (const v of vipDefs) {
    await prisma.vIPLevel.upsert({
      where: { level: v.level },
      update: v,
      create: {
        ...v,
        levelDescription: `VIP ${v.level} — ${v.levelName}`,
        isActive: true,
      },
    });
  }

  await prisma.vIPProgression.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      currentVipLevel: 0,
      investmentTarget: '50000',
      teamMembersTarget: 3,
      commissionTarget: '5000',
    },
  });

  await prisma.announcement.upsert({
    where: { id: 'seed-welcome-announcement' },
    update: {},
    create: {
      id: 'seed-welcome-announcement',
      title: 'Welcome to I-Invest',
      body: 'Thank you for joining. Recharge your wallet, pick an investment plan, and check Notifications here for platform updates.',
      isActive: true,
    },
  });

  console.log('Seed OK');
  console.log('  Demo user: +2348000000001 / Admin@123');
  console.log('  Staff admin: admin@i-invest.dev / Admin@123  (use /staff/login)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
