import prisma from '../db/index.js';

const RETRY_DELAYS_MS = [
  30 * 1000, // 30 seconds
  2 * 60 * 1000, // 2 minutes
  5 * 60 * 1000, // 5 minutes
];

// Called by moderation commands instead of sending DMs directly.
// Attempts delivery immediately — falls back to queue on failure.
export async function sendDM(client, userId, message, infractionId = null) {
  // Attempt immediate delivery
  try {
    const user = await client.users.fetch(userId);
    await user.send(message);

    // Delivered immediately — record status on the infraction
    if (infractionId) {
      await prisma.infraction.update({
        where: { id: infractionId },
        data: { dmStatus: 'delivered' },
      });
    }

    return { delivered: true };
  } catch (err) {
    // DMs disabled — do not queue, never recoverable
    if (err.code === 50007) {
      if (infractionId) {
        await prisma.infraction.update({
          where: { id: infractionId },
          data: { dmStatus: 'disabled' },
        });
      }
      return { delivered: false, reason: 'disabled' };
    }

    // Any other failure — add to queue for retry
    await prisma.dmQueue.create({
      data: {
        userId,
        infractionId,
        messageContent: typeof message === 'string' ? message : JSON.stringify(message), // embeds get serialised
        attempts: 0,
        status: 'pending',
        nextRetry: new Date(), // eligible for retry immediately
      },
    });

    return { delivered: false, reason: 'queued' };
  }
}

// Processes all pending queue entries whose nextRetry <= now.
// Called on bot startup and by the interval processor.
export async function processQueue(client) {
  const pending = await prisma.dmQueue.findMany({
    where: {
      status: 'pending',
      nextRetry: { lte: new Date() },
    },
  });

  for (const entry of pending) {
    await processEntry(client, entry);
  }
}

// Processes a single queue entry.
async function processEntry(client, entry) {
  try {
    const user = await client.users.fetch(entry.userId);

    // Deserialise message — string or embed object
    let message;
    try {
      message = JSON.parse(entry.messageContent);
    } catch {
      message = entry.messageContent;
    }

    await user.send(typeof message === 'string' ? message : { embeds: [message] });

    // Success — mark delivered
    await prisma.dmQueue.update({
      where: { id: entry.id },
      data: { status: 'delivered', lastAttempt: new Date() },
    });

    if (entry.infractionId) {
      await prisma.infraction.update({
        where: { id: entry.infractionId },
        data: { dmStatus: 'delivered' },
      });
    }
  } catch (err) {
    const newAttempts = entry.attempts + 1;

    // DMs got disabled between queuing and retry — give up
    if (err.code === 50007) {
      await prisma.dmQueue.update({
        where: { id: entry.id },
        data: { status: 'failed', attempts: newAttempts, lastAttempt: new Date() },
      });
      if (entry.infractionId) {
        await prisma.infraction.update({
          where: { id: entry.infractionId },
          data: { dmStatus: 'disabled' },
        });
      }
      return;
    }

    // Exhausted all retries
    if (newAttempts >= RETRY_DELAYS_MS.length + 1) {
      await prisma.dmQueue.update({
        where: { id: entry.id },
        data: { status: 'failed', attempts: newAttempts, lastAttempt: new Date() },
      });
      if (entry.infractionId) {
        await prisma.infraction.update({
          where: { id: entry.infractionId },
          data: { dmStatus: 'failed' },
        });
      }
      return;
    }

    // Schedule next retry
    const delayMs = RETRY_DELAYS_MS[newAttempts - 1] ?? RETRY_DELAYS_MS.at(-1);
    const nextRetry = new Date(Date.now() + delayMs);

    await prisma.dmQueue.update({
      where: { id: entry.id },
      data: {
        attempts: newAttempts,
        lastAttempt: new Date(),
        nextRetry,
      },
    });
  }
}

// Starts the background interval that sweeps the queue every 60 seconds.
// Call this once from your ready event.
export function startQueueProcessor(client) {
  // Process anything that was pending before this boot
  processQueue(client);

  // Then sweep every 60 seconds
  setInterval(() => processQueue(client), 60 * 1000);
}
