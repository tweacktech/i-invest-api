import 'dotenv/config';
import { PrismaClient, KycStatus, AccountStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import type { User } from '@prisma/client';
import { Pool } from 'pg';
import { hash } from 'bcryptjs';

// ── Prisma with driver adapter (required when schema uses driverAdapters preview) ──
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is missing. Set it in apps/api/.env before running prisma db seed.');
}
const pool    = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seeding...');

  // ─── USERS ────────────────────────────────────────────────────────────────
  const usersData = [
    { phoneNumber: '+2348000000001', password: 'Admin@123', referralCode: 'SEEDUSR1', displayName: 'Demo User One' },
    { phoneNumber: '+2348000000002', password: 'Admin@123', referralCode: 'SEEDUSR2', displayName: 'Demo User Two' },
  ];

  const createdUsers: User[] = [];
  for (const u of usersData) {
    const passwordHash = await hash(u.password, 10);
    const user = await prisma.user.upsert({
      where:  { phoneNumber: u.phoneNumber },
      update: { passwordHash, displayName: u.displayName },
      create: {
        phoneNumber:   u.phoneNumber,
        passwordHash,
        referralCode:  u.referralCode,
        displayName:   u.displayName,
        kycStatus:     KycStatus.VERIFIED,
        accountStatus: AccountStatus.ACTIVE,
      },
    });
    createdUsers.push(user);
    console.log(`✅ User: ${user.phoneNumber} (${user.displayName ?? '—'})`);
  }

  // ─── WALLETS ──────────────────────────────────────────────────────────────
  for (const user of createdUsers) {
    await prisma.wallet.upsert({
      where:  { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
    console.log(`✅ Wallet: ${user.phoneNumber}`);
  }

  // ─── ADMINS ───────────────────────────────────────────────────────────────
  const adminsData = [
    { email: 'admin@i-invest.dev', password: 'Admin@123', name: 'Super Admin' },
    { email: 'staff@i-invest.dev', password: 'Staff@123', name: 'Support Staff' },
  ];
  for (const a of adminsData) {
    const passwordHash = await hash(a.password, 10);
    await prisma.admin.upsert({
      where:  { email: a.email },
      update: { passwordHash, name: a.name },
      create: { email: a.email, passwordHash, name: a.name },
    });
    console.log(`✅ Admin: ${a.email}`);
  }

  // ─── PLATFORM SETTINGS ────────────────────────────────────────────────────
  await prisma.platformSettings.upsert({
    where:  { id: 'platform' },
    update: { welcomeMessage: 'Welcome to I-Invest — grow your wealth with smart daily returns.' },
    create: {
      id:                     'platform',
      maintenanceMode:        false,
      rechargeTimeoutMinutes: 30,
      welcomeMessage:         'Welcome to I-Invest — grow your wealth with smart daily returns.',
      urgentAdminNote:        null,
    },
  });
  console.log('✅ Platform settings');

  // ─── DEPOSIT METHODS ──────────────────────────────────────────────────────
  const depositMethods = [
    { code: 'A', label: 'Transfer account A', bankName: 'PAGA',       accountName: 'I-INVEST LTD', accountNumber: '0123456781', sortOrder: 0 },
    { code: 'B', label: 'Transfer account B', bankName: 'Moniepoint', accountName: 'I-INVEST LTD', accountNumber: '0123456782', sortOrder: 1 },
  ];
  for (const m of depositMethods) {
    await prisma.depositMethod.upsert({
      where:  { code: m.code },
      update: { label: m.label, bankName: m.bankName, accountName: m.accountName, accountNumber: m.accountNumber, sortOrder: m.sortOrder, isEnabled: true },
      create: { ...m, isEnabled: true },
    });
  }
  console.log('✅ Deposit methods');

  // ─── CATALOG BANKS ────────────────────────────────────────────────────────
  const bankNames = [
    'Access Bank', 'GTBank', 'Zenith Bank', 'First Bank', 'UBA',
    'Fidelity Bank', 'Opay', 'Moniepoint', 'PAGA', 'Kuda Bank',
    'Sterling Bank', 'Union Bank', 'Wema Bank', 'Polaris Bank',
    'Jaiz Bank', 'FCMB', 'Providus Bank', 'Titan Trust Bank',
  ];
  for (let i = 0; i < bankNames.length; i++) {
    const name = bankNames[i];
    const id   = `seed-bank-${name.toLowerCase().replace(/\s+/g, '-')}`;
    await prisma.catalogBank.upsert({
      where:  { id },
      update: { name, isEnabled: true, sortOrder: i },
      create: { id, name, isEnabled: true, sortOrder: i },
    });
  }
  console.log(`✅ ${bankNames.length} catalog banks`);

  // ─── INVESTMENT PACKAGES ──────────────────────────────────────────────────
  const packages = [
    { slug: 'smart-start',    name: 'Smart Start',    description: 'Beginner investment package',                     dailyYieldPercent: '2',   maturityDays: 90, minAmount: '5000',   maxAmount: '100000',  price: '5000',   firstTimeBonus: '100'  },
    { slug: 'starter-growth', name: 'Starter Growth', description: 'Entry-level investment plan with stable returns',  dailyYieldPercent: '3',   maturityDays: 90, minAmount: '14000',  maxAmount: '500000',  price: '14000',  firstTimeBonus: '300'  },
    { slug: 'investor-plus',  name: 'Investor Plus',  description: 'Balanced plan for growing capital',               dailyYieldPercent: '3',   maturityDays: 90, minAmount: '50000',  maxAmount: '1000000', price: '50000',  firstTimeBonus: '750'  },
    { slug: 'wealth-builder', name: 'Wealth Builder', description: 'Mid-tier investment package with enhanced yield',  dailyYieldPercent: '3.5', maturityDays: 90, minAmount: '120000', maxAmount: '3000000', price: '120000', firstTimeBonus: '1500' },
    { slug: 'elite-capital',  name: 'Elite Capital',  description: 'Premium investment package for larger portfolios', dailyYieldPercent: '3.5', maturityDays: 90, minAmount: '300000', maxAmount: '5000000', price: '300000', firstTimeBonus: '3000' },
  ];
  for (const { slug, ...fields } of packages) {
    await prisma.investmentPackage.upsert({
      where:  { slug },
      update: { ...fields, isActive: true },
      create: { slug, ...fields, isActive: true },
    });
  }
  console.log(`✅ ${packages.length} investment packages`);

  // ─── DAILY TASKS ──────────────────────────────────────────────────────────
  // youtubeUrl is String (NOT NULL, no default) in the schema.
  // Non-video tasks use '' as a placeholder.
  // Long-term fix: change schema to `youtubeUrl String?` + migrate.
  await prisma.dailyTask.upsert({
    where:  { id: 'seed-youtube-task' },
    update: { title: 'Watch welcome video', youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', watchSeconds: 30, rewardAmount: '50', sortOrder: 0, isActive: true },
    create: { id: 'seed-youtube-task', title: 'Watch welcome video', youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', watchSeconds: 30, rewardAmount: '50', sortOrder: 0, isActive: true },
  });
  await prisma.dailyTask.upsert({
    where:  { id: 'seed-follow-instagram' },
    update: { title: 'Follow us on Instagram', youtubeUrl: '', watchSeconds: 0, rewardAmount: '30', sortOrder: 1, isActive: true },
    create: { id: 'seed-follow-instagram', title: 'Follow us on Instagram', youtubeUrl: '', watchSeconds: 0, rewardAmount: '30', sortOrder: 1, isActive: true },
  });
  console.log('✅ 2 daily tasks');

  // ─── VIP LEVELS ───────────────────────────────────────────────────────────
  const vipLevels = [
    { level: 0, levelName: 'Member',   minInvestmentRequired: '0',        minTeamMembers: 0,   minCommissionEarned: '0',       dividendRate: '0',  weeklySalary: '0',      membersUnlockCount: 0,   maxWithdrawalPercent: '100' },
    { level: 1, levelName: 'Bronze',   minInvestmentRequired: '50000',    minTeamMembers: 3,   minCommissionEarned: '5000',    dividendRate: '1',  weeklySalary: '2000',   membersUnlockCount: 5,   maxWithdrawalPercent: '30'  },
    { level: 2, levelName: 'Silver',   minInvestmentRequired: '150000',   minTeamMembers: 8,   minCommissionEarned: '15000',   dividendRate: '2',  weeklySalary: '5000',   membersUnlockCount: 10,  maxWithdrawalPercent: '40'  },
    { level: 3, levelName: 'Gold',     minInvestmentRequired: '350000',   minTeamMembers: 15,  minCommissionEarned: '40000',   dividendRate: '3',  weeklySalary: '10000',  membersUnlockCount: 20,  maxWithdrawalPercent: '50'  },
    { level: 4, levelName: 'Platinum', minInvestmentRequired: '750000',   minTeamMembers: 25,  minCommissionEarned: '100000',  dividendRate: '4',  weeklySalary: '20000',  membersUnlockCount: 35,  maxWithdrawalPercent: '60'  },
    { level: 5, levelName: 'Diamond',  minInvestmentRequired: '1500000',  minTeamMembers: 40,  minCommissionEarned: '250000',  dividendRate: '5',  weeklySalary: '40000',  membersUnlockCount: 50,  maxWithdrawalPercent: '70'  },
    { level: 6, levelName: 'Crown',    minInvestmentRequired: '3000000',  minTeamMembers: 60,  minCommissionEarned: '500000',  dividendRate: '6',  weeklySalary: '75000',  membersUnlockCount: 75,  maxWithdrawalPercent: '80'  },
    { level: 7, levelName: 'Imperial', minInvestmentRequired: '6000000',  minTeamMembers: 90,  minCommissionEarned: '1000000', dividendRate: '8',  weeklySalary: '120000', membersUnlockCount: 100, maxWithdrawalPercent: '90'  },
    { level: 8, levelName: 'Legend',   minInvestmentRequired: '12000000', minTeamMembers: 120, minCommissionEarned: '2500000', dividendRate: '10', weeklySalary: '200000', membersUnlockCount: 150, maxWithdrawalPercent: '100' },
  ];
  for (const { level, ...rest } of vipLevels) {
    await prisma.vIPLevel.upsert({
      where:  { level },
      update: { ...rest },
      create: { level, ...rest, levelDescription: `VIP ${level} — ${rest.levelName}`, isActive: true },
    });
  }
  console.log(`✅ ${vipLevels.length} VIP levels`);

  // ─── VIP PROGRESSION ──────────────────────────────────────────────────────
  for (const user of createdUsers) {
    await prisma.vIPProgression.upsert({
      where:  { userId: user.id },
      update: {},
      create: { userId: user.id, currentVipLevel: 0, investmentTarget: '50000', teamMembersTarget: 3, commissionTarget: '5000' },
    });
  }
  console.log(`✅ VIP progression for ${createdUsers.length} users`);

  // ─── ANNOUNCEMENT ─────────────────────────────────────────────────────────
  await prisma.announcement.upsert({
    where:  { id: 'seed-welcome-announcement' },
    update: {},
    create: {
      id:       'seed-welcome-announcement',
      title:    'Welcome to I-Invest',
      body:     'Thank you for joining. Recharge your wallet, pick an investment plan, and check here for platform updates.',
      isActive: true,
    },
  });
  console.log('✅ Announcement');

  // ─── SUMMARY ──────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(50));
  console.log('✅  SEEDING COMPLETE');
  console.log('='.repeat(50));
  console.log('\n📋 Demo Users:');
  for (const u of usersData) {
    console.log(`   ${u.phoneNumber}  /  ${u.password}  (${u.displayName})`);
  }
  console.log('\n👥 Admins:');
  for (const a of adminsData) {
    console.log(`   ${a.email}  /  ${a.password}`);
  }
}

main()
  .catch((e) => { console.error('❌ Seeding failed:', e); process.exit(1); })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });