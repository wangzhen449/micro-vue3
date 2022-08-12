const queue = []
let isFlushing = false
const resolvedPromise = Promise.resolve()

// TODO 执行顺序需要注意 子组件和父组件，uid靠前的应该先执行
export function queueJob(job) {
  if (!queue.length || !queue.includes(job)) {
    queue.push(job)

    queueFlush()
  }
}

function queueFlush() {
  if (!isFlushing) {
    isFlushing = true
    resolvedPromise.then(flushJobs)
  }
}

function flushJobs() {
  try {
    for (let i = 0; i < queue.length; i++) {
      const job = queue[i]
      if (job && job.avtive !== false) {
        job()
      }
    }
  } finally {
    queue.length = 0
    isFlushing = false
  }
}
