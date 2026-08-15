import { Controller, Get, Inject } from '@nestjs/common';
import { LOGS_MS, USER_MS, } from './config';
import { ClientProxy } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(
    @Inject(USER_MS)
    private readonly userClients: ClientProxy,

    @Inject(LOGS_MS)
    private readonly logsClients: ClientProxy,

  ) { }

  @Get()
  getHello() {

    this.logsClients
    .emit(
      { log: 'create' },
      {
        level: 'error',
        service: 'gateway',
        action: 'GET_HELLO',
        message: 'Prueba de comunicacion Gateway -> Logs-MS',

        eventTimestamp: new Date().toISOString(),
      },
    )
    .subscribe();

    // Envia info pero no espera respuesta
    this.userClients
      .emit({ user: 'getHello' }, { data: 'Hola desde el gateway' })
      .subscribe();
    // Envia info y espera respuesta
    return this.userClients.send(
      { user: 'getHello' },
      { data: 'Envío info desde el gateway para esperar respuesta' },
    );
  }
}
