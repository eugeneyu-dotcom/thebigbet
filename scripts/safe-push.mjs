import { execSync } from 'child_process';

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

function check(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

// Check if EXPERT_PREDICTIONS.csv has any uncommitted changes (staged or unstaged)
const csvStatus = check('git status --porcelain EXPERT_PREDICTIONS.csv');

if (csvStatus) {
  console.log('📋 EXPERT_PREDICTIONS.csv 有未 commit 的變更，自動處理中...');

  // Sync humanPredictions.json from latest CSV before committing
  run('node --env-file-if-exists=.env scripts/generate_expert_csv.mjs');

  run('git add EXPERT_PREDICTIONS.csv src/data/humanPredictions.json');

  // Only commit if there's actually something staged
  const staged = check('git diff --cached --name-only');
  if (staged) {
    run('git commit -m "update: sync expert predictions"');
    console.log('✅ CSV 已自動 commit。');
  }
} else {
  console.log('✅ EXPERT_PREDICTIONS.csv 無未 commit 變更。');
}

// Now push
run('git push');
