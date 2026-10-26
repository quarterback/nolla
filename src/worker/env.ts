export interface Env {
  ASSETS: Fetcher;
  DEV_MODE: string;
  /** "1" answers from the script when no model is set. Works behind Access. */
  SCRIPTED?: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  MODEL_NAME: string;
  MODAL_BASE_URL?: string;
  MODAL_TOKEN?: string;
}

export type AppBindings = { Bindings: Env; Variables: { email: string } };

export const isDev = (env: Env) => env.DEV_MODE === '1';
export const modelConfigured = (env: Env) => !!env.MODAL_BASE_URL && !!env.MODAL_TOKEN;
export const scripted = (env: Env) => !modelConfigured(env) && (isDev(env) || env.SCRIPTED === '1');
