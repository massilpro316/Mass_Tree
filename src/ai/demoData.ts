import type { ConceptDraft, Difficulty } from "../types";

/** Hand-written content for the offline demo topic, "How does Laravel Queue work?". */
type Entry = Omit<ConceptDraft, "title">;

const c = (icon: string, difficulty: Difficulty, summary: string, details: string): Entry => ({
  icon,
  difficulty,
  summary,
  details,
});

export const DEMO_QUESTION = "How does Laravel Queue work?";

export const DEMO_ROOT: ConceptDraft & { concepts: string[] } = {
  title: "Laravel Queue",
  icon: "📬",
  difficulty: "Intermediate",
  summary:
    "Laravel queues push slow work (emails, reports, API calls) into a backlog that background workers process later, so web requests stay fast.",
  details: `Instead of doing heavy work during an HTTP request, your app **dispatches a job**. The job is serialized and stored by a **queue driver** (Redis, database, SQS…).

A long-running **worker** process (\`php artisan queue:work\`) pulls jobs off the queue one by one, rebuilds them and calls their \`handle()\` method.

- Requests return immediately
- Work is retried when it fails
- You can scale by running more workers`,
  concepts: ["Jobs", "Dispatching", "Driver", "Worker"],
};

export const DEMO_CONCEPTS: Record<string, Entry> = {
  jobs: c("📦", "Beginner", "A job is a small class describing one unit of background work, with a handle() method that does it.", `A job is a class that usually implements \`ShouldQueue\`. Its constructor captures the data it needs, and \`handle()\` performs the work.

\`\`\`php
class SendInvoice implements ShouldQueue
{
    use Dispatchable, Queueable;
    public function __construct(public Order $order) {}
    public function handle(Mailer $mail) { /* ... */ }
}
\`\`\`

Jobs can declare \`$tries\`, \`$timeout\` and \`backoff()\` to control retries.`),
  dispatching: c("🚀", "Beginner", "Dispatching serializes a job and hands it to the queue connection instead of running it immediately.", `Calling \`SendInvoice::dispatch($order)\` creates a **pending dispatch**. When it is destroyed, Laravel serializes the job and pushes it onto the configured connection and queue.

- \`->onQueue('emails')\` chooses a queue name
- \`->delay(now()->addMinutes(5))\` schedules it later
- \`->afterCommit()\` waits for the DB transaction to commit`),
  driver: c("🔌", "Intermediate", "The driver is the storage backend that actually holds queued jobs: Redis, database, SQS, Beanstalkd or sync.", `Each **connection** in \`config/queue.php\` uses a driver. The driver knows how to *push*, *pop*, *release* and *delete* jobs in its backend.

- **sync** runs jobs immediately (great for tests)
- **database** stores jobs in a \`jobs\` table
- **redis** uses lists and sorted sets for speed
- **sqs** delegates storage to AWS`),
  worker: c("⚙️", "Advanced", "A worker is a long-running process that pops jobs from the queue and executes them, one at a time.", `Started with \`php artisan queue:work\`, a worker boots the framework **once** and then loops forever: fetch a job, run it, acknowledge it, repeat.

Because the app stays in memory, workers are fast — but code changes need \`queue:restart\` to be picked up. In production a process manager such as **Supervisor** keeps workers alive.`),
  process: c("🧬", "Advanced", "Each worker is a separate OS process running PHP CLI, with its own memory and its own booted copy of the app.", `A worker is just \`php artisan queue:work\` running as a normal OS process. You scale throughput by running **several processes**, typically via Supervisor's \`numprocs\`.

Each process has its own memory, so state does not leak between workers — but singletons *can* leak between jobs inside the same process.`),
  loop: c("🔁", "Advanced", "The daemon loop repeatedly asks the driver for the next job, runs it, and sleeps when the queue is empty.", `Inside \`Worker::daemon()\` Laravel runs roughly:

1. Check if it should stop (restart signal, memory limit, max jobs)
2. \`getNextJob()\` from the connection
3. If found, \`process()\` it; otherwise \`sleep\`
4. Repeat

The \`--sleep\`, \`--max-jobs\` and \`--max-time\` options tune this loop.`),
  signals: c("📡", "Expert", "Workers listen for POSIX signals like SIGTERM to finish the current job and exit gracefully.", `When pcntl is available, the worker registers handlers:

- **SIGTERM / SIGQUIT** → finish the current job, then stop
- **SIGUSR2** → pause, **SIGCONT** → resume
- **SIGALRM** → enforce the job \`timeout\` by killing the process

This is why deploys can stop workers safely without cutting a job in half.`),
  payload: c("🧾", "Intermediate", "The payload is the JSON envelope stored in the queue: job class, serialized data, attempts and metadata.", `When dispatched, a job becomes JSON similar to:

\`\`\`json
{ "uuid": "…", "displayName": "SendInvoice",
  "job": "Illuminate\\\\Queue\\\\CallQueuedHandler@call",
  "attempts": 0, "data": { "command": "O:11:…" } }
\`\`\`

The worker reads this envelope to know what to rebuild and run.`),
  serialization: c("🧪", "Intermediate", "Job properties are serialized; Eloquent models are stored as identifiers and re-fetched when the job runs.", `The \`SerializesModels\` trait replaces models with a lightweight identifier (class + key). When the worker unserializes the job, the model is **re-queried** from the database.

This keeps payloads small, but means the job sees the *current* row, not a snapshot from dispatch time.`),
  "handle method": c("🛠️", "Beginner", "handle() contains the job's actual work; its parameters are resolved from the service container.", `Laravel calls \`handle()\` through the container, so you can type-hint dependencies:

\`\`\`php
public function handle(PaymentGateway $gateway) { … }
\`\`\`

Throwing an exception marks the attempt as failed; Laravel then retries or moves the job to \`failed_jobs\`.`),
  redis: c("🟥", "Intermediate", "The Redis driver stores jobs in Redis lists, with sorted sets for delayed and reserved jobs.", `- \`queues:default\` — a list of ready jobs
- \`queues:default:delayed\` — a sorted set scored by run time
- \`queues:default:reserved\` — jobs currently being processed

Lua scripts move jobs atomically between these structures so two workers never grab the same job.`),
  database: c("🗄️", "Beginner", "The database driver keeps jobs in a jobs table and reserves them with row locks.", `Jobs are rows with \`queue\`, \`payload\`, \`attempts\`, \`reserved_at\` and \`available_at\`. A worker selects the next available row \`FOR UPDATE SKIP LOCKED\` (when supported), marks it reserved, and deletes it on success.

Simple to set up, but slower than Redis under heavy load.`),
  sqs: c("☁️", "Intermediate", "The SQS driver delegates storage, visibility timeouts and delivery to Amazon's managed queue service.", `Laravel pushes payloads with \`SendMessage\` and pops with \`ReceiveMessage\`. While a job runs it is **invisible** to other consumers; if the worker dies, it reappears after the visibility timeout.

SQS limits delays to 15 minutes and payloads to 256 KB.`),
  supervisor: c("🛡️", "Intermediate", "Supervisor is a process manager that starts workers, restarts them when they exit, and runs several in parallel.", `A typical config:

\`\`\`ini
[program:laravel-worker]
command=php artisan queue:work redis --sleep=3 --tries=3
numprocs=4
autorestart=true
\`\`\`

Workers exit on purpose (memory limit, \`queue:restart\`, \`--max-jobs\`) and Supervisor brings them straight back.`),
  "memory limits": c("🧠", "Advanced", "Workers check memory usage after each job and exit cleanly when they pass the --memory limit.", `Long-lived PHP processes can slowly grow. After every job the worker compares \`memory_get_usage()\` against \`--memory\` (default 128 MB) and stops if exceeded — relying on Supervisor to restart a fresh process.`),
  timeouts: c("⏱️", "Advanced", "A job timeout kills the worker process if a job runs too long, so a stuck job can't block the queue.", `With pcntl, the worker sets \`pcntl_alarm($timeout)\` before each job. If SIGALRM fires, the process is killed and the job is released back for retry.

Keep \`timeout\` a few seconds **shorter** than the connection's \`retry_after\`, or a job can run twice.`),
};

/** Pre-written branches for some node + angle combinations. */
export const DEMO_BRANCHES: Record<string, { question: string; icon: string; summary: string; details: string; concepts: string[] }> = {
  "worker|how": {
    question: "How does a Worker work?",
    icon: "⚙️",
    summary: "A worker is a PHP process running a loop that fetches jobs, runs them, and reacts to signals to stop safely.",
    details: `A worker boots Laravel once, then enters the **daemon loop**. Each turn it asks the driver for the next job, unserializes the payload, calls \`handle()\`, and deletes or releases the job depending on the result.

Around this loop the worker watches **signals** (deploys, timeouts) and its own memory, so it can exit cleanly and let a process manager restart it.`,
    concepts: ["Process", "Loop", "Signals"],
  },
  "worker|under-the-hood": {
    question: "What happens under the hood of a Worker?",
    icon: "🔬",
    summary: "Beyond the loop, workers guard against leaks and stuck jobs with memory limits, timeouts and a process supervisor.",
    details: `Workers are designed to **die often and safely**. They check memory after each job, kill themselves when a job exceeds its timeout, and exit when \`queue:restart\` is broadcast through the cache.

Something external must restart them — usually **Supervisor** or systemd.`,
    concepts: ["Memory Limits", "Timeouts", "Supervisor"],
  },
  "jobs|what": {
    question: "What is a Job?",
    icon: "📦",
    summary: "A job is a serializable class whose payload travels through the queue and whose handle() runs in a worker.",
    details: `Think of a job as a **letter**: the payload is the envelope, serialization packs its contents, and \`handle()\` is what happens when it's opened by a worker.`,
    concepts: ["Payload", "Serialization", "Handle Method"],
  },
  "driver|how": {
    question: "How does a Driver work?",
    icon: "🔌",
    summary: "Every driver implements the same push / pop / release / delete contract on top of a different storage engine.",
    details: `Laravel's \`Queue\` contract hides the backend. The worker never cares where jobs live — it only calls \`pop()\` and later \`delete()\` or \`release()\`. Each driver maps these calls to its storage.`,
    concepts: ["Redis", "Database", "SQS"],
  },
};
