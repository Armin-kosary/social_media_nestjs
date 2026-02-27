import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
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
    private readonly configService: ConfigService,
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

    //   CREATE JWT TOKENS AND SEND IN RESPONSE
    const accessToken = this.generateAccessToken(user.id, user.username)
    const refreshToken = this.generateRefreshToken(user.id, user.username)

    //   STORE HASHED REFRESH TOKEN IN DATABASE
    const hashedRefreshToken = await this.hashToken(refreshToken)
    const refreshTokenExpiresIn = parseInt(
      this.configService.get('JWT_REFRESH_EXPIRE_IN') || '604800000',
    )
    const expiresAt = new Date(Date.now() + refreshTokenExpiresIn)

    await this.prismaService.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId: user.id,
        expiresAt,
      },
    })

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get('JWT_EXPIRE_IN'),
    }
  }

  private generateAccessToken(userId: number, username: string): string {
    const payload = { username, sub: userId }
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET_KEY'),
      expiresIn: this.configService.get('JWT_EXPIRE_IN') || '900',
    })
  }

  private generateRefreshToken(userId: number, username: string): string {
    const payload = { username, sub: userId }
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET_KEY'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRE_IN') || '604800',
    })
  }

  private async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10)
  }

  private async compareToken(
    token: string,
    hashedToken: string,
  ): Promise<boolean> {
    return bcrypt.compare(token, hashedToken)
  }

  async refreshAccessToken(
    userId: number,
    username: string,
    incomingToken: string,
  ) {
    //   VERIFY THAT REFRESH TOKEN EXISTS IN DATABASE
    const storedRefreshToken = await this.prismaService.refreshToken.findFirst({
      where: {
        userId,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!storedRefreshToken)
      throw new UnauthorizedException('Refresh token not found')

    //   VERIFY INCOMING TOKEN MATCHES STORED HASHED TOKEN
    const tokenIsValid = await this.compareToken(
      incomingToken,
      storedRefreshToken.token,
    )
    if (!tokenIsValid)
      throw new UnauthorizedException('Refresh token is invalid')

    //   CHECK IF REFRESH TOKEN IS EXPIRED
    if (new Date() > storedRefreshToken.expiresAt) {
      await this.prismaService.refreshToken.delete({
        where: { id: storedRefreshToken.id },
      })
      throw new UnauthorizedException('Refresh token has expired')
    }

    //   DELETE OLD REFRESH TOKEN
    await this.prismaService.refreshToken.delete({
      where: { id: storedRefreshToken.id },
    })

    //   GENERATE NEW ACCESS TOKEN AND REFRESH TOKEN
    const newAccessToken = this.generateAccessToken(userId, username)
    const newRefreshToken = this.generateRefreshToken(userId, username)

    //   STORE NEW HASHED REFRESH TOKEN IN DATABASE
    const hashedNewRefreshToken = await this.hashToken(newRefreshToken)
    const refreshTokenExpiresIn = parseInt(
      this.configService.get('JWT_REFRESH_EXPIRE_IN') || '604800000',
    )
    const expiresAt = new Date(Date.now() + refreshTokenExpiresIn)

    await this.prismaService.refreshToken.create({
      data: {
        token: hashedNewRefreshToken,
        userId,
        expiresAt,
      },
    })

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: this.configService.get('JWT_EXPIRE_IN'),
    }
  }

  async logout(userId: number) {
    //   DELETE ALL REFRESH TOKENS FOR THIS USER
    await this.prismaService.refreshToken.deleteMany({
      where: { userId },
    })
    return { message: 'Successfully logged out' }
  }

  async logoutAllDevices(userId: number) {
    //   DELETE ALL REFRESH TOKENS FOR THIS USER
    return this.logout(userId)
  }
}
