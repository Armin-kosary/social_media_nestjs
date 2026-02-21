import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { LoginUserDto } from './dto/login-user-dto'
import { AuthService } from './auth.service'
import { RegisterUserDto } from './dto/register-user.dto'
import { FileInterceptor } from '@nestjs/platform-express'
import { multerProfileConfig } from './configs/profile-image.multer.config'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseInterceptors(FileInterceptor('profile_image', multerProfileConfig))
  async register(
    @Body() registerUserDto: RegisterUserDto,
    @UploadedFile() file,
  ) {
    console.log('ct')
    return await this.authService.register(
      registerUserDto,
      `http://localhost:3000/profile-images/${file.filename}`,
    )
  }

  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto) {
    return await this.authService.login(loginUserDto)
  }
}
