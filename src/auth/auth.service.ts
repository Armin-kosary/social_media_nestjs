import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { PrismaService } from 'src/prisma/prisma.service'
import { RegisterUserDto } from './dto/register-user.dto'
import { LoginUserDto } from './dto/login-user-dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerUserDto: RegisterUserDto, file: string) {
    //   READ USERNAME FROM DB
    const existUsername = await this.prismaService.user.findUnique({
      where: { username: registerUserDto.username },
    })

    //   THROW ERROR IF USERNAME WAS TAKEN
    if (existUsername) throw new BadRequestException('This username is taken')

    //   CREATE NEW USER IF USERNAME IS AVAILABLE TO TAKE
    registerUserDto.password = await bcrypt.hash(registerUserDto.password, 10)
    const newUser = await this.prismaService.user.create({
      data: { ...registerUserDto, profile: file },
      select: { username: true, name: true, email: true, profile: true },
    })
    return newUser
  }

  async login(loginUserDto: LoginUserDto) {
    //   CHECK USER AVAILABLE OR NOT - IF NOT => THROW ERROR
    const user = await this.prismaService.user.findUnique({
      where: { username: loginUserDto.username },
      select: { id: true, username: true, password: true },
    })
    if (!user)
      throw new BadRequestException(
        `There is no user with username : ${loginUserDto.username}`,
      )

    //   VALIDATE PASSWORDS
    if (!(await bcrypt.compare(loginUserDto.password, user.password)))
      throw new UnauthorizedException('Password is incorrect')

    //   CREATE JWT TOKEN AND SEND IN RESPONSE
    const payload = { username: user.username, sub: user.id }
    const token = this.jwtService.sign(payload)
    return { AccessToken: token }
  }
}
