import { PermissionsByModule } from './permissionsService';

const CACHE_KEY = 'rbac_permissions_cache';

export interface CachedPermissions {
  hasPermissions: boolean;
  permissions: PermissionsByModule;
  userId: string;
  timestamp: number;
}

/**
 * Obtener permisos desde el caché si son válidos
 * El caché dura toda la sesión (hasta que se cierre sesión o se invalide manualmente)
 */
export function getCachedPermissions(userId: string): CachedPermissions | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CachedPermissions = JSON.parse(cached);

    // Verificar que el caché sea del mismo usuario
    // No verificamos expiración por tiempo - el caché dura toda la sesión
    if (data.userId === userId) {
      return data;
    }

    // Caché de otro usuario, limpiarlo
    clearCachedPermissions();
    return null;
  } catch (error) {
    console.error('Error reading permissions cache:', error);
    return null;
  }
}

/**
 * Guardar permisos en el caché
 */
export function saveCachedPermissions(
  userId: string,
  hasPermissions: boolean,
  permissions: PermissionsByModule
): void {
  try {
    const data: CachedPermissions = {
      hasPermissions,
      permissions,
      userId,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving permissions cache:', error);
  }
}

/**
 * Limpiar el caché de permisos
 * Útil cuando se aprueban solicitudes o se cambian permisos
 */
export function clearCachedPermissions(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing permissions cache:', error);
  }
}

