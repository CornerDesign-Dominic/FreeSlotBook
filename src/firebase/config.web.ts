import { getAuth } from 'firebase/auth';

import { app, db } from './config.shared';

export const auth = getAuth(app);
export { app, db };
