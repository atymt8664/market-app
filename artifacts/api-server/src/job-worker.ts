import "./load-env";
import { bootstrapJobWorker } from "./lib/jobs/worker-bootstrap";
import { logger } from "./lib/logger";

void bootstrapJobWorker().catch((err) => {
  logger.error({ err }, "P15 job worker failed to start");
  process.exit(1);
});
