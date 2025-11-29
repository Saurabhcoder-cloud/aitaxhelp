import { runDailyTaxUpdateJob } from '../lib/taxUpdates';

async function main() {
  try {
    await runDailyTaxUpdateJob();
    // eslint-disable-next-line no-console
    console.log('Daily tax update job completed successfully.');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to run daily tax update job', error);
    process.exit(1);
  }
}

void main();
