import { type ParsedGraph, type ParsedNode, toSafeId } from './parseGraphToIaC';

// ──────────────────────────────────────────────────────────────
// Kubernetes YAML Generator
// ──────────────────────────────────────────────────────────────

function k8sDeployment(node: ParsedNode): string {
  const safeName = toSafeId(node.label);
  const image = `${safeName}:latest`;

  return `---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${safeName}
  labels:
    app: ${safeName}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ${safeName}
  template:
    metadata:
      labels:
        app: ${safeName}
    spec:
      containers:
        - name: ${safeName}
          image: ${image}
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"`;
}

function k8sService(node: ParsedNode): string {
  const safeName = toSafeId(node.label);
  const serviceType = node.hasLoadBalancerUpstream ? 'LoadBalancer' : 'ClusterIP';

  return `---
apiVersion: v1
kind: Service
metadata:
  name: ${safeName}-svc
spec:
  type: ${serviceType}
  selector:
    app: ${safeName}
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080`;
}

export function generateKubernetesYAML(graph: ParsedGraph): string {
  if (graph.computeNodes.length === 0) {
    return '# No Server or Microservice nodes found in the diagram.\n# Drag a "Server" or "Microservice" component onto the canvas to generate Kubernetes manifests.';
  }

  const header = `# ─────────────────────────────────────────────
# Auto-generated Kubernetes manifests
# Source: System Design Notepad
# Generated: ${new Date().toISOString().slice(0, 19)}
# ─────────────────────────────────────────────
`;

  const sections = graph.computeNodes.map((node) => {
    const safeName = toSafeId(node.label);
    const commentLines: string[] = [];

    if (node.hasLoadBalancerUpstream) {
      commentLines.push(`# ⚡ Load Balancer detected upstream → Service type: LoadBalancer`);
    }
    if (node.incoming.length > 0) {
      commentLines.push(
        `# ← Receives traffic from: ${node.incoming.map((e) => e.sourceNode.label).join(', ')}`,
      );
    }
    if (node.outgoing.length > 0) {
      commentLines.push(
        `# → Sends traffic to: ${node.outgoing.map((e) => e.targetNode.label).join(', ')}`,
      );
    }
    if (node.note) {
      commentLines.push(`# 📝 Note: ${node.note.replace(/\n/g, ' ')}`);
    }

    const commentBlock = commentLines.length
      ? `\n# ── ${safeName} ${'─'.repeat(Math.max(1, 40 - safeName.length))}\n${commentLines.join('\n')}\n`
      : `\n# ── ${safeName} ${'─'.repeat(Math.max(1, 40 - safeName.length))}\n`;

    return commentBlock + k8sDeployment(node) + '\n' + k8sService(node);
  });

  return header + sections.join('\n');
}

// ──────────────────────────────────────────────────────────────
// Go Skeleton Generator — golang-standards/project-layout
// ──────────────────────────────────────────────────────────────

export interface GoFile {
  path: string;
  content: string;
}

const DB_TYPES = new Set([
  'SQL Database', 'NoSQL Database', 'Graph Database', 'Time Series DB',
]);
const CACHE_TYPES = new Set(['Cache']);
const QUEUE_TYPES = new Set(['Message Queue', 'Event Stream', 'Pub/Sub']);

function goSafeVar(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/(^|_)([a-z])/g, (_, _p, c: string) => c.toUpperCase());
}

function goSafePkg(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// ── Per-service file generators ─────────────────────────────

function genCmdMain(node: ParsedNode, moduleName: string): string {
  const safeName = toSafeId(node.label);
  const pkgName = goSafePkg(node.label);
  const goName = goSafeVar(node.label);

  return `package main

import (
\t"context"
\t"log"
\t"os"
\t"os/signal"
\t"syscall"
\t"time"

\t"${moduleName}/internal/${pkgName}/server"
\t"${moduleName}/internal/${pkgName}/config"
)

// ${node.label} — auto-generated entry point
func main() {
\tcfg := config.Load()

\tctx, cancel := context.WithCancel(context.Background())
\tdefer cancel()

\tsrv, err := server.New(ctx, cfg)
\tif err != nil {
\t\tlog.Fatalf("[${safeName}] Failed to create server: %v", err)
\t}

\t// Graceful shutdown
\tgo func() {
\t\tsigCh := make(chan os.Signal, 1)
\t\tsignal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
\t\t<-sigCh
\t\tlog.Println("[${safeName}] Shutting down ${goName}...")
\t\tshutdownCtx, shutdownCancel := context.WithTimeout(ctx, 15*time.Second)
\t\tdefer shutdownCancel()
\t\tsrv.Shutdown(shutdownCtx)
\t}()

\tlog.Printf("[${safeName}] ${node.label} starting on :%s", cfg.Port)
\tif err := srv.ListenAndServe(); err != nil {
\t\tlog.Fatalf("[${safeName}] Server error: %v", err)
\t}
}
`;
}

function genConfig(node: ParsedNode): string {
  const pkgName = goSafePkg(node.label);
  const downstreamDbs = node.outgoing.filter((e) => DB_TYPES.has(e.targetNode.type));
  const downstreamCaches = node.outgoing.filter((e) => CACHE_TYPES.has(e.targetNode.type));

  const dbFields: string[] = [];
  const dbEnvLoad: string[] = [];

  for (const edge of downstreamDbs) {
    const vn = goSafeVar(edge.targetNode.label);
    dbFields.push(`\t${vn}DSN string`);
    dbEnvLoad.push(`\t\t${vn}DSN: getEnv("${vn.toUpperCase()}_DSN", "postgres://localhost:5432/${toSafeId(edge.targetNode.label)}?sslmode=disable"),`);
  }

  for (const edge of downstreamCaches) {
    const vn = goSafeVar(edge.targetNode.label);
    dbFields.push(`\t${vn}Addr string`);
    dbEnvLoad.push(`\t\t${vn}Addr: getEnv("${vn.toUpperCase()}_ADDR", "localhost:6379"),`);
  }

  const extraFields = dbFields.length > 0 ? `\n${dbFields.join('\n')}` : '';
  const extraEnv = dbEnvLoad.length > 0 ? `\n${dbEnvLoad.join('\n')}` : '';

  return `// Package config holds configuration for the ${pkgName} service.
package config

import "os"

type Config struct {
\tPort string${extraFields}
}

func Load() Config {
\treturn Config{
\t\tPort: getEnv("PORT", "8080"),${extraEnv}
\t}
}

func getEnv(key, fallback string) string {
\tif v := os.Getenv(key); v != "" {
\t\treturn v
\t}
\treturn fallback
}
`;
}

function genServer(node: ParsedNode, moduleName: string): string {
  const pkgName = goSafePkg(node.label);
  const safeName = toSafeId(node.label);

  const downstreamDbs = node.outgoing.filter((e) => DB_TYPES.has(e.targetNode.type));
  const downstreamCaches = node.outgoing.filter((e) => CACHE_TYPES.has(e.targetNode.type));
  const downstreamQueues = node.outgoing.filter((e) => QUEUE_TYPES.has(e.targetNode.type));

  const hasStore = downstreamDbs.length > 0 || downstreamCaches.length > 0 || downstreamQueues.length > 0;

  // Build imports
  const stdImports = ['"context"', '"log"', '"net/http"', '"time"'];
  const extImports: string[] = [
    `"${moduleName}/internal/${pkgName}/config"`,
  ];

  if (hasStore) {
    extImports.push(`"${moduleName}/internal/${pkgName}/store"`);
  }

  const importBlock = `import (\n${stdImports.sort().map(i => `\t${i}`).join('\n')}\n\n${extImports.sort().map(i => `\t${i}`).join('\n')}\n)`;

  // Store field in server struct
  const storeField = hasStore ? '\n\tstore *store.Store' : '';
  const storeInit = hasStore
    ? `\n\tst, err := store.New(ctx, cfg)\n\tif err != nil {\n\t\treturn nil, err\n\t}\n`
    : '';
  const storeAssign = hasStore ? '\n\t\tstore: st,' : '';
  const storeClose = hasStore
    ? `\n\t// Close data store connections\n\tif s.store != nil {\n\t\ts.store.Close()\n\t}`
    : '';

  return `// Package server provides the HTTP server for ${safeName}.
package server

${importBlock}

// Server wraps the HTTP server and its dependencies.
type Server struct {
\thttpServer *http.Server${storeField}
}

// New creates and configures a new Server.
func New(ctx context.Context, cfg config.Config) (*Server, error) {${storeInit}
\tmux := http.NewServeMux()

\ts := &Server{${storeAssign}
\t}

\tregisterRoutes(mux, s)

\ts.httpServer = &http.Server{
\t\tAddr:         ":" + cfg.Port,
\t\tHandler:      mux,
\t\tReadTimeout:  15 * time.Second,
\t\tWriteTimeout: 15 * time.Second,
\t\tIdleTimeout:  60 * time.Second,
\t}

\tlog.Printf("[${safeName}] Server configured on :%s", cfg.Port)
\treturn s, nil
}

// ListenAndServe starts the HTTP server.
func (s *Server) ListenAndServe() error {
\tif err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
\t\treturn err
\t}
\treturn nil
}

// Shutdown gracefully stops the server.
func (s *Server) Shutdown(ctx context.Context) {
\tif err := s.httpServer.Shutdown(ctx); err != nil {
\t\tlog.Printf("[${safeName}] Shutdown error: %v", err)
\t}${storeClose}
\tlog.Println("[${safeName}] Server stopped")
}
`;
}

function genRoutes(node: ParsedNode): string {
  const safeName = toSafeId(node.label);
  const upstreamNodes = node.incoming;

  const routeRegistrations: string[] = [];

  // Health check
  routeRegistrations.push(`\tmux.HandleFunc("/healthz", s.handleHealthz)`);

  // Handlers for incoming traffic
  for (const edge of upstreamNodes) {
    const handlerName = 'handle' + goSafeVar(edge.sourceNode.label);
    routeRegistrations.push(`\tmux.HandleFunc("/${toSafeId(edge.sourceNode.label)}", s.${handlerName})`);
  }

  // Outbound integration handlers
  for (const edge of node.outgoing) {
    if (!DB_TYPES.has(edge.targetNode.type) && !CACHE_TYPES.has(edge.targetNode.type) && !QUEUE_TYPES.has(edge.targetNode.type)) {
      const handlerName = 'handleCall' + goSafeVar(edge.targetNode.label);
      routeRegistrations.push(`\tmux.HandleFunc("/call-${toSafeId(edge.targetNode.label)}", s.${handlerName})`);
    }
  }

  // Handler implementations
  const handlerImpls: string[] = [];

  handlerImpls.push(`func (s *Server) handleHealthz(w http.ResponseWriter, r *http.Request) {
\tw.WriteHeader(http.StatusOK)
\tfmt.Fprintln(w, "ok")
}`);

  for (const edge of upstreamNodes) {
    const handlerName = 'handle' + goSafeVar(edge.sourceNode.label);
    const handlerLabel = edge.label || edge.sourceNode.label;
    handlerImpls.push(`// ${handlerName} handles traffic from ${edge.sourceNode.label}${edge.label ? ` (${edge.label})` : ''}
func (s *Server) ${handlerName}(w http.ResponseWriter, r *http.Request) {
\tlog.Printf("[${safeName}] Request from ${handlerLabel}: %s %s", r.Method, r.URL.Path)
\t// TODO: Implement ${handlerLabel} handler logic
\tfmt.Fprintf(w, "Hello from ${node.label} — handler for ${handlerLabel}")
}`);
  }

  for (const edge of node.outgoing) {
    if (!DB_TYPES.has(edge.targetNode.type) && !CACHE_TYPES.has(edge.targetNode.type) && !QUEUE_TYPES.has(edge.targetNode.type)) {
      const handlerName = 'handleCall' + goSafeVar(edge.targetNode.label);
      handlerImpls.push(`// ${handlerName} proxies requests to ${edge.targetNode.label}${edge.label ? ` (${edge.label})` : ''}
func (s *Server) ${handlerName}(w http.ResponseWriter, r *http.Request) {
\tlog.Printf("[${safeName}] Calling ${edge.targetNode.label}")
\t// TODO: Call downstream service ${edge.targetNode.label}
\tfmt.Fprintf(w, "Calling ${edge.targetNode.label}")
}`);
    }
  }

  return `package server

import (
\t"fmt"
\t"log"
\t"net/http"
)

// registerRoutes maps URL patterns to handler methods.
func registerRoutes(mux *http.ServeMux, s *Server) {
${routeRegistrations.join('\n')}
}

// ── Handlers ──────────────────────────────────────────────

${handlerImpls.join('\n\n')}
`;
}

function genStore(node: ParsedNode): string | null {
  const downstreamDbs = node.outgoing.filter((e) => DB_TYPES.has(e.targetNode.type));
  const downstreamCaches = node.outgoing.filter((e) => CACHE_TYPES.has(e.targetNode.type));
  const downstreamQueues = node.outgoing.filter((e) => QUEUE_TYPES.has(e.targetNode.type));

  if (downstreamDbs.length === 0 && downstreamCaches.length === 0 && downstreamQueues.length === 0) {
    return null;
  }

  const pkgName = goSafePkg(node.label);

  const stdImports = new Set<string>(['"context"', '"log"']);
  const extImports = new Set<string>([`"${pkgName}/internal/${pkgName}/config"`]);
  // We'll fix the module path below in the generator; use a placeholder here
  // Actually, store.go is self-contained with config — we pass config in

  const structFields: string[] = [];
  const initBlocks: string[] = [];
  const closeBlocks: string[] = [];

  for (const edge of downstreamDbs) {
    const vn = goSafeVar(edge.targetNode.label);
    const dbType = edge.targetNode.type;

    if (dbType === 'SQL Database') {
      stdImports.add('"database/sql"');
      extImports.add('_ "github.com/lib/pq"');
      structFields.push(`\t${vn}DB *sql.DB`);
      initBlocks.push(`\t// ${edge.targetNode.label}
\tdb${vn}, err := sql.Open("postgres", cfg.${vn}DSN)
\tif err != nil {
\t\treturn nil, fmt.Errorf("connect ${edge.targetNode.label}: %w", err)
\t}
\tif err := db${vn}.PingContext(ctx); err != nil {
\t\treturn nil, fmt.Errorf("ping ${edge.targetNode.label}: %w", err)
\t}
\tlog.Printf("[store] Connected to ${edge.targetNode.label}")
`);
      closeBlocks.push(`\tif s.${vn}DB != nil { s.${vn}DB.Close() }`);
    } else if (dbType === 'NoSQL Database') {
      extImports.add('"go.mongodb.org/mongo-driver/mongo"');
      extImports.add('"go.mongodb.org/mongo-driver/mongo/options"');
      structFields.push(`\t${vn}Mongo *mongo.Client`);
      initBlocks.push(`\t// ${edge.targetNode.label}
\tmongo${vn}, err := mongo.Connect(ctx, options.Client().ApplyURI(cfg.${vn}DSN))
\tif err != nil {
\t\treturn nil, fmt.Errorf("connect ${edge.targetNode.label}: %w", err)
\t}
\tlog.Printf("[store] Connected to ${edge.targetNode.label}")
`);
      closeBlocks.push(`\tif s.${vn}Mongo != nil { s.${vn}Mongo.Disconnect(context.Background()) }`);
    } else {
      structFields.push(`\t// TODO: ${vn} client for ${dbType}`);
      initBlocks.push(`\t// TODO: Connect to ${edge.targetNode.label} (${dbType})
\tlog.Printf("[store] Placeholder: connect to ${edge.targetNode.label}")
`);
    }
  }

  for (const edge of downstreamCaches) {
    const vn = goSafeVar(edge.targetNode.label);
    extImports.add('"github.com/redis/go-redis/v9"');
    structFields.push(`\t${vn}Redis *redis.Client`);
    initBlocks.push(`\t// ${edge.targetNode.label}
\trdb${vn} := redis.NewClient(&redis.Options{Addr: cfg.${vn}Addr})
\tif err := rdb${vn}.Ping(ctx).Err(); err != nil {
\t\treturn nil, fmt.Errorf("ping ${edge.targetNode.label}: %w", err)
\t}
\tlog.Printf("[store] Connected to ${edge.targetNode.label}")
`);
    closeBlocks.push(`\tif s.${vn}Redis != nil { s.${vn}Redis.Close() }`);
  }

  for (const edge of downstreamQueues) {
    const vn = goSafeVar(edge.targetNode.label);
    structFields.push(`\t// TODO: ${vn} client for ${edge.targetNode.type}`);
    initBlocks.push(`\t// TODO: Connect to ${edge.targetNode.label} (${edge.targetNode.type})
\tlog.Printf("[store] Placeholder: connect to ${edge.targetNode.label}")
`);
  }

  stdImports.add('"fmt"');

  // Build import block  — note: we don't need config import in store since we receive it
  // We'll remove the internal config import and just pass the needed values
  extImports.delete(`"${pkgName}/internal/${pkgName}/config"`);

  const stdArr = [...stdImports].sort();
  const extArr = [...extImports].sort();
  const importBlock = extArr.length
    ? `import (\n${stdArr.map(i => `\t${i}`).join('\n')}\n\n${extArr.map(i => `\t${i}`).join('\n')}\n)`
    : `import (\n${stdArr.map(i => `\t${i}`).join('\n')}\n)`;

  // store.New receives a config struct directly
  return `// Package store manages data store connections for ${node.label}.
package store

${importBlock}

// Config holds connection strings needed by the store layer.
type Config struct {
${structFields.filter(f => !f.startsWith('\t//')).map(f => {
  // Extract the field name and create a config field
  const match = f.match(/\t(\w+)/);
  return match ? `\t${match[1]}DSN string` : f;
}).join('\n')}
}

// Store holds live connections to data backends.
type Store struct {
${structFields.join('\n')}
}

// New opens all data store connections.
func New(ctx context.Context, cfg Config) (*Store, error) {
\ts := &Store{}

${initBlocks.join('\n')}
\treturn s, nil
}

// Close shuts down all connections.
func (s *Store) Close() {
${closeBlocks.join('\n')}
\tlog.Println("[store] All connections closed")
}
`;
}

function genConfigYaml(node: ParsedNode): string {
  const safeName = toSafeId(node.label);
  const downstreamDbs = node.outgoing.filter((e) => DB_TYPES.has(e.targetNode.type));
  const downstreamCaches = node.outgoing.filter((e) => CACHE_TYPES.has(e.targetNode.type));

  let content = `# Configuration for ${node.label}
# Environment: development

server:
  port: "8080"
  read_timeout: 15s
  write_timeout: 15s
`;

  if (downstreamDbs.length > 0) {
    content += `\ndatabase:\n`;
    for (const edge of downstreamDbs) {
      const key = toSafeId(edge.targetNode.label);
      if (edge.targetNode.type === 'SQL Database') {
        content += `  ${key}:\n    driver: postgres\n    dsn: "postgres://user:pass@localhost:5432/${key}?sslmode=disable"\n`;
      } else if (edge.targetNode.type === 'NoSQL Database') {
        content += `  ${key}:\n    driver: mongodb\n    uri: "mongodb://localhost:27017"\n    database: "${key}"\n`;
      } else {
        content += `  ${key}:\n    driver: "${toSafeId(edge.targetNode.type)}"\n    dsn: "TODO"\n`;
      }
    }
  }

  if (downstreamCaches.length > 0) {
    content += `\ncache:\n`;
    for (const edge of downstreamCaches) {
      const key = toSafeId(edge.targetNode.label);
      content += `  ${key}:\n    addr: "localhost:6379"\n    db: 0\n`;
    }
  }

  return content;
}

function genDockerfile(node: ParsedNode): string {
  const safeName = toSafeId(node.label);
  const pkgName = goSafePkg(node.label);

  return `# ── ${node.label} ──────────────────────────────────
# Multi-stage build for minimal production image

# Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" \\
    -o /bin/${safeName} ./cmd/${pkgName}

# Runtime stage
FROM alpine:3.20

RUN apk --no-cache add ca-certificates tzdata
COPY --from=builder /bin/${safeName} /usr/local/bin/${safeName}
COPY configs/${safeName}.yaml /etc/${safeName}/config.yaml

EXPOSE 8080
ENTRYPOINT ["${safeName}"]
`;
}

function genMakefile(computeNodes: ParsedNode[]): string {
  const buildTargets = computeNodes.map((n) => {
    const safeName = toSafeId(n.label);
    const pkgName = goSafePkg(n.label);
    return `\tgo build -o bin/${safeName} ./cmd/${pkgName}`;
  });

  const runTargets = computeNodes.map((n) => {
    const safeName = toSafeId(n.label);
    const pkgName = goSafePkg(n.label);
    return `.PHONY: run-${safeName}
run-${safeName}: ## Run ${n.label}
\tgo run ./cmd/${pkgName}`;
  });

  const dockerTargets = computeNodes.map((n) => {
    const safeName = toSafeId(n.label);
    return `.PHONY: docker-${safeName}
docker-${safeName}: ## Build Docker image for ${n.label}
\tdocker build -f build/Dockerfile.${safeName} -t ${safeName}:latest .`;
  });

  return `# ─────────────────────────────────────────────
# Auto-generated Makefile
# ─────────────────────────────────────────────

.DEFAULT_GOAL := build

.PHONY: build
build: ## Build all services
${buildTargets.join('\n')}

.PHONY: test
test: ## Run all tests
\tgo test ./...

.PHONY: lint
lint: ## Run linter
\tgolangci-lint run ./...

.PHONY: tidy
tidy: ## Tidy dependencies
\tgo mod tidy

${runTargets.join('\n\n')}

${dockerTargets.join('\n\n')}

.PHONY: help
help: ## Show this help
\t@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\\033[36m%-20s\\033[0m %s\\n", $$1, $$2}'
`;
}

function genGoMod(moduleName: string, nodes: ParsedNode[]): string {
  const externalDeps: Set<string> = new Set();

  for (const node of nodes) {
    for (const edge of node.outgoing) {
      if (edge.targetNode.type === 'SQL Database') {
        externalDeps.add('\tgithub.com/lib/pq v1.10.9');
      } else if (edge.targetNode.type === 'NoSQL Database') {
        externalDeps.add('\tgo.mongodb.org/mongo-driver v1.17.1');
      }
      if (CACHE_TYPES.has(edge.targetNode.type)) {
        externalDeps.add('\tgithub.com/redis/go-redis/v9 v9.7.0');
      }
    }
  }

  let content = `module ${moduleName}

go 1.23
`;

  if (externalDeps.size > 0) {
    content += `\nrequire (\n${[...externalDeps].sort().join('\n')}\n)\n`;
  }

  return content;
}

function genDockerCompose(computeNodes: ParsedNode[]): string {
  let content = `# Auto-generated docker-compose for development
version: "3.9"

services:
`;

  for (const node of computeNodes) {
    const safeName = toSafeId(node.label);
    const port = 8080; // base port

    content += `  ${safeName}:
    build:
      context: ..
      dockerfile: build/Dockerfile.${safeName}
    ports:
      - "${port}:8080"
    env_file:
      - ../.env
    restart: unless-stopped
`;
  }

  // Add common infra services based on downstream types
  const allDownstream = new Set<string>();
  for (const n of computeNodes) {
    for (const e of n.outgoing) {
      allDownstream.add(e.targetNode.type);
    }
  }

  if ([...allDownstream].some(t => DB_TYPES.has(t) && t === 'SQL Database')) {
    content += `
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
`;
  }

  if ([...allDownstream].some(t => DB_TYPES.has(t) && t === 'NoSQL Database')) {
    content += `
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodata:/data/db
`;
  }

  if (allDownstream.has('Cache')) {
    content += `
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
`;
  }

  // Volumes
  const volumes: string[] = [];
  if ([...allDownstream].some(t => t === 'SQL Database')) volumes.push('  pgdata:');
  if ([...allDownstream].some(t => t === 'NoSQL Database')) volumes.push('  mongodata:');

  if (volumes.length > 0) {
    content += `\nvolumes:\n${volumes.join('\n')}\n`;
  }

  return content;
}

function genReadme(moduleName: string, computeNodes: ParsedNode[]): string {
  const serviceList = computeNodes.map(n => `- **${n.label}** (\`${n.type}\`) — \`cmd/${goSafePkg(n.label)}/main.go\``).join('\n');

  return `# ${moduleName}

> Auto-generated project scaffold from System Design Notepad.

## Services

${serviceList}

## Project Structure

\`\`\`
.
├── cmd/                    # Application entry points
│   └── <service>/
│       └── main.go
├── internal/               # Private application code
│   └── <service>/
│       ├── config/
│       │   └── config.go
│       ├── server/
│       │   ├── server.go   # HTTP server setup
│       │   └── routes.go   # Route definitions & handlers
│       └── store/
│           └── store.go    # Data store connections
├── configs/                # Configuration files
├── build/                  # Dockerfiles
├── deployments/            # Docker Compose, K8s manifests
├── go.mod
├── Makefile
└── README.md
\`\`\`

## Quick Start

\`\`\`bash
# Run a service
make run-${toSafeId(computeNodes[0]?.label ?? 'server')}

# Build all
make build

# Run tests
make test
\`\`\`

## Development

\`\`\`bash
# Start infrastructure (Postgres, Redis, etc.)
docker-compose -f deployments/docker-compose.yml up -d

# Build Docker images
${computeNodes.map(n => `make docker-${toSafeId(n.label)}`).join('\n')}
\`\`\`
`;
}

// ── Main public export ──────────────────────────────────────

export function generateGoProject(graph: ParsedGraph): GoFile[] {
  if (graph.computeNodes.length === 0) {
    return [{
      path: 'README.md',
      content: '# No Services Found\n\nDrag a **Server** or **Microservice** component onto the canvas to generate a Go project scaffold.',
    }];
  }

  const moduleName = 'github.com/your-org/your-project';
  const files: GoFile[] = [];

  // Root files
  files.push({ path: 'go.mod', content: genGoMod(moduleName, graph.computeNodes) });
  files.push({ path: 'Makefile', content: genMakefile(graph.computeNodes) });
  files.push({ path: 'README.md', content: genReadme(moduleName, graph.computeNodes) });

  // Per-service files
  for (const node of graph.computeNodes) {
    const pkgName = goSafePkg(node.label);
    const safeName = toSafeId(node.label);

    // cmd/<service>/main.go
    files.push({
      path: `cmd/${pkgName}/main.go`,
      content: genCmdMain(node, moduleName),
    });

    // internal/<service>/config/config.go
    files.push({
      path: `internal/${pkgName}/config/config.go`,
      content: genConfig(node),
    });

    // internal/<service>/server/server.go
    files.push({
      path: `internal/${pkgName}/server/server.go`,
      content: genServer(node, moduleName),
    });

    // internal/<service>/server/routes.go
    files.push({
      path: `internal/${pkgName}/server/routes.go`,
      content: genRoutes(node),
    });

    // internal/<service>/store/store.go (only if has data dependencies)
    const storeContent = genStore(node);
    if (storeContent) {
      files.push({
        path: `internal/${pkgName}/store/store.go`,
        content: storeContent,
      });
    }

    // configs/<service>.yaml
    files.push({
      path: `configs/${safeName}.yaml`,
      content: genConfigYaml(node),
    });

    // build/Dockerfile.<service>
    files.push({
      path: `build/Dockerfile.${safeName}`,
      content: genDockerfile(node),
    });
  }

  // deployments/docker-compose.yml
  files.push({
    path: 'deployments/docker-compose.yml',
    content: genDockerCompose(graph.computeNodes),
  });

  return files;
}
