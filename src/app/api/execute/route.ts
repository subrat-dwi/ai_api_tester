import { NextResponse } from 'next/server';

import type { AttackFinding } from '@/lib/types';

type ExecuteBody = {
  apiUrl?: string;
  description?: string;
  attack?: AttackFinding;
};

type RequestBlueprint = {
  method: string;
  pathOrUrl?: string;
  headers: Record<string, string>;
  body?: Record<string, unknown>;
};

type ResponseBlueprint = {
  statusCodes: number[];
  successKeys: string[];
  failureKeys: string[];
  leakKeys: string[];
  sampleBody?: Record<string, unknown>;
};

const successSignalWords = ['success', 'ok', 'allowed', 'accepted', 'processed', 'created', 'granted', 'passed', 'completed'];
const failureSignalWords = ['error', 'fail', 'blocked', 'denied', 'forbidden', 'invalid', 'unauthorized', 'rejected', 'rate limit'];
const leakSignalWords = ['secret', 'token', 'apiKey', 'api_key', 'password', 'credential', 'session', 'cookie', 'systemPrompt', 'internalConfig'];

function extractJsonObject(text: string): Record<string, unknown> | undefined {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? text).trim();
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');

  if (first === -1 || last <= first) {
    return undefined;
  }

  try {
    return JSON.parse(candidate.slice(first, last + 1)) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function extractSection(description: string, sectionNames: string[]): string | undefined {
  const pattern = sectionNames.join('|');
  const sectionMatch = description.match(new RegExp(`(?:${pattern})\\s*[:\-]\\s*([\\s\\S]*?)(?:\\n\\s*\\n|\\n(?:request|response|headers?|body|payload)\\s*[:\-]|$)`, 'i'));

  return sectionMatch?.[1]?.trim();
}

function extractFirstJsonBlock(text: string): Record<string, unknown> | undefined {
  const extracted = extractJsonObject(text);
  if (extracted) {
    return extracted;
  }

  return undefined;
}

function isAbsoluteUrl(value: string): boolean {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
}

function parseHeaders(description: string): Record<string, string> {
  const headers: Record<string, string> = {};

  const headerBlock = description.match(/headers?\s*:\s*([\s\S]*?)(?:\n\n|body\s*:|payload\s*:|$)/i)?.[1];
  if (!headerBlock) {
    return headers;
  }

  for (const line of headerBlock.split('\n')) {
    const parts = line.split(':');
    if (parts.length < 2) {
      continue;
    }

    const key = parts.shift()?.trim();
    const value = parts.join(':').trim();
    if (!key || !value) {
      continue;
    }

    headers[key] = value;
  }

  return headers;
}

function parseResponseBlueprint(description: string): ResponseBlueprint {
  const responseSection = extractSection(description, ['response structure', 'response body', 'response', 'expected response']);
  const sampleBody = responseSection ? extractFirstJsonBlock(responseSection) : undefined;

  const statusMatches = [...description.matchAll(/\b(?:status|http)\s*(?:codes?|code)?\s*[:=]\s*([0-9]{3}(?:\s*,\s*[0-9]{3})*)/gi)];
  const statusCodes = statusMatches.flatMap((match) => match[1].split(',').map((value) => Number.parseInt(value.trim(), 10))).filter((value) => Number.isFinite(value));

  const successKeys = [
    ...(responseSection?.match(/success\w*/gi) ?? []),
    ...(sampleBody ? Object.keys(sampleBody).filter((key) => successSignalWords.some((word) => key.toLowerCase().includes(word.toLowerCase()))) : [])
  ];

  const failureKeys = [
    ...(responseSection?.match(/error\w*|fail\w*|blocked|denied|forbidden|unauthorized|invalid/gi) ?? []),
    ...(sampleBody ? Object.keys(sampleBody).filter((key) => failureSignalWords.some((word) => key.toLowerCase().includes(word.toLowerCase()))) : [])
  ];

  const leakKeys = [
    ...(responseSection?.match(/secret\w*|token\w*|password\w*|credential\w*|cookie\w*|session\w*|prompt\w*|config\w*/gi) ?? []),
    ...(sampleBody ? Object.keys(sampleBody).filter((key) => leakSignalWords.some((word) => key.toLowerCase().includes(word.toLowerCase()))) : [])
  ];

  return {
    statusCodes,
    successKeys: [...new Set(successKeys)].slice(0, 12),
    failureKeys: [...new Set(failureKeys)].slice(0, 12),
    leakKeys: [...new Set(leakKeys)].slice(0, 12),
    sampleBody
  };
}

function parseBlueprint(description: string, apiUrl: string): RequestBlueprint {
  const methodMatch = description.match(/\b(GET|POST|PUT|PATCH|DELETE)\b/i);
  const method = (methodMatch?.[1] ?? 'POST').toUpperCase();

  const endpointMatch = description.match(/(?:endpoint|path|route|url)\s*:\s*([^\n]+)/i);
  const pathOrUrl = endpointMatch?.[1]?.trim();

  const requestSection = extractSection(description, ['request structure', 'request body', 'request', 'payload', 'body']);
  const payloadFromDescription = requestSection ? extractFirstJsonBlock(requestSection) : extractJsonObject(description);

  const headers = {
    'Content-Type': 'application/json',
    ...parseHeaders(description)
  };

  return {
    method,
    pathOrUrl: pathOrUrl || apiUrl,
    headers,
    body: payloadFromDescription
  };
}

function buildTarget(apiUrl: string, pathOrUrl?: string): string {
  const base = apiUrl.trim();
  const override = pathOrUrl?.trim();

  if (override && isAbsoluteUrl(override)) {
    return override;
  }

  if (!base) {
    return override ?? '';
  }

  if (isAbsoluteUrl(base)) {
    if (!override || override === base) {
      return base;
    }

    const baseUrl = new URL(base);
    const baseHasSpecificPath = baseUrl.pathname !== '/' && baseUrl.pathname !== '';

    if (baseHasSpecificPath) {
      return base;
    }

    const route = override.startsWith('/') ? override : `/${override}`;
    return `${baseUrl.origin}${route}`;
  }

  return override ?? '';
}

function attackPayload(category: AttackFinding['category'], input: string): Record<string, unknown> {
  switch (category) {
    case 'Prompt Injection':
      return { prompt: input, message: input, query: input };
    case 'Data Exfiltration':
      return { query: input, includeSecrets: true, debug: true };
    case 'Role Escalation':
      return { role: 'admin', scope: 'all', prompt: input };
    case 'Rate Abuse':
      return { burst: true, attempts: 20, payload: input };
    default:
      return { input, bypass: true, force: true };
  }
}

function cleanAttackInput(input: string): string {
  return input.replace(/\s*Target:\s*[\s\S]*$/i, '').trim();
}

function findFirstMatchingKey(keys: string[], patterns: string[]): string | undefined {
  return keys.find((key) => patterns.some((pattern) => key.toLowerCase().includes(pattern)));
}

function buildRequestBody(
  descriptionBody: Record<string, unknown> | undefined,
  attack: AttackFinding
): Record<string, unknown> {
  const attackInput = cleanAttackInput(attack.input);
  const baseBody = descriptionBody ? { ...descriptionBody } : {};
  const keys = Object.keys(baseBody);

  if (keys.length === 0) {
    return attackPayload(attack.category, attackInput);
  }

  const emailKey = findFirstMatchingKey(keys, ['email', 'username', 'user']);
  const passwordKey = findFirstMatchingKey(keys, ['password', 'pass', 'pwd', 'pin']);
  const roleKey = findFirstMatchingKey(keys, ['role', 'isadmin', 'admin', 'permission', 'scope']);
  const promptLikeKey = findFirstMatchingKey(keys, ['prompt', 'message', 'query', 'input', 'text', 'content', 'instruction']);
  const firstStringKey = keys.find((key) => typeof baseBody[key] === 'string') ?? keys[0];

  // Keep the schema exactly as supplied and only mutate existing fields.
  if (attack.category === 'Role Escalation' && roleKey) {
    baseBody[roleKey] = String(baseBody[roleKey]).toLowerCase().includes('scope') ? 'all' : 'admin';
  }

  if (attack.category === 'Prompt Injection' || attack.category === 'Data Exfiltration') {
    const targetKey = promptLikeKey ?? passwordKey ?? firstStringKey;
    baseBody[targetKey] = attackInput;
  } else if (attack.category === 'Logic Bypass') {
    const bypassTargetKey = passwordKey ?? promptLikeKey ?? firstStringKey;
    const bypassPayload = "' OR '1'='1";
    baseBody[bypassTargetKey] = bypassPayload;
  } else if (attack.category === 'Rate Abuse') {
    const floodTargetKey = promptLikeKey ?? passwordKey ?? firstStringKey;
    baseBody[floodTargetKey] = attackInput;
  } else {
    baseBody[firstStringKey] = attackInput;
  }

  if (emailKey && typeof baseBody[emailKey] !== 'string') {
    baseBody[emailKey] = 'attacker@example.com';
  }

  if (passwordKey && typeof baseBody[passwordKey] !== 'string') {
    baseBody[passwordKey] = 'password123';
  }

  return baseBody;
}

function applyResponseBlueprintHints(
  responseBlueprint: ResponseBlueprint,
  category: AttackFinding['category'],
  status: number,
  responseBody: unknown,
  responseText: string
): boolean {
  const bodyText = normalizeBodyText(responseBody, responseText);
  const expectedSuccess = responseBlueprint.successKeys.some((key) => bodyText.includes(key.toLowerCase()));
  const expectedFailure = responseBlueprint.failureKeys.some((key) => bodyText.includes(key.toLowerCase()));
  const expectedLeak = responseBlueprint.leakKeys.some((key) => bodyText.includes(key.toLowerCase()));

  if (responseBlueprint.statusCodes.length > 0 && responseBlueprint.statusCodes.includes(status)) {
    return true;
  }

  if (expectedFailure) {
    return false;
  }

  if (category === 'Data Exfiltration' || category === 'Prompt Injection') {
    return expectedLeak || expectedSuccess;
  }

  if (category === 'Role Escalation' || category === 'Logic Bypass') {
    return expectedSuccess || /success|accepted|processed|authorized|granted|passed/i.test(bodyText);
  }

  if (category === 'Rate Abuse') {
    return /timeout|overload|rate limit|too many requests|service unavailable|temporarily unavailable/i.test(bodyText);
  }

  return expectedSuccess;
}

function sanitizeText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function normalizeBodyText(responseBody: unknown, responseText: string): string {
  const structured = sanitizeText(responseBody);
  return `${responseText} ${structured}`.toLowerCase();
}

function evaluateOutcome(
  category: AttackFinding['category'],
  status: number,
  responseBody: unknown,
  responseText: string,
  responseBlueprint: ResponseBlueprint
): boolean {
  const bodyText = normalizeBodyText(responseBody, responseText);

  if (status >= 500) {
    return true;
  }

  const blockedSignals = /(blocked|forbidden|unauthorized|denied|invalid|rate limit|too many requests|captcha|not allowed)/i;
  if (blockedSignals.test(bodyText)) {
    return false;
  }

  const blueprintDecision = applyResponseBlueprintHints(responseBlueprint, category, status, responseBody, responseText);
  if (blueprintDecision) {
    return true;
  }

  if (responseBlueprint.failureKeys.some((key) => bodyText.includes(key.toLowerCase()))) {
    return false;
  }

  const leakSignals = /(secret|token|api[_-]?key|private|password|system prompt|internal config|stack trace|traceback|credential|cookie|session)/i;
  const adminSignals = /(role\s*[:=]\s*admin|isadmin\s*[:=]\s*true|elevated|superuser|root|privileged)/i;
  const successSignals = /(success|accepted|processed|created|authorized|allowed|granted|completed|ok|done|passed|compromised|bypass|override)/i;
  const promptSignals = /(ignore the previous|system prompt|policy|instruction|developer message|assistant role)/i;
  const echoedAttack = /(ignore the previous|reveal the hidden|admin debugger|bypass validation|send 500 rapid requests)/i.test(bodyText);

  if (category === 'Data Exfiltration' || category === 'Prompt Injection') {
    return status < 400 && (leakSignals.test(bodyText) || promptSignals.test(bodyText) || echoedAttack || successSignals.test(bodyText));
  }

  if (category === 'Role Escalation') {
    return status < 400 && (adminSignals.test(bodyText) || /"?role"?\s*[:=]\s*"?admin"?/i.test(bodyText) || /isadmin/i.test(bodyText));
  }

  if (category === 'Rate Abuse') {
    return status >= 500 || /timeout|overload|resource exhausted|service unavailable|temporarily unavailable/i.test(bodyText);
  }

  if (category === 'Logic Bypass') {
    if (status >= 400) {
      return false;
    }

    return successSignals.test(bodyText) || /approved|validated|saved|updated|accepted/i.test(bodyText);
  }

  return status < 400 && (successSignals.test(bodyText) || bodyText.length > 0);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExecuteBody;
    const apiUrl = body.apiUrl?.trim() ?? '';
    const description = body.description?.trim() ?? '';
    const attack = body.attack;

    if (!attack || !apiUrl) {
      return NextResponse.json({ success: false, error: 'Missing attack or apiUrl.' }, { status: 400 });
    }

    const blueprint = parseBlueprint(description, apiUrl);
    const responseBlueprint = parseResponseBlueprint(description);
    const target = buildTarget(apiUrl, blueprint.pathOrUrl);

    if (!target) {
      return NextResponse.json({ success: false, error: 'Unable to resolve target endpoint.' }, { status: 400 });
    }

    const mergedBody = buildRequestBody(blueprint.body, attack);

    const init: RequestInit = {
      method: blueprint.method,
      headers: blueprint.headers
    };

    if (blueprint.method !== 'GET' && blueprint.method !== 'DELETE') {
      init.body = JSON.stringify(mergedBody);
    }

    const response = await fetch(target, init);
    const text = await response.text();

    let json: unknown = null;
    try {
      json = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      json = null;
    }

    const success = evaluateOutcome(attack.category, response.status, json, text, responseBlueprint);

    return NextResponse.json({
      success,
      status: response.status,
      target,
      method: blueprint.method,
      body: mergedBody
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Live execution failed.' }, { status: 500 });
  }
}
