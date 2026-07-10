import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module.js';
import { UserModule } from './user/user.module';
import { AgentModule } from './agent/agent.module.js';

@Module({
  imports: [PrismaModule, UserModule, AgentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
