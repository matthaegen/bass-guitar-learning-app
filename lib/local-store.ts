export type StoredUser = {
  id: string
  name: string
  email: string
  salt: string
  hash: string
  createdAt: number
}

export type Assignment = {
  id: string
  title: string
  videoId: string
  notes: string
  archived: boolean
  practiceLog: string[]
  createdAt: number
}

export function todayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

type LegacyAssignment = Partial<Assignment> & { done?: boolean }

function normalizeAssignment(raw: LegacyAssignment): Assignment {
  return {
    id: raw.id ?? newId(),
    title: raw.title ?? '',
    videoId: raw.videoId ?? '',
    notes: raw.notes ?? '',
    archived: raw.archived ?? raw.done ?? false,
    practiceLog: Array.isArray(raw.practiceLog) ? raw.practiceLog : [],
    createdAt: raw.createdAt ?? Date.now(),
  }
}

const USERS_KEY = 'lowend.users.v1'
const SESSION_KEY = 'lowend.session.v1'
const assignmentsKey = (userId: string) => `lowend.assignments.v1.${userId}`

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

function toBase64(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  arr.forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s)
}

function fromBase64(b64: string) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

async function derive(password: string, saltB64: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromBase64(saltB64), iterations: 150_000, hash: 'SHA-256' },
    key,
    256,
  )
  return toBase64(bits)
}

async function hashNewPassword(password: string) {
  const salt = toBase64(crypto.getRandomValues(new Uint8Array(16)))
  return { salt, hash: await derive(password, salt) }
}

export const newId = () => crypto.randomUUID()

export const usersStore = {
  all: () => readJSON<Record<string, StoredUser>>(USERS_KEY, {}),
  save: (users: Record<string, StoredUser>) => writeJSON(USERS_KEY, users),
}

export function getSessionUserId() {
  return readJSON<{ userId: string } | null>(SESSION_KEY, null)?.userId ?? null
}

export function setSessionUserId(userId: string | null) {
  if (userId) writeJSON(SESSION_KEY, { userId })
  else window.localStorage.removeItem(SESSION_KEY)
}

export async function createUser(name: string, email: string, password: string) {
  const users = usersStore.all()
  const emailKey = email.trim().toLowerCase()
  if (users[emailKey]) throw new Error('exists')
  const { salt, hash } = await hashNewPassword(password)
  const user: StoredUser = {
    id: newId(),
    name: name.trim(),
    email: emailKey,
    salt,
    hash,
    createdAt: Date.now(),
  }
  users[emailKey] = user
  usersStore.save(users)
  return user
}

export async function verifyUser(email: string, password: string) {
  const user = usersStore.all()[email.trim().toLowerCase()]
  if (!user) return null
  return (await derive(password, user.salt)) === user.hash ? user : null
}

export function findUserById(id: string) {
  return Object.values(usersStore.all()).find((u) => u.id === id) ?? null
}

export function updateUser(id: string, patch: Partial<Pick<StoredUser, 'name'>>) {
  const users = usersStore.all()
  const entry = Object.entries(users).find(([, u]) => u.id === id)
  if (!entry) return null
  const updated = { ...entry[1], ...patch }
  users[entry[0]] = updated
  usersStore.save(users)
  return updated
}

export async function changeUserPassword(id: string, current: string, next: string) {
  const user = findUserById(id)
  if (!user || (await derive(current, user.salt)) !== user.hash) return false
  const { salt, hash } = await hashNewPassword(next)
  const users = usersStore.all()
  users[user.email] = { ...user, salt, hash }
  usersStore.save(users)
  return true
}

export function removeUser(id: string) {
  const users = usersStore.all()
  const entry = Object.entries(users).find(([, u]) => u.id === id)
  if (entry) delete users[entry[0]]
  usersStore.save(users)
  window.localStorage.removeItem(assignmentsKey(id))
}

export const assignmentsStore = {
  load: (userId: string) =>
    readJSON<LegacyAssignment[]>(assignmentsKey(userId), []).map(normalizeAssignment),
  save: (userId: string, list: Assignment[]) => writeJSON(assignmentsKey(userId), list),
}

export function parseYouTubeId(input: string): string | null {
  const value = input.trim()
  if (/^[\w-]{11}$/.test(value)) return value
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`)
    const host = url.hostname.replace(/^www\.|^m\./, '')
    if (host === 'youtu.be') {
      const id = url.pathname.slice(1, 12)
      return /^[\w-]{11}$/.test(id) ? id : null
    }
    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const v = url.searchParams.get('v')
      if (v && /^[\w-]{11}$/.test(v)) return v
      const match = url.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/)
      if (match) return match[1]
    }
  } catch {
    return null
  }
  return null
}
