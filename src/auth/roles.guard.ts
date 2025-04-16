import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { ADMIN_ONLY_KEY } from './admin-only.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    const isAdminOnly = this.reflector.getAllAndOverride<boolean>(ADMIN_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles && !isAdminOnly) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (isAdminOnly && user.role !== 'admin') {
      throw new UnauthorizedException('只有管理员可以执行此操作');
    }

    return requiredRoles ? requiredRoles.some((role) => user.role === role) : true;
  }
}