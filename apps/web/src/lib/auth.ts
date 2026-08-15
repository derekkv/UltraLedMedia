import { queryOptions } from '@tanstack/react-query';
import type { LoginInput, ModuleKey } from '@ultraled/shared';
import { api } from './api';

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roles: string[];
  permissions: string[];
  modules: string[];
}

/** Query del usuario actual. `retry: false` para que un 401 redirija sin reintentos. */
export const meQueryOptions = queryOptions({
  queryKey: ['auth', 'me'],
  queryFn: async () => {
    const res = await api.get<{ user: CurrentUser }>('/auth/me');
    return res.user;
  },
  retry: false,
  staleTime: 60_000,
});

export function login(input: LoginInput): Promise<{ user: CurrentUser }> {
  return api.post<{ user: CurrentUser }>('/auth/login', input);
}

export function logout(): Promise<{ ok: boolean }> {
  return api.post<{ ok: boolean }>('/auth/logout');
}

export function hasModule(user: CurrentUser, module: ModuleKey): boolean {
  return user.modules.includes(module);
}

export function hasRole(user: CurrentUser, role: string): boolean {
  return user.roles.includes(role);
}
