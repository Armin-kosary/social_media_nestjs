import { Transform } from 'class-transformer'
import {
  IsDefined,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator'

export class LoginUserDto {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  @Length(5, 20)
  @Transform(({ value }) => value.trim().toLowerCase())
  @Matches(/^[a-z0-9]+$/, { message: 'username can contain => az , A-Z, 0-9' })
  username: string

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Length(5, 20)
  password: string
}
