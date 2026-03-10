import { IsEmail, IsString } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
export class CreateUserDto {
    
    @ApiProperty({example: 'ejemplo@ejemplo.com'})
    @IsEmail()
    email:string;

    @ApiProperty({example: 'Nombre del usuario'})
    @IsString()
    name:string;
}