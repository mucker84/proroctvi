import { GameState } from './types'

export interface RoomSeat {
  name: string
  heroClassId: string
  online: boolean
}

export interface RoomResponse {
  ok: boolean
  code?: string
  me?: 'p1' | 'p2'
  token?: string
  v?: number
  seats?: {
    p1: RoomSeat | null
    p2: RoomSeat | null
  }
  state?: GameState
  started?: boolean
  error?: string
}

const API_ENDPOINT = '/api/proroctvi/room'

async function postRoom(data: Record<string, unknown>): Promise<RoomResponse> {
  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function createOnlineRoom(
  playerName: string,
  heroClassId: string,
  initialState: GameState
): Promise<RoomResponse> {
  return postRoom({
    action: 'create',
    name: playerName,
    heroClassId,
    initialState,
  })
}

export async function joinOnlineRoom(
  code: string,
  playerName: string,
  heroClassId: string
): Promise<RoomResponse> {
  return postRoom({
    action: 'join',
    code,
    name: playerName,
    heroClassId,
  })
}

export async function syncOnlineRoom(
  code: string,
  token: string
): Promise<RoomResponse> {
  return postRoom({
    action: 'sync',
    code,
    token,
  })
}

export async function updateOnlineRoomState(
  code: string,
  token: string,
  state: GameState
): Promise<RoomResponse> {
  return postRoom({
    action: 'update',
    code,
    token,
    state,
  })
}

export async function startOnlineRoomGame(
  code: string,
  token: string,
  state: GameState
): Promise<RoomResponse> {
  return postRoom({
    action: 'start',
    code,
    token,
    state,
  })
}
