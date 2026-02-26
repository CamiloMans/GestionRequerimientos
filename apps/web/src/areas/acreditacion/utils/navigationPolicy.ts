import { AreaId } from '@contracts/areas';
import type { PermissionsByModule } from '@shared/rbac/permissionsService';

export type AcreditacionAccessLevel = 'none' | 'viewer' | 'editor' | 'admin';

export interface AcreditacionNavigationPolicy {
  accessLevel: AcreditacionAccessLevel;
  isAdmin: boolean;
  isRestrictedCollaborator: boolean;
  canAccessDashboards: boolean;
  canAccessRequestsSst: boolean;
  canAccessFieldRequest: boolean;
  canAccessReports: boolean;
  defaultRoute: 'dashboards' | 'reports';
}

export const DEFAULT_ACREDITACION_NAVIGATION_POLICY: AcreditacionNavigationPolicy = {
  accessLevel: 'none',
  isAdmin: false,
  isRestrictedCollaborator: false,
  canAccessDashboards: false,
  canAccessRequestsSst: false,
  // Fail-closed para botones restringidos; estos dos quedan visibles para evitar UI vacía
  // mientras se resuelven permisos del colaborador.
  canAccessFieldRequest: true,
  canAccessReports: true,
  defaultRoute: 'reports',
};

export const buildAcreditacionNavigationPolicy = (
  permissions: PermissionsByModule
): AcreditacionNavigationPolicy => {
  const moduleCode = AreaId.ACREDITACION.toLowerCase();
  const modulePerms = permissions[moduleCode] || {
    view: false,
    create: false,
    edit: false,
    delete: false,
    admin: false,
  };

  const accessLevel: AcreditacionAccessLevel = modulePerms.admin
    ? 'admin'
    : modulePerms.edit || modulePerms.create || modulePerms.delete
      ? 'editor'
      : modulePerms.view
        ? 'viewer'
        : 'none';

  const isAdmin = modulePerms.admin === true;
  const hasCollaboratorAccess = Boolean(
    modulePerms.view || modulePerms.edit || modulePerms.create || modulePerms.delete
  );
  const isRestrictedCollaborator = !isAdmin && hasCollaboratorAccess;

  if (isAdmin) {
    return {
      accessLevel,
      isAdmin: true,
      isRestrictedCollaborator: false,
      canAccessDashboards: true,
      canAccessRequestsSst: true,
      canAccessFieldRequest: true,
      canAccessReports: true,
      defaultRoute: 'dashboards',
    };
  }

  if (isRestrictedCollaborator) {
    return {
      accessLevel,
      isAdmin: false,
      isRestrictedCollaborator: true,
      canAccessDashboards: false,
      canAccessRequestsSst: false,
      canAccessFieldRequest: true,
      canAccessReports: true,
      defaultRoute: 'reports',
    };
  }

  return {
    accessLevel,
    isAdmin: false,
    isRestrictedCollaborator: false,
    canAccessDashboards: false,
    canAccessRequestsSst: false,
    canAccessFieldRequest: false,
    canAccessReports: false,
    defaultRoute: 'reports',
  };
};
