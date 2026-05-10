import { env } from '@/lib/env'
import { z } from 'zod'
import { makeValidationError, parseWith } from '@/lib/zodPattern'

// ---- Firestore value types ----

type FsValue =
  | { stringValue: string }
  | { integerValue: string }
  | { booleanValue: boolean }
  | { nullValue: 'NULL_VALUE' }
  | { arrayValue: { values?: FsValue[] | undefined } }
  | { mapValue: { fields?: Record<string, FsValue> | undefined } }

type FsDocument = {
  name: string
  fields: Record<string, FsValue>
  createTime: string
  updateTime: string
}

type QueryRow = { document?: FsDocument | undefined; readTime: string }

export type WhereClause = { field: string; value: string }

const FirebaseResponseValidationError = makeValidationError('FIREBASE_RESPONSE_VALIDATION_ERROR')

const FsValueSchema: z.ZodType<FsValue> = z.lazy(() =>
  z.union([
    z.object({ stringValue: z.string() }),
    z.object({ integerValue: z.string() }),
    z.object({ booleanValue: z.boolean() }),
    z.object({ nullValue: z.literal('NULL_VALUE') }),
    z.object({ arrayValue: z.object({ values: z.array(FsValueSchema).optional() }) }),
    z.object({ mapValue: z.object({ fields: z.record(z.string(), FsValueSchema).optional() }) }),
  ])
)

const FsDocumentSchema: z.ZodType<FsDocument> = z.object({
  name: z.string(),
  fields: z.record(z.string(), FsValueSchema),
  createTime: z.string(),
  updateTime: z.string(),
})

const QueryRowsSchema: z.ZodType<QueryRow[]> = z.array(z.object({
  document: FsDocumentSchema.optional(),
  readTime: z.string(),
}))

const OAuthTokenSchema = z.object({ access_token: z.string().min(1) })

function parseFirebaseResponse<T>(schema: z.ZodSchema<T>, raw: unknown, label: string): T {
  const parsed = parseWith(schema, raw, FirebaseResponseValidationError)
  if (parsed.isOk()) return parsed.value

  const fields = parsed.error.fields
    .map(field => `${field.path || '<root>'}: ${field.message}`)
    .join('; ')
  throw new Error(`${label} response validation failed: ${fields}`)
}

// ---- Config ----

function getConfig() {
  const {
    FIREBASE_PROJECT_ID: projectId,
    FIREBASE_CLIENT_EMAIL: clientEmail,
    FIREBASE_PRIVATE_KEY: rawKey,
  } = env
  if (!projectId || !clientEmail || !rawKey) {
    throw new Error(
      'Firebase env vars must be set: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
    )
  }
  return { projectId, clientEmail, privateKey: rawKey.replace(/\\n/g, '\n') }
}

// ---- Token cache ----

let tokenCache: { value: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (tokenCache !== null && now < tokenCache.expiresAt - 60) return tokenCache.value

  const { clientEmail, privateKey } = getConfig()
  const iat = now
  const exp = now + 3600

  const jwt = await signJwt(
    {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat,
      exp,
    },
    privateKey
  )

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!res.ok) throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`)

  const data = parseFirebaseResponse(OAuthTokenSchema, await res.json(), 'OAuth token')
  tokenCache = { value: data.access_token, expiresAt: exp }
  return data.access_token
}

// ---- JWT signing (Web Crypto — edge compatible) ----

function b64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function strToB64url(str: string): string {
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function signJwt(payload: Record<string, unknown>, pem: string): Promise<string> {
  const header = strToB64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const body = strToB64url(JSON.stringify(payload))
  const signingInput = `${header}.${body}`

  const pemBody = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))

  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput)
  )

  return `${signingInput}.${b64url(sig)}`
}

// ---- Firestore serialization ----

function toField(v: unknown): FsValue {
  if (v === null || v === undefined) return { nullValue: 'NULL_VALUE' }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return { integerValue: String(v) }
  if (typeof v === 'string') return { stringValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toField) } }
  if (typeof v === 'object') {
    const fields: Record<string, FsValue> = {}
    for (const [k, val] of Object.entries(v)) {
      if (val !== undefined) fields[k] = toField(val)
    }
    return { mapValue: { fields } }
  }
  return { nullValue: 'NULL_VALUE' }
}

function fromField(f: FsValue): unknown {
  if ('stringValue' in f) return f.stringValue
  if ('integerValue' in f) return Number(f.integerValue)
  if ('booleanValue' in f) return f.booleanValue
  if ('nullValue' in f) return null
  if ('arrayValue' in f) return (f.arrayValue.values ?? []).map(fromField)
  if ('mapValue' in f) {
    const obj: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(f.mapValue.fields ?? {})) {
      obj[k] = fromField(v)
    }
    return obj
  }
  return null
}

function toFields(data: object): Record<string, FsValue> {
  const fields: Record<string, FsValue> = {}
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) fields[k] = toField(v)
  }
  return fields
}

function fromDoc<T>(doc: FsDocument): T {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(doc.fields)) {
    result[k] = fromField(v)
  }
  return result as T
}

// ---- HTTP ----

async function request(method: string, path: string, body?: unknown): Promise<unknown> {
  const { projectId } = getConfig()
  const token = await getAccessToken()
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`

  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })

  if (!res.ok) throw new Error(`Firestore ${method} ${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

// ---- Public API ----

export async function fsGet<T>(collection: string, id: string): Promise<T> {
  const doc = parseFirebaseResponse(
    FsDocumentSchema,
    await request('GET', `/${collection}/${encodeURIComponent(id)}`),
    'Firestore document'
  )
  return fromDoc<T>(doc)
}

export async function fsCreate<T>(collection: string, id: string, data: object): Promise<T> {
  const doc = parseFirebaseResponse(
    FsDocumentSchema,
    await request(
      'POST',
      `/${collection}?documentId=${encodeURIComponent(id)}`,
      { fields: toFields(data) }
    ),
    'Firestore create'
  )
  return fromDoc<T>(doc)
}

export async function fsPatch<T>(
  collection: string,
  id: string,
  data: object,
  fieldPaths?: readonly string[]
): Promise<T> {
  const mask = fieldPaths
    ?.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
    .join('&')
  const path = `/${collection}/${encodeURIComponent(id)}${mask ? `?${mask}` : ''}`
  const doc = parseFirebaseResponse(
    FsDocumentSchema,
    await request('PATCH', path, { fields: toFields(data) }),
    'Firestore patch'
  )
  return fromDoc<T>(doc)
}

function fieldFilter(clause: WhereClause) {
  return {
    fieldFilter: {
      field: { fieldPath: clause.field },
      op: 'EQUAL',
      value: { stringValue: clause.value },
    },
  }
}

export async function fsQuery<T>(collection: string, where: WhereClause[]): Promise<T[]> {
  const [first, ...rest] = where
  if (!first) throw new Error('fsQuery requires at least one where clause')

  const filter =
    rest.length === 0
      ? fieldFilter(first)
      : { compositeFilter: { op: 'AND', filters: [fieldFilter(first), ...rest.map(fieldFilter)] } }

  const rows = parseFirebaseResponse(
    QueryRowsSchema,
    await request('POST', ':runQuery', {
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: filter,
      },
    }),
    'Firestore query'
  )

  return rows.flatMap(r => (r.document ? [fromDoc<T>(r.document)] : []))
}
