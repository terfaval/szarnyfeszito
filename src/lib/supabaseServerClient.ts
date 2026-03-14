import { createClient, type Client, type SupabaseClientOptions } from "@supabase/supabase-js";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from "@/lib/config";
import { assertSupabaseServiceRoleKey } from "@/lib/supabaseKeyValidation";

type ClientType = "admin" | "user";
type OperationType = "DB_READ" | "DB_WRITE" | "DB_RPC";
type LoggingMetadata = {
  clientType: ClientType;
  route: string;
};

const DEFAULT_ROUTE = "unknown-route";
const BASE_CLIENT_OPTIONS: SupabaseClientOptions<unknown> = {
  auth: {
    persistSession: false,
    detectSessionInUrl: false,
  },
};

const LOG_METHOD_MAP: Record<string, OperationType> = {
  select: "DB_READ",
  single: "DB_READ",
  maybeSingle: "DB_READ",
  insert: "DB_WRITE",
  upsert: "DB_WRITE",
  update: "DB_WRITE",
  delete: "DB_WRITE",
  del: "DB_WRITE",
};

assertSupabaseServiceRoleKey(SUPABASE_SERVICE_ROLE_KEY);

function logDbOperation(params: {
  operation: OperationType;
  table: string;
  client_type: ClientType;
  route: string;
}) {
  console.info("DB_OPERATION", {
    operation: params.operation,
    table: params.table,
    client_type: params.client_type,
    route: params.route,
  });
}

function instrumentQueryBuilder<T extends object>(
  builder: T,
  table: string,
  metadata: LoggingMetadata
) {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof prop === "string" && typeof value === "function") {
        const operation = LOG_METHOD_MAP[prop];
        if (operation) {
          const method = value as (...args: unknown[]) => unknown;
          return (...args: unknown[]) => {
            logDbOperation({
              operation,
              table,
              client_type: metadata.clientType,
              route: metadata.route,
            });
            return method.apply(receiver, args);
          };
        }
      }
      return value;
    },
  });
}

function instrumentClient(client: Client, metadata: LoggingMetadata): Client {
  const patched = client;
  const originalFrom = patched.from.bind(patched);
  patched.from = (table: string) => {
    const builder = originalFrom(table);
    return instrumentQueryBuilder(builder, table, metadata);
  };

  const originalRpc = patched.rpc.bind(patched);
  patched.rpc = (...args: Parameters<Client["rpc"]>) => {
    const table = typeof args[0] === "string" ? args[0] : "rpc";
    logDbOperation({
      operation: "DB_RPC",
      table,
      client_type: metadata.clientType,
      route: metadata.route,
    });
    return originalRpc(...args);
  };

  return patched;
}

function buildClientOptions(accessToken?: string): SupabaseClientOptions<unknown> {
  const options: SupabaseClientOptions<unknown> = {
    ...BASE_CLIENT_OPTIONS,
    auth: {
      ...BASE_CLIENT_OPTIONS.auth,
    },
  };

  if (accessToken) {
    options.accessToken = async () => accessToken;
  }

  return options;
}

function createInstrumentedClient(
  key: string,
  clientType: ClientType,
  route?: string,
  accessToken?: string
): Client {
  const metadata: LoggingMetadata = {
    clientType,
    route: route?.trim() || DEFAULT_ROUTE,
  };
  const client = createClient(SUPABASE_URL, key, buildClientOptions(accessToken));
  return instrumentClient(client, metadata);
}

export function createAdminClient(options?: { route?: string }): Client {
  return createInstrumentedClient(SUPABASE_SERVICE_ROLE_KEY, "admin", options?.route);
}

export function createUserClient(options?: { route?: string; accessToken?: string }): Client {
  return createInstrumentedClient(
    SUPABASE_ANON_KEY,
    "user",
    options?.route,
    options?.accessToken
  );
}

function createClientProxy(factory: () => Client): Client {
  return new Proxy({} as Client, {
    get(_, prop) {
      const client = factory();
      const value = (client as Record<PropertyKey, unknown>)[prop];
      if (typeof value === "function") {
        const method = value as (...args: unknown[]) => unknown;
        return (...args: unknown[]) => method.apply(client, args);
      }
      return value;
    },
  });
}

export const supabaseServerClient = createClientProxy(() => createAdminClient());
