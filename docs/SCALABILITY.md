# Scalability Notes — FlowAxis

> Written by Aparna Ojha

---

One of the things I thought carefully about while building FlowAxis is what happens when it stops being a solo project and starts handling real load. The decisions I made at the architecture level aren't just taste — they're deliberate preparation for scale. Here's how I think about it.

## Stateless Authentication is the Foundation of Horizontal Scaling

The JWT access token pattern I implemented is inherently stateless. The server doesn't maintain a session table or look up anything in a database to validate an access token — it just verifies the cryptographic signature and checks the expiry. This means every API server behind a load balancer is equivalent. There's no "sticky session" requirement, no shared memory, no coordination needed between nodes. You can drop ten more servers behind an Nginx upstream block and they all serve the same token equally well.

The refresh token is different — it requires a database lookup to check revocation. But refresh happens at most once every 30 minutes per client, not on every request. That traffic is orders of magnitude smaller than the regular API traffic. Even at high scale, refresh token lookups are a minor fraction of total database operations, and they're naturally bounded by the access token TTL.

## Redis as a Horizontal Cache, Not Just a Speed Layer

I use Redis in a cache-aside pattern for project lists and task lists — the two most frequently read, least frequently mutated endpoints. The key insight here is that Redis is an external service, not a local cache. Every application server reads from the same Redis cluster. This means cache hits are shared across all nodes, and cache invalidation (which happens on every mutation) reaches all nodes simultaneously through the shared store. There's no cache inconsistency problem that you'd get with in-process caching like `node-cache`.

If the Redis cluster itself becomes a bottleneck, the path forward is Redis Cluster with consistent hashing across shards — `ioredis` supports this natively, so the application code doesn't need to change, only the connection configuration.

## Database Indexing Strategy

The MongoDB indexes I defined weren't arbitrary. The compound index on `{ project: 1, status: 1 }` for tasks reflects the most common real query: "give me all in-progress tasks for project X." Without this index, that query scans every task document. With it, MongoDB can satisfy the query with a single B-tree traversal. Similarly, `{ 'members.user': 1 }` on projects makes "find all projects a user is a member of" fast even when projects have hundreds of members. These indexes cost write performance (every insert and update must maintain the index), but for a read-heavy workload like a project dashboard, that trade-off is always correct.

## Where Microservices Would Make Sense

FlowAxis is a monolith by design — premature decomposition is a real cost. But I can see clear split points if the product grows. Authentication and token management are the obvious first extraction: auth traffic has a very different profile than project data traffic, and a dedicated auth service could be independently rate-limited, load-tested, and deployed. Notifications (if we add email/Slack alerts on task assignments or status changes) are another natural boundary — they're async by nature and would be better served by a message queue (BullMQ, RabbitMQ) and a dedicated worker process rather than being bolted onto the main API. The feature-based folder structure I chose makes these extractions mechanical — each module (`/modules/auth`, `/modules/projects`, etc.) is already a self-contained unit with its own models, services, and routes.

## Load Balancer Considerations

Running behind Nginx or an AWS ALB is straightforward because of the stateless design. The one non-obvious consideration is the refresh token cookie: it's set with `SameSite=Strict`, which means it won't be sent on cross-origin requests. If the frontend and backend are on different domains in production, this needs to change to `SameSite=None; Secure`, which requires HTTPS. The `CORS_ORIGIN` env variable already controls the allowed origin — the only additional change for a production deployment is updating the cookie settings and ensuring TLS termination at the load balancer. The application code itself is load-balancer-agnostic.

---

The summary: I didn't over-engineer FlowAxis, but I also didn't paint myself into a corner. Every decision has a clear upgrade path, and the hardest parts of scaling — authentication, caching, database access patterns — were designed right the first time.
