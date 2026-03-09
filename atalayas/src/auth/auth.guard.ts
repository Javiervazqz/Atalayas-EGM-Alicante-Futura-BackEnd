import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly authService: AuthService) {}
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if(!authHeader) return false;

        const token = authHeader.split(' ')[1];
        
        if(!token) return false;

        const user = await this.authService.getUser(token);

        if(!user) return false;

        request.user = user;
        
        return true;
    }
}