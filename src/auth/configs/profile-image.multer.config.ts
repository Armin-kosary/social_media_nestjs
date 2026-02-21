import { BadRequestException } from '@nestjs/common'
import { diskStorage } from 'multer'
import { v4 as uuidv4 } from 'uuid'

// PROFILE IMAGE UPLOAD CONFIGS - START
const allowedProfileImageTypes = [
  'image/jpg',
  'image/png',
  'image/jpeg',
  'image/heic',
]
const maxProfileImageSize = 25 * 1024 * 1024

export const multerProfileConfig = {
  storage: diskStorage({
    destination: './uploads/profile-images',

    filename: (req, file, callback) => {
      const timestamp = Date.now()
      const uniqueId = uuidv4()
      const fileExt = file.originalname.split('.').pop()

      const filename = `${timestamp}-${uniqueId}.${fileExt}`
      callback(null, filename)
    },
  }),
  fileFilter: (req, file, callback) => {
    if (allowedProfileImageTypes.includes(file.mimetype)) {
      callback(null, true)
    } else {
      callback(new BadRequestException('file type not allowed'), false)
    }
  },
  limits: { fileSize: maxProfileImageSize },
}
