import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { CreateLogDto } from '../dto/create-log.dto';

@Controller()
export class AppController {
  @EventPattern({ log: 'create' })

  handleLog(@Payload() data: CreateLogDto) {

    const log = {
      ...data,

      // Momento en que ocurrió el evento en el Gateway
      eventTimestamp: new Date(data.eventTimestamp),

      // Momento en que Logs-MS recibió el evento
      receivedAt: new Date(),
    }

    console.log('LOG RECIBIDO EN LOGS-MS:', data);
    console.log(log);
  }
}
