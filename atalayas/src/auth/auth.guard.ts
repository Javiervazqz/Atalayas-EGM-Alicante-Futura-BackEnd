import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly authService: AuthService, private readonly prismaService: PrismaService) {}
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if(!authHeader) return false;

        const token = authHeader.split(' ')[1];
        
        if(!token) return false;

        const authUser = await this.authService.getUser(token);

        if(!authUser) return false;

        const publicUser = await this.prismaService.user.findUnique({
            where: { id: authUser.id },
        });

        if(!publicUser) return false;

        request.user = publicUser;
        
        return true;
    }
}