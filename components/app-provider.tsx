'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  type Assignment,
  assignmentsStore,
  changeUserPassword,
  createUser,
  findUserById,
  getSessionUserId,
  newId,
  removeUser,
  setSessionUserId,
  todayKey,
  updateUser,
  verifyUser,
} from '@/lib/local-store'

export type PublicUser = { id: string; name: string; email: string; createdAt: number }

type AppContextValue = {
  ready: boolean
  user: PublicUser | null
  assignments: Assignment[]
  signUp: (name: string, email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => void
  updateName: (name: string) => void
  changePassword: (current: string, next: string) => Promise<boolean>
  deleteAccount: () => void
  addAssignment: (data: Pick<Assignment, 'title' | 'videoId' | 'notes'>) => Assignment
  updateAssignment: (id: string, patch: Partial<Omit<Assignment, 'id'>>) => void
  deleteAssignment: (id: string) => void
  togglePracticedToday: (id: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

const toPublic = (u: { id: string; name: string; email: string; createdAt: number }) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  createdAt: u.createdAt,
})

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<PublicUser | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])

  useEffect(() => {
    const id = getSessionUserId()
    const found = id ? findUserById(id) : null
    if (found) {
      setUser(toPublic(found))
      setAssignments(assignmentsStore.load(found.id))
    } else if (id) {
      setSessionUserId(null)
    }
    setReady(true)
  }, [])

  const startSession = useCallback((u: PublicUser) => {
    setSessionUserId(u.id)
    setUser(u)
    setAssignments(assignmentsStore.load(u.id))
  }, [])

  const persistAssignments = useCallback(
    (updater: (prev: Assignment[]) => Assignment[]) => {
      if (!user) return
      setAssignments((prev) => {
        const next = updater(prev)
        assignmentsStore.save(user.id, next)
        return next
      })
    },
    [user],
  )

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      user,
      assignments,
      signUp: async (name, email, password) => {
        const created = await createUser(name, email, password)
        startSession(toPublic(created))
      },
      signIn: async (email, password) => {
        const found = await verifyUser(email, password)
        if (!found) return false
        startSession(toPublic(found))
        return true
      },
      signOut: () => {
        setSessionUserId(null)
        setUser(null)
        setAssignments([])
      },
      updateName: (name) => {
        if (!user) return
        const updated = updateUser(user.id, { name: name.trim() })
        if (updated) setUser(toPublic(updated))
      },
      changePassword: (current, next) =>
        user ? changeUserPassword(user.id, current, next) : Promise.resolve(false),
      deleteAccount: () => {
        if (!user) return
        removeUser(user.id)
        setSessionUserId(null)
        setUser(null)
        setAssignments([])
      },
      addAssignment: (data) => {
        const item: Assignment = {
          ...data,
          id: newId(),
          archived: false,
          practiceLog: [],
          createdAt: Date.now(),
        }
        persistAssignments((prev) => [item, ...prev])
        return item
      },
      updateAssignment: (id, patch) =>
        persistAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a))),
      deleteAssignment: (id) => persistAssignments((prev) => prev.filter((a) => a.id !== id)),
      togglePracticedToday: (id) => {
        const today = todayKey()
        persistAssignments((prev) =>
          prev.map((a) => {
            if (a.id !== id) return a
            const practiceLog = a.practiceLog.includes(today)
              ? a.practiceLog.filter((d) => d !== today)
              : [...a.practiceLog, today]
            return { ...a, practiceLog }
          }),
        )
      },
    }),
    [ready, user, assignments, startSession, persistAssignments],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
