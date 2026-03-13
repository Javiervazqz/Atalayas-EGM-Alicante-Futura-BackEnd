import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface RequestWithUser {
  user: any;
}

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return request.user; // Esto saca el usuario que el AuthGuard inyectó
  },
);
