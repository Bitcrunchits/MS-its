import { IsDateString, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateLogDto {
    @IsIn(['info', 'warn', 'error'])
    level!: 'info' | 'warn' | 'error';

    @IsString()
    service!: string;

    @IsString()
    action!: string;

    @IsString()
    message!: string;

    @IsDateString()
    eventTimestamp!: string;

    @IsString()
    @IsOptional()
    userId?: string;

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
}