import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { strategies, tokens } from "./seed";

@Injectable()
export class DbService {
  constructor(private readonly prismaService: PrismaService) {}

  onModuleInit() {
    strategies.forEach(async (strategy) => {
      const existing = await this.prismaService.strategy.findFirst({
        where: { name: strategy.name },
      });
      if (!existing) {
        const newStrategy = await this.prismaService.strategy.create({
          data: strategy,
        });
        console.log("Created strategy", newStrategy);
      }
    });

    tokens.forEach(async (token) => {
      const existing = await this.prismaService.token.findFirst({
        where: { address: token.address },
      });
      if (!existing) {
        const newToken = await this.prismaService.token.create({
          data: token,
        });
        console.log("Created token", newToken);
      }
    });
  }
  client = this.prismaService;
}
