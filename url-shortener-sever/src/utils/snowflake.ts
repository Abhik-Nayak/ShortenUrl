/**
 * A Twitter Snowflake-like ID Generator.
 * Snowflake IDs are 64-bit integers composed of:
 * - 41 bits for timestamp (milliseconds since a custom epoch)
 * - 10 bits for machine/worker ID (to avoid collisions across different servers)
 * - 12 bits for a sequence number (to prevent collisions in the same millisecond)
 */
export class Snowflake {
  private workerId: bigint;
  private sequence: bigint = 0n;
  private lastTimestamp: bigint = -1n;

  // Custom Epoch (e.g., Jan 1, 2024)
  private readonly EPOCH = 1704067200000n;
  
  private readonly workerIdBits = 10n;
  private readonly sequenceBits = 12n;
  
  private readonly maxWorkerId = -1n ^ (-1n << this.workerIdBits); // 1023
  private readonly sequenceMask = -1n ^ (-1n << this.sequenceBits); // 4095

  private readonly workerIdShift = this.sequenceBits; // 12
  private readonly timestampLeftShift = this.sequenceBits + this.workerIdBits; // 22

  constructor(workerId: number = 0) {
    if (BigInt(workerId) > this.maxWorkerId || workerId < 0) {
      throw new Error(`workerId must be between 0 and ${this.maxWorkerId}`);
    }
    this.workerId = BigInt(workerId);
  }

  private timeGen(): bigint {
    return BigInt(Date.now());
  }

  private tilNextMillis(lastTimestamp: bigint): bigint {
    let timestamp = this.timeGen();
    while (timestamp <= lastTimestamp) {
      timestamp = this.timeGen();
    }
    return timestamp;
  }

  public nextId(): bigint {
    let timestamp = this.timeGen();

    if (timestamp < this.lastTimestamp) {
      throw new Error("Clock moved backwards. Refusing to generate id");
    }

    if (this.lastTimestamp === timestamp) {
      this.sequence = (this.sequence + 1n) & this.sequenceMask;
      if (this.sequence === 0n) {
        // Sequence exhausted for this millisecond, wait for the next
        timestamp = this.tilNextMillis(this.lastTimestamp);
      }
    } else {
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    // Combine the parts
    return (
      ((timestamp - this.EPOCH) << this.timestampLeftShift) |
      (this.workerId << this.workerIdShift) |
      this.sequence
    );
  }
}

// Create a single instance for this Node.js process.
// For distributed deployments, pass a unique worker ID (0-1023) via environment variables
export const idGenerator = new Snowflake(Number(process.env.WORKER_ID) || 0);
