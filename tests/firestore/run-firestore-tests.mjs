import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

function resolveJavaHome() {
  const candidateRoots = [
    'C:\\Program Files\\Microsoft',
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Java',
  ];

  for (const candidateRoot of candidateRoots) {
    if (!fs.existsSync(candidateRoot)) {
      continue;
    }

    const javaHome = fs
      .readdirSync(candidateRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.toLowerCase().includes('jdk'))
      .map((entry) => path.join(candidateRoot, entry.name))
      .sort()
      .reverse()[0];

    if (javaHome && fs.existsSync(path.join(javaHome, 'bin', 'java.exe'))) {
      return javaHome;
    }
  }

  return process.env.JAVA_HOME ?? null;
}

const javaHome = resolveJavaHome();
const javaBinPath = javaHome ? path.join(javaHome, 'bin') : null;
const command = `${process.platform === 'win32' ? 'npx.cmd' : 'npx'} firebase emulators:exec --project slotly-firestore-tests --only firestore "vitest tests/firestore --run"`;

const child = spawn(command, {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    ...(javaHome ? { JAVA_HOME: javaHome } : {}),
    ...(javaBinPath ? { PATH: `${javaBinPath}${path.delimiter}${process.env.PATH ?? ''}` } : {}),
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
