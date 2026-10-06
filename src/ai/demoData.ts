import type { ConceptDraft, DeepDiveDraft, Difficulty } from "../types";

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

/** Hand-written Deep Dive layers for the demo, keyed by `${concept}|${level}`. */
export const DEMO_DIVES: Record<string, DeepDiveDraft> = {
  "worker|1": {
    title: "One turn of the worker loop",
    summary: "Each iteration is a tight cycle: ask the driver for a job, rebuild it, run it inside error handling, then acknowledge, release or fail it.",
    steps: [
      { label: "Check stop conditions", detail: "Before fetching, the worker checks the restart flag in the cache, its memory usage, --max-jobs and --max-time. Any of these makes it exit cleanly." },
      { label: "Pop the next job", detail: "`getNextJob()` asks the connection for a job on each queue you listed, in priority order, e.g. `--queue=high,default`." },
      { label: "Fire JobProcessing", detail: "Listeners (Horizon, logging, your own) are notified before the job runs." },
      { label: "Resolve and handle", detail: "The payload is decoded, the command is unserialized, and `handle()` is called through the container with middleware applied." },
      { label: "Acknowledge the result", detail: "On success the job is deleted from the queue. On exception it's released with a backoff delay, or marked failed after `$tries` attempts." },
      { label: "Sleep or loop", detail: "If no job was found, the worker sleeps for `--sleep` seconds, then the cycle repeats." },
    ],
    sections: [
      { heading: "Why it's a loop, not a request", body: "A web request boots Laravel, handles one thing, and dies. A worker boots **once** and keeps the application in memory, so each job skips the expensive bootstrap. That's what makes queues fast, and it's also why stale code or leaked state can survive between jobs." },
      { heading: "Priorities are just ordering", body: "With `--queue=high,default`, the worker always tries `high` first on every turn. There's no weighting: if `high` never empties, `default` starves. Horizon's balancing strategies exist to solve exactly this." },
    ],
    code: {
      language: "php",
      snippet: "while (true) {\n    if ($this->shouldQuit) break;\n\n    $job = $this->getNextJob($connection, $queue);\n\n    if ($job) {\n        $this->runJob($job, $connectionName, $options);\n    } else {\n        $this->sleep($options->sleep);\n    }\n\n    $this->stopIfNecessary($options, $lastRestart, $job);\n}",
      caption: "A simplified view of Illuminate\\Queue\\Worker::daemon().",
    },
    pitfalls: [
      "Singletons resolved in one job are still there for the next job in the same process.",
      "Deploying new code does nothing until workers restart (`php artisan queue:restart`).",
      "Listing many queues in one worker can starve the lower-priority ones.",
    ],
    terms: [
      { term: "Daemon Mode", meaning: "Running the worker as a long-lived loop instead of booting per job." },
      { term: "Backoff", meaning: "The delay before a failed job is retried." },
      { term: "Queue Priority", meaning: "The order in which a worker checks multiple queues." },
    ],
  },
  "worker|2": {
    title: "Reservation, visibility and acknowledgement",
    summary: "Under the hood a job is never removed when popped. It's reserved with a deadline, and only deleted when the worker explicitly acknowledges success.",
    steps: [
      { label: "Atomic pop with Lua", detail: "The Redis driver runs a Lua script that LPOPs from `queues:default`, increments `attempts`, and ZADDs the job into `queues:default:reserved` scored by now + `retry_after`." },
      { label: "Migrate expired jobs", detail: "Before each pop, delayed jobs whose time has come and reserved jobs whose deadline passed are moved back to the ready list." },
      { label: "Run inside CallQueuedHandler", detail: "The payload's `job` key points to `CallQueuedHandler@call`, which unserializes the command and dispatches it through the command bus pipeline." },
      { label: "Delete or release", detail: "Success calls `deleteReserved()`, which ZREMs the job from the reserved set. Failure calls `release()`, which moves it into the delayed set with a backoff." },
      { label: "Record failure", detail: "After max attempts, the FailedJobProvider writes the payload and exception to `failed_jobs`, and the job's `failed()` method runs." },
    ],
    sections: [
      { heading: "At-least-once delivery", body: "Because a job only disappears on explicit acknowledgement, a crash mid-job means the reservation expires and **another worker runs it again**. Queues guarantee *at least once*, not *exactly once*, so jobs should be idempotent." },
      { heading: "retry_after vs timeout", body: "`retry_after` (connection config) is how long a reservation lasts. `timeout` (worker or job) is how long a job may run before being killed. If `timeout` ≥ `retry_after`, a slow job can be re-reserved while still running, and you get duplicates." },
    ],
    code: {
      language: "lua",
      snippet: "-- simplified LuaScripts::pop()\nlocal job = redis.call('lpop', KEYS[1])\nlocal reserved = false\nif(job ~= false) then\n    reserved = cjson.decode(job)\n    reserved['attempts'] = reserved['attempts'] + 1\n    reserved = cjson.encode(reserved)\n    redis.call('zadd', KEYS[2], ARGV[1], reserved)\nend\nreturn {job, reserved}",
      caption: "Popping and reserving happen in one atomic Redis operation, so two workers never take the same job.",
    },
    pitfalls: [
      "A job that sends an email and then crashes may send the email twice. Design for idempotency.",
      "Setting `timeout` longer than `retry_after` causes duplicate execution.",
      "Large payloads slow every pop; pass IDs, not whole datasets.",
    ],
    terms: [
      { term: "Reserved Set", meaning: "A Redis sorted set of in-flight jobs, scored by their reservation deadline." },
      { term: "Idempotency", meaning: "Running an operation twice has the same effect as running it once." },
      { term: "CallQueuedHandler", meaning: "The class that turns a raw payload back into a job and runs it." },
    ],
  },
  "worker|3": {
    title: "Processes, signals and the kernel",
    summary: "Timeouts and graceful shutdowns are implemented with POSIX signals: the worker asks the kernel to interrupt it, and Supervisor relies on exit codes to bring it back.",
    steps: [
      { label: "Enable async signals", detail: "With the pcntl extension, the worker calls `pcntl_async_signals(true)` so signal handlers run between PHP opcodes, without manual dispatch calls." },
      { label: "Arm the alarm", detail: "Before each job it calls `pcntl_alarm($timeout)`. The kernel will deliver SIGALRM to the process when the timer expires." },
      { label: "Kill on timeout", detail: "The SIGALRM handler marks the job as failed or released, then calls `posix_kill(getmypid(), SIGKILL)`. A stuck job can't block the process forever." },
      { label: "Graceful SIGTERM", detail: "Supervisor or systemd sends SIGTERM on stop. The handler sets `shouldQuit`, so the worker finishes the current job and exits on the next loop check." },
      { label: "Restart by exit code", detail: "The process exits with code 0 (or 12 for the memory limit). Supervisor's `autorestart=true` forks a fresh PHP process with clean memory." },
    ],
    sections: [
      { heading: "Why memory creeps", body: "PHP frees memory per request in FPM, but a worker is one endless request. Circular references, static caches and growing arrays accumulate. The worker checks `memory_get_usage()` after each job and exits voluntarily, relying on the supervisor for a clean slate." },
      { heading: "Without pcntl", body: "On systems without pcntl (e.g. Windows), there are no async signals: timeouts aren't enforced and SIGTERM can't be handled gracefully. Production queue workers should always run where pcntl is available." },
    ],
    code: {
      language: "php",
      snippet: "pcntl_async_signals(true);\n\npcntl_signal(SIGALRM, function () use ($job) {\n    $this->markJobAsFailedIfWillExceedMaxAttempts(...);\n    $this->kill(static::EXIT_ERROR);\n});\n\npcntl_alarm(max($this->timeoutForJob($job, $options), 0));\n$this->runJob($job, ...);\npcntl_alarm(0); // disarm",
      caption: "Simplified registerTimeoutHandler(): the kernel's alarm is the job's stopwatch.",
    },
    pitfalls: [
      "A blocking C call (e.g. some DB drivers) may delay signal delivery until it returns.",
      "SIGKILL can't be caught, so cleanup code in the job never runs on timeout.",
      "Containers that send SIGKILL immediately instead of SIGTERM cut jobs in half.",
    ],
    terms: [
      { term: "POSIX Signals", meaning: "Asynchronous notifications the kernel delivers to a process (SIGTERM, SIGALRM…)." },
      { term: "pcntl", meaning: "PHP's process-control extension for signals and forking." },
      { term: "Exit Codes", meaning: "The number a process returns on exit, which supervisors use to decide what to do." },
    ],
  },
};
