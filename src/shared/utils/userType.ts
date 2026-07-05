export type UserType = 'ano' | 'cadet';

export function resolveUserType(data?: { userType?: string } | null): UserType {
  return data?.userType === 'ano' ? 'ano' : 'cadet';
}

export function isAnoUser(data?: { userType?: string } | null): boolean {
  return resolveUserType(data) === 'ano';
}

export function isCadetUser(data?: { userType?: string } | null): boolean {
  return resolveUserType(data) === 'cadet';
}
