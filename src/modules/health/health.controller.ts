import { BaseController } from '#classes/BaseController'

class HealthController extends BaseController {
  public check = this.run({}, async () => ({ status: 'ok' }))
}

export const healthController = new HealthController()
