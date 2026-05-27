import os from "node:os";
import { statfs } from "node:fs/promises";

export type ServerMetricsSnapshot = {
  cpu: {
    cores: number;
    loadAvg1m: number | null;
    loadAvg5m: number | null;
    loadAvg15m: number | null;
    processCpuUserMicros: number;
    processCpuSystemMicros: number;
  };
  memory: {
    systemTotalMb: number;
    systemFreeMb: number;
    systemUsedPercent: number | null;
    processRssMb: number;
    processHeapUsedMb: number;
    processHeapTotalMb: number;
  };
  disk: {
    available: boolean;
    totalGb: number | null;
    freeGb: number | null;
    usedPercent: number | null;
  };
  network: {
    interfaceCount: number;
    activeInterfaceCount: number;
  };
  connections: {
    activeSocketConnections: number;
  };
  process: {
    pid: number;
    uptimeSeconds: number;
    nodeVersion: string;
  };
};

export async function snapshotServerMetrics(): Promise<ServerMetricsSnapshot> {
  const mem = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const load = os.loadavg();
  const interfaces = os.networkInterfaces();
  let activeInterfaceCount = 0;
  for (const entries of Object.values(interfaces)) {
    if (!entries) continue;
    if (entries.some((entry) => !entry.internal && entry.address)) {
      activeInterfaceCount += 1;
    }
  }

  let disk: ServerMetricsSnapshot["disk"] = {
    available: false,
    totalGb: null,
    freeGb: null,
    usedPercent: null,
  };
  try {
    const stats = await statfs(process.cwd());
    const blockSize = stats.bsize;
    const totalBytes = stats.blocks * blockSize;
    const freeBytes = stats.bfree * blockSize;
    if (totalBytes > 0) {
      const totalGb = Math.round((totalBytes / 1024 / 1024 / 1024) * 100) / 100;
      const freeGb = Math.round((freeBytes / 1024 / 1024 / 1024) * 100) / 100;
      const usedPercent = Math.round(((totalBytes - freeBytes) / totalBytes) * 1000) / 10;
      disk = { available: true, totalGb, freeGb, usedPercent };
    }
  } catch {
    disk = { available: false, totalGb: null, freeGb: null, usedPercent: null };
  }

  return {
    cpu: {
      cores: os.cpus().length,
      loadAvg1m: load[0] ?? null,
      loadAvg5m: load[1] ?? null,
      loadAvg15m: load[2] ?? null,
      processCpuUserMicros: cpuUsage.user,
      processCpuSystemMicros: cpuUsage.system,
    },
    memory: {
      systemTotalMb: Math.round(totalMem / 1024 / 1024),
      systemFreeMb: Math.round(freeMem / 1024 / 1024),
      systemUsedPercent:
        totalMem > 0 ? Math.round(((totalMem - freeMem) / totalMem) * 1000) / 10 : null,
      processRssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
      processHeapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
      processHeapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10,
    },
    disk,
    network: {
      interfaceCount: Object.keys(interfaces).length,
      activeInterfaceCount,
    },
    connections: {
      activeSocketConnections: poolActiveHandles(),
    },
    process: {
      pid: process.pid,
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
    },
  };
}

function poolActiveHandles(): number {
  const proc = process as NodeJS.Process & { _getActiveHandles?: () => unknown[] };
  if (typeof proc._getActiveHandles === "function") {
    return proc._getActiveHandles().length;
  }
  return 0;
}
