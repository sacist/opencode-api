import { z } from 'zod'
import { BaseController } from '#classes/BaseController'
import { authService } from './auth.service.js'

class AuthController extends BaseController {
  public addUser = this.run(
    {
      body: z.object({
        username: z.string().min(3).max(64),
        password: z.string().min(4).max(128)
      })
    },
    async (req) => {
      const { username, password } = req.valid!.body as { username: string; password: string }
      return authService.addUser(username, password)
    }
  )
}

export const authController = new AuthController()
