import { parentPort } from 'worker_threads'

if (!parentPort) {
  throw new Error('This script must be run as a Worker thread')
}

parentPort.on('message', (message: { duration: number }) => {
  console.log('Worker received message:', message)

  const duration = message.duration || 5
  console.log(`Worker starting CPU-intensive task for ${duration} seconds...`)

  // CPU-intensive blocking loop - simulates heavy processing
  // This blocks the WORKER thread, NOT the main thread
  const end = Date.now() + duration * 1000
  while (Date.now() < end) {
    // Intentional busy loop to simulate CPU work
  }

  console.log(`Worker completed ${duration}s of processing`)

  parentPort?.postMessage({
    status: 'completed',
    duration,
    timestamp: new Date().toISOString(),
  })
})
