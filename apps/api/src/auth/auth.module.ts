import { Global, type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AdminGuard, AuthGuard } from './auth.guards';
import { AuthController } from './auth.controller';
import { GoogleAuthController } from './google-auth.controller';
import { GoogleAuthService } from './google-auth.service';
import { AUTH_COOKIE, AuthService } from './auth.service';

@Global()
@Module({
  controllers: [AuthController, GoogleAuthController],
  providers: [AuthService, GoogleAuthService, AuthGuard, AdminGuard],
  exports: [AuthService, AuthGuard, AdminGuard],
})
export class AuthModule implements NestModule {
  constructor(private readonly auth: AuthService) {}

  /** Attaches `req.user` when a valid session cookie is present; never blocks the request. */
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply((req: Request, _res: Response, next: NextFunction) => {
        const token = (req.cookies as Record<string, string | undefined> | undefined)?.[
          AUTH_COOKIE
        ];
        if (!token) {
          next();
          return;
        }
        this.auth
          .resolve(token)
          .then((user) => {
            if (user) req.user = user;
            next();
          })
          .catch(next);
      })
      .forRoutes('*');
  }
}
