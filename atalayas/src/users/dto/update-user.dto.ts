import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsString, IsOptional, IsEmail, isEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {

@ApiProperty({ example: 'Email del usuario', required: false })
@IsEmail()
@IsOptional()
email?: string;

@ApiProperty({ example: 'Nombre del usuario', required: false })
@IsString()
@IsOptional()
name?: string;
}
