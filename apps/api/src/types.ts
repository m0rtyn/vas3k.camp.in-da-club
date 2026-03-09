import type { AuthUser } from './middleware/auth';

export type AppEnv = {
  Variables: {
    user: AuthUser;
  };
};
