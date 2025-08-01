import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from '@app/db/db.module';
import { ExecuterModule } from '@app/executer/executer.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    DbModule,
    ExecuterModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
