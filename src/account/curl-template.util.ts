import { BadRequestException } from "@nestjs/common";
import axios from "axios";

import parseCurlLib from "parse-curl";

export interface CurlParsedRequest {
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  data?: string;
}

export interface CurlTemplateTarget {
  username: string;
  vars: Record<string, string>;
}

const tokenizeCommandLine = (input: string): string[] => {
  const tokens: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inSingle) {
      if (ch === "'") inSingle = false;
      else current += ch;
      continue;
    }

    if (inDouble) {
      if (ch === '"') {
        inDouble = false;
        continue;
      }
      if (ch === "\\" && i + 1 < input.length) {
        current += input[i + 1];
        i++;
        continue;
      }
      current += ch;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    if (ch === "\\" && i + 1 < input.length) {
      current += input[i + 1];
      i++;
      continue;
    }

    current += ch;
  }

  if (current) tokens.push(current);
  return tokens;
};

const parseHeaderLine = (line: string): { key: string; value: string } | null => {
  const idx = line.indexOf(":");
  if (idx <= 0) return null;
  const key = line.slice(0, idx).trim();
  const value = line.slice(idx + 1).trim();
  if (!key) return null;
  return { key, value };
};

const normalizeMaybeWrapped = (value: string): string => {
  const trimmed = String(value ?? "").trim();
  if (trimmed.length >= 2 && trimmed.startsWith("`") && trimmed.endsWith("`")) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const hasHeader = (headers: Record<string, string>, headerName: string): boolean => {
  const target = headerName.toLowerCase();
  return Object.keys(headers || {}).some((k) => String(k).toLowerCase() === target);
};

const quotePosix = (value: string): string => {
  const s = String(value ?? "");
  return `'${s.replace(/'/g, "'\\''")}'`;
};

const quotePowerShell = (value: string): string => {
  const s = String(value ?? "");
  return `"${s.replace(/`/g, "``").replace(/"/g, '`"')}"`;
};

const buildCurlCommand = (args: {
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  data?: string;
}) => {
  const headerEntries = Object.entries(args.headers || {}).filter(([k]) => String(k || "").trim());

  const posixParts: string[] = ["curl", "-X", args.method, quotePosix(args.url)];
  for (const [k, v] of headerEntries) {
    posixParts.push("-H", quotePosix(`${k}: ${v}`));
  }
  if (args.data !== undefined) {
    posixParts.push("--data-raw", quotePosix(String(args.data)));
  }

  const psParts: string[] = ["curl.exe", "-X", args.method, quotePowerShell(args.url)];
  for (const [k, v] of headerEntries) {
    psParts.push("-H", quotePowerShell(`${k}: ${v}`));
  }
  if (args.data !== undefined) {
    psParts.push("--data-raw", quotePowerShell(String(args.data)));
  }

  return {
    posix: posixParts.join(" "),
    powershell: psParts.join(" "),
  };
};

export const parseCurl = (curl: string): CurlParsedRequest => {
  const raw = String(curl || "").replace(/\\\s*\r?\n/g, " ").trim();
  if (!raw) throw new BadRequestException("cURL 不能为空");
  if (raw.length > 20000) throw new BadRequestException("cURL 过长");

  const rawHasDataRawLikeFlag = /(^|\s)--data-raw(\s|$)|(^|\s)--data-binary(\s|$)|(^|\s)--data-urlencode(\s|$)/i.test(raw);
  const rawDataFlagMatches = raw.match(/(^|\s)(-d|--data|--data-raw|--data-binary|--data-urlencode)(\s|$)/gi) ?? [];
  const rawHasMultipleDataFlags = rawDataFlagMatches.length > 1;

  const parsedByLib = (() => {
    try {
      if (typeof parseCurlLib !== "function") return undefined;
      const res = parseCurlLib(raw.startsWith("curl ") ? raw : `curl ${raw.replace(/^curl\s+/i, "")}`);
      if (!res?.url) return undefined;
      return res;
    } catch {
      return undefined;
    }
  })();

  if (
    parsedByLib?.url &&
    !rawHasMultipleDataFlags &&
    (!rawHasDataRawLikeFlag || parsedByLib.body !== undefined)
  ) {
    const url = normalizeMaybeWrapped(parsedByLib.url);
    const method = String(parsedByLib.method || (parsedByLib.body ? "POST" : "GET")).toUpperCase();
    const m: "GET" | "POST" = method === "POST" ? "POST" : "GET";
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsedByLib.header || {})) {
      headers[String(k)] = String(v ?? "");
    }
    const data = parsedByLib.body !== undefined ? String(parsedByLib.body) : undefined;
    return { url, method: m, headers, data };
  }

  const tokens = tokenizeCommandLine(raw);
  if (!tokens.length) throw new BadRequestException("cURL 解析失败");

  let startIndex = 0;
  if (tokens[0] === "$") startIndex = 1;

  const first = tokens[startIndex] || "";
  const isCurl =
    first === "curl" ||
    first.toLowerCase().endsWith("/curl") ||
    first.toLowerCase().endsWith("\\curl");
  if (!isCurl) throw new BadRequestException("仅支持以 curl 开头的命令");

  let url = "";
  let method: "GET" | "POST" | "" = "";
  const headers: Record<string, string> = {};
  const dataParts: string[] = [];

  for (let i = startIndex + 1; i < tokens.length; i++) {
    const t = tokens[i];

    if (t === "-X" || t === "--request") {
      const m = (tokens[i + 1] || "").toUpperCase();
      i++;
      if (m === "GET" || m === "POST") method = m;
      continue;
    }

    if (t === "-H" || t === "--header") {
      const line = tokens[i + 1] || "";
      i++;
      const parsed = parseHeaderLine(line);
      if (parsed) headers[parsed.key] = parsed.value;
      continue;
    }

    if (
      t === "-d" ||
      t === "--data" ||
      t === "--data-raw" ||
      t === "--data-binary" ||
      t === "--data-urlencode"
    ) {
      dataParts.push(String(tokens[i + 1] ?? ""));
      i++;
      continue;
    }

    if (t === "--url") {
      url = tokens[i + 1] || "";
      i++;
      continue;
    }

    if (t === "-G" || t === "--get") {
      method = "GET";
      continue;
    }

    if (!t.startsWith("-") && !url && /^https?:\/\//i.test(t)) {
      url = t;
      continue;
    }
  }

  const data = dataParts.length ? dataParts.join("&") : undefined;
  if (!method) method = data ? "POST" : "GET";
  if (!url) throw new BadRequestException("cURL 未解析到 URL");
  if (method !== "GET" && method !== "POST") throw new BadRequestException("仅支持 GET/POST");

  return {
    url: normalizeMaybeWrapped(url),
    method,
    headers,
    data,
  };
};

export const createZlongameUrlGuard = () => {
  const isAllowedHost = (hostname: string): boolean => {
    const host = (hostname || "").toLowerCase();
    if (!host) return false;
    if (host === "activity.zlongame.com") return true;
    if (host === "mz.zlongame.com") return true;
    if (host === "member.zlongame.com") return true;
    if (host === "passport.zlongame.com") return true;
    return host.endsWith(".zlongame.com");
  };

  return (url: string) => {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      throw new BadRequestException("URL 非法");
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new BadRequestException("仅支持 http/https");
    }
    if (!isAllowedHost(u.hostname)) {
      throw new BadRequestException("URL 域名不在允许列表");
    }
  };
};

export const sanitizeHeaders = (headers: Record<string, string>): Record<string, string> => {
  const banned = new Set(["cookie", "authorization", "proxy-authorization", "content-length"]);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers || {})) {
    const key = String(k || "").trim();
    if (!key) continue;
    if (banned.has(key.toLowerCase())) continue;
    out[key] = String(v ?? "");
  }
  return out;
};

export const substituteTemplate = (input: string, vars: Record<string, string>): string => {
  return String(input ?? "").replace(/\$\{([a-zA-Z0-9_]+)\}/g, (m, key) => {
    const v = vars[key];
    return v === undefined ? m : v;
  });
};

export const executeCurlTemplate = async (args: {
  parsed: CurlParsedRequest;
  targets: CurlTemplateTarget[];
  urlGuard: (url: string) => void;
  concurrency?: number;
  timeoutMs?: number;
}) => {
  const { parsed, targets, urlGuard } = args;
  const concurrency = Math.max(1, Math.min(args.concurrency ?? 5, targets.length || 1));
  const timeoutMs = Math.max(1000, args.timeoutMs ?? 15000);

  urlGuard(parsed.url);

  const results: Array<{
    username: string;
    success: boolean;
    request?: any;
    response?: any;
    error?: string;
  }> = new Array(targets.length);
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= targets.length) return;

      const target = targets[idx];
      const vars = target.vars || {};

      const url = normalizeMaybeWrapped(substituteTemplate(parsed.url, vars));
      urlGuard(url);

      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed.headers || {})) {
        headers[k] = normalizeMaybeWrapped(substituteTemplate(v, vars));
      }

      const sanitizedHeaders = sanitizeHeaders(headers);
      const data = parsed.data ? substituteTemplate(parsed.data, vars) : undefined;
      const invokedCurl = buildCurlCommand({
        url,
        method: parsed.method,
        headers: sanitizedHeaders,
        data,
      });
      try {
        const res = await axios.request({
          url,
          method: parsed.method,
          headers: sanitizedHeaders,
          data,
          timeout: timeoutMs,
          validateStatus: () => true,
          responseType: "text",
          transformResponse: (v) => v,
        });

        const httpOk = res.status >= 200 && res.status < 300;
        results[idx] = {
          username: target.username,
          success: httpOk,
          request: {
            url,
            method: parsed.method,
            headers: sanitizedHeaders,
            data,
            curl: invokedCurl,
            timeoutMs,
            status: res.status,
          },
          response: res.data,
          error: httpOk ? undefined : `HTTP ${res.status}`,
        };
      } catch (error) {
        results[idx] = {
          username: target.username,
          success: false,
          request: {
            url,
            method: parsed.method,
            headers: sanitizedHeaders,
            data,
            curl: invokedCurl,
            timeoutMs,
          },
          error: error?.message || "请求失败",
        };
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
};
