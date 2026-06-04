/**
 * Registered cron jobs (Nest @nestjs/schedule):
 *
 * | Schedule              | Job                    | Module    |
 * |-----------------------|------------------------|-----------|
 * | Every minute          | RechargeExpiryJob      | Recharge  | Expire unpaid MANUAL transfers past countdown |
 * | Every hour            | InvestmentInterestJob  | Investment| Accrue daily yield when nextInterestDate is due |
 * | Every day 01:00 UTC   | InvestmentInterestJob  | Investment| Same batch (primary daily window) |
 * | Every day 02:00 UTC   | SessionCleanupJob      | Auth      | Delete expired refresh-token sessions |
 */

export const SCHEDULED_TASKS_DOC = true;
