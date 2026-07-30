import { execFileSync } from 'node:child_process';

const isProduction = process.env.VERCEL_ENV === 'production';
const branch = process.env.VERCEL_GIT_COMMIT_REF ?? '';

if (!isProduction && branch.startsWith('dependabot/')) {
  console.log('Skipping Dependabot preview deployment');
  process.exit(0);
}

if (!isProduction) {
  process.exit(1);
}

const commitMessage = execFileSync('git', ['log', '-1', '--pretty=%B'], {
  encoding: 'utf8',
});

if (/^chore\(release\):/.test(commitMessage)) {
  process.exit(1);
}

console.log('Skipping production deploy: non-release commit');
process.exit(0);
