import { Transform } from 'class-transformer'
import {
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator'

export class RegisterUserDto {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  @Length(5, 20)
  @Transform(({ value }) => value.trim().toLowerCase())
  @Matches(/^[a-z0-9]+$/, { message: 'username can contain => az , A-Z, 0-9' })
  username: string

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  @Length(5, 20)
  password: string

  @IsDefined()
  @IsNotEmpty()
  @IsEmail()
  email: string

  @IsOptional()
  @IsNotEmpty()
  @Length(1, 30)
  name?: string

  @IsOptional()
  @IsNotEmpty()
  @Length(1, 250)
  biography?: string
}
