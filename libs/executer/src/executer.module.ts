import { Module } from "@nestjs/common";
import { ExecuterService } from "./executer.service";
import { DbModule } from "@app/db";

@Module({
  imports: [DbModule],
  providers: [ExecuterService],
  exports: [ExecuterService],
})
export class ExecuterModule {}
