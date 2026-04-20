import { serverRepository, gpuRepository } from '../repositories';
import { publish, EventSubjects } from '../mq';
import type { ServerRegisteredEvent, ServerStatusChangedEvent } from '../mq';
import { ServerCreateInputSchema } from '../models';
import type { Server, ServerCreateInput, ServerFilter, ServerStatus } from '../models';

export class ServerService {
  async registerServer(data: ServerCreateInput): Promise<Server> {
    const validated = ServerCreateInputSchema.parse(data);
    const server = await serverRepository.create({ ...validated, status: 'ONLINE' });

    const memoryPerGpu = server.totalMemory / BigInt(server.gpuCount);
    await gpuRepository.createMany(server.id, server.gpuModel, memoryPerGpu, server.gpuCount);

    await publish<ServerRegisteredEvent>(EventSubjects.SERVER_REGISTERED, {
      serverId: server.id,
      name: server.name,
      ip: server.ip,
      gpuCount: server.gpuCount,
      gpuModel: server.gpuModel,
    });

    return server;
  }

  async unregisterServer(id: string): Promise<void> {
    const hasActive = await serverRepository.hasActiveAllocations(id);
    if (hasActive) throw new Error('Server has active allocations');
    await serverRepository.delete(id);
  }

  async listServers(filter?: ServerFilter): Promise<Server[]> {
    return serverRepository.findMany(filter);
  }

  async getServer(id: string): Promise<Server> {
    const server = await serverRepository.findById(id);
    if (!server) throw new Error('Server not found');
    return server;
  }

  async updateServerStatus(id: string, status: ServerStatus): Promise<Server> {
    const current = await this.getServer(id);
    const updated = await serverRepository.updateStatus(id, status);

    await publish<ServerStatusChangedEvent>(EventSubjects.SERVER_STATUS_CHANGED, {
      serverId: id,
      previousStatus: current.status,
      newStatus: status,
    });

    return updated;
  }
}

export const serverService = new ServerService();
