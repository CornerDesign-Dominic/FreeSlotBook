import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { beforeEach, afterAll } from 'vitest';

const PROJECT_ID_PREFIX = process.env.GCLOUD_PROJECT ?? 'slotly-firestore-tests';
const FIRESTORE_HOST = '127.0.0.1';
const FIRESTORE_PORT = 8081;

let testEnvironment: RulesTestEnvironment | null = null;
let testCounter = 0;

async function createEnvironment() {
  testCounter += 1;

  return initializeTestEnvironment({
    projectId: `${PROJECT_ID_PREFIX}-${testCounter}`,
    firestore: {
      host: FIRESTORE_HOST,
      port: FIRESTORE_PORT,
    },
  });
}

export async function getTestEnvironment() {
  if (!testEnvironment) {
    testEnvironment = await createEnvironment();
  }

  return testEnvironment;
}

export async function getAuthenticatedContext(params: {
  uid: string;
  email: string;
}) {
  const currentEnvironment = await getTestEnvironment();
  return currentEnvironment.authenticatedContext(params.uid, {
    email: params.email,
  });
}

export async function getAnonymousContext() {
  const currentEnvironment = await getTestEnvironment();
  return currentEnvironment.unauthenticatedContext();
}

export function getContextDb(context: RulesTestContext) {
  return context.firestore();
}

beforeEach(async () => {
  if (testEnvironment) {
    await testEnvironment.cleanup();
    testEnvironment = null;
  }
});

afterAll(async () => {
  if (testEnvironment) {
    await testEnvironment.cleanup();
    testEnvironment = null;
  }
});
