import 'dotenv/config';
import { PrismaClient, KycStatus, AccountStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

// ── Use plain PrismaClient (no adapter) unless you're using edge runtime ──────
// If your schema uses `previewFeatures = ["driverAdapters"]`, keep the adapter.
// Otherwise remove it — it's the most common cause of "prisma already exists" errors.
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // ========== USERS ==========
  const users = [
    {
      phoneNumber: '+2348000000001',
      password: 'Admin@123',
      referralCode: 'SEEDUSR1',
      displayName: 'Demo User One',
    },
    {
      phoneNumber: '+2348000000002',
      password: 'Admin@123',
      referralCode: 'SEEDUSR2',
      displayName: 'Demo User Two',
    },
  ];

  const createdUsers = [];
  for (const userData of users) {
    const hashedPassword = await hash(userData.password, 10);
    const user = await prisma.user.upsert({
      where: { phoneNumber: userData.phoneNumber },
      update: {
        passwordHash: hashedPassword,
        displayName: userData.displayName,
      },
      create: {
        phoneNumber: userData.phoneNumber,
        passwordHash: hashedPassword,
        referralCode: userData.referralCode,
        displayName: userData.displayName,
        kycStatus: KycStatus.VERIFIED,
        accountStatus: AccountStatus.ACTIVE,
      },
    });
    createdUsers.push(user);
    console.log(`✅ User: ${user.phoneNumber} (${user.displayName ?? 'no name'})`);
  }

  // ========== WALLETS ==========
  for (const user of createdUsers) {
    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
    console.log(`✅ Wallet for: ${user.phoneNumber}`);
  }

  // ========== ADMINS ==========
  // Admin model uses `passwordHash` and likely an enum for role.
  // Adjust `AdminRole.SUPER_ADMIN` / `AdminRole.STAFF` to match your enum name.
  const admins = [
    {
      email: 'admin@i-invest.dev',
      password: 'Admin@123',
      name: 'Super Admin',
    },
    {
      email: 'staff@i-invest.dev',
      password: 'Staff@123',
      name: 'Support Staff',
    },
  ];

  for (const adminData of admins) {
    const hashedPassword = await hash(adminData.password, 10);
    await prisma.admin.upsert({
      where: { email: adminData.email },
      update: {
        passwordHash: hashedPassword,
        name: adminData.name,
      },
      create: {
        email: adminData.email,
        passwordHash: hashedPassword,
        name: adminData.name,
      },
    });
    console.log(`✅ Admin: ${adminData.email}`);
  }

  // ========== PLATFORM SETTINGS ==========
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
  console.log('✅ Platform settings configured');

  // ========== DEPOSIT METHODS ==========
  const methods = [
    { code: 'A', label: 'Transfer account A', bankName: 'PAGA',       accountName: 'I-INVEST LTD', accountNumber: '0123456781', sortOrder: 0 },
    { code: 'B', label: 'Transfer account B', bankName: 'Moniepoint', accountName: 'I-INVEST LTD', accountNumber: '0123456782', sortOrder: 1 },
  ];

  for (const m of methods) {
    await prisma.depositMethod.upsert({
      where: { code: m.code },
      update: { label: m.label, bankName: m.bankName, accountName: m.accountName, accountNumber: m.accountNumber, sortOrder: m.sortOrder, isEnabled: true },
      create: { ...m, isEnabled: true },
    });
  }
  console.log('✅ Deposit methods configured');

  // ========== CATALOG BANKS ==========
  const banks = [
    'Access Bank', 'GTBank', 'Zenith Bank', 'First Bank', 'UBA',
    'Fidelity Bank', 'Opay', 'Moniepoint', 'PAGA', 'Kuda Bank',
    'Sterling Bank', 'Union Bank', 'Wema Bank', 'Polaris Bank',
    'Jaiz Bank', 'FCMB', 'Providus Bank', 'Titan Trust Bank',
  ];
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
  console.log(`✅ ${banks.length} catalog banks configured`);

  // ========== INVESTMENT PACKAGES ==========
  const pkgs = [
    { name: 'Smart Start',     slug: 'smart-start',     description: 'Beginner investment package',                    dailyYieldPercent: '2',   maturityDays: 90, minAmount: '5000',    maxAmount: '100000',  price: '5000',    firstTimeBonus: '100'  },
    { name: 'Starter Growth',  slug: 'starter-growth',  description: 'Entry-level investment plan with stable returns', dailyYieldPercent: '3',   maturityDays: 90, minAmount: '14000',   maxAmount: '500000',  price: '14000',   firstTimeBonus: '300'  },
    { name: 'Investor Plus',   slug: 'investor-plus',   description: 'Balanced plan for growing capital',              dailyYieldPercent: '3',   maturityDays: 90, minAmount: '50000',   maxAmount: '1000000', price: '50000',   firstTimeBonus: '750'  },
    { name: 'Wealth Builder',  slug: 'wealth-builder',  description: 'Mid-tier investment package with enhanced yield', dailyYieldPercent: '3.5', maturityDays: 90, minAmount: '120000',  maxAmount: '3000000', price: '120000',  firstTimeBonus: '1500' },
    { name: 'Elite Capital',   slug: 'elite-capital',   description: 'Premium investment package for larger portfolios',dailyYieldPercent: '3.5', maturityDays: 90, minAmount: '300000',  maxAmount: '5000000', price: '300000',  firstTimeBonus: '3000' },
  ];

  for (const p of pkgs) {
    await prisma.investmentPackage.upsert({
      where: { slug: p.slug },
      update: { name: p.name, description: p.description, dailyYieldPercent: p.dailyYieldPercent, maturityDays: p.maturityDays, minAmount: p.minAmount, maxAmount: p.maxAmount, price: p.price, firstTimeBonus: p.firstTimeBonus, isActive: true },
      create: { ...p, isActive: true },
    });
  }
  console.log(`✅ ${pkgs.length} investment packages configured`);

  // ========== DAILY TASKS ==========
  // Spread into update/create separately to avoid passing `id` into update
  const tasks = [
    { id: 'seed-youtube-task',    title: 'Watch welcome video',    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', watchSeconds: 30, rewardAmount: '50', sortOrder: 0, isActive: true },
    { id: 'seed-follow-instagram',title: 'Follow us on Instagram', youtubeUrl: null,                                           watchSeconds: 0,  rewardAmount: '30', sortOrder: 1, isActive: true },
  ];

  for (const { id, ...rest } of tasks) {
    await prisma.dailyTask.upsert({
      where: { id },
      update: { ...rest },   // no `id` in update — fixes the TS2322 error
      create: { id, ...rest },
    });
  }
  console.log(`✅ ${tasks.length} daily tasks configured`);

  // ========== VIP LEVELS ==========
  const vipDefs = [
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

  for (const { level, ...rest } of vipDefs) {
    await prisma.vIPLevel.upsert({
      where: { level },
      update: { ...rest },
      create: {
        level,
        ...rest,
        levelDescription: `VIP ${level} — ${rest.levelName}`,
        isActive: true,
      },
    });
  }
  console.log(`✅ ${vipDefs.length} VIP levels configured`);

  // ========== VIP PROGRESSION ==========
  for (const user of createdUsers) {
    await prisma.vIPProgression.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        currentVipLevel: 0,
        investmentTarget: '50000',
        teamMembersTarget: 3,
        commissionTarget: '5000',
      },
    });
  }
  console.log(`✅ VIP progression for ${createdUsers.length} users`);

  // ========== ANNOUNCEMENT ==========
  await prisma.announcement.upsert({
    where: { id: 'seed-welcome-announcement' },
    update: {},
    create: {
      id: 'seed-welcome-announcement',
      title: 'Welcome to I-Invest',
      body: 'Thank you for joining. Recharge your wallet, pick an investment plan, and check here for platform updates.',
      isActive: true,
    },
  });
  console.log('✅ Welcome announcement created');

  // ========== SUMMARY ==========
  console.log('\n' + '='.repeat(50));
  console.log('✅ SEEDING COMPLETED');
  console.log('='.repeat(50));
  console.log('\n📋 DEMO USERS:');
  for (const u of users) {
    console.log(`   • ${u.phoneNumber} / ${u.password}  (${u.displayName})`);
  }
  console.log('\n👥 ADMINS:');
  for (const a of admins) {
    console.log(`   • ${a.email} / ${a.password}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
