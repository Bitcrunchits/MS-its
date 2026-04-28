import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { USER_MS } from './config';

@Module({
  imports: [
    ClientsModule.register([
      { name: USER_MS, options: { host: 'localhost', port: 3001 } },
    ]),
  ],
  controllers: [AppController],
})
export class AppModule {}
