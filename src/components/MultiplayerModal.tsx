import React, { useState } from 'react'
import { HERO_CLASSES } from '../data/characters'
import { RoomSeat } from '../engine/multiplayer'

interface MultiplayerModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateRoom: (name: string, heroClassId: string) => Promise<string | null>
  onJoinRoom: (code: string, name: string, heroClassId: string) => Promise<boolean>
  roomCode: string | null
  mySeat: 'p1' | 'p2' | null
  seats: { p1: RoomSeat | null; p2: RoomSeat | null } | null
  onLeaveRoom: () => void
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  onJoinRoom,
  roomCode,
  mySeat,
  seats,
  onLeaveRoom,
}) => {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu')
  const [playerName, setPlayerName] = useState('Hrdina')
  const [heroClassId, setHeroClassId] = useState('warrior')
  const [inputCode, setInputCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  if (!isOpen) return null

  const handleCreate = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    const code = await onCreateRoom(playerName, heroClassId)
    setIsLoading(false)
    if (!code) {
      setErrorMessage('Nepodařilo se vytvořit místnost. Zkontroluj připojení.')
    }
  }

  const handleJoin = async () => {
    if (!inputCode || inputCode.length !== 6) {
      setErrorMessage('Kód místnosti musí mít přesně 6 číslic.')
      return
    }
    setIsLoading(true)
    setErrorMessage(null)
    const success = await onJoinRoom(inputCode, playerName, heroClassId)
    setIsLoading(false)
    if (!success) {
      setErrorMessage('Připojení selhalo. Ověř kód místnosti.')
    }
  }

  const shareUrl = roomCode ? `${window.location.origin}/proroctvi/?room=${roomCode}` : ''

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-stone-900 border-2 border-stone-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌐</span>
            <h2 className="text-lg font-black text-amber-400 font-serif uppercase tracking-wider">
              Online Multiplayer (2 hráči)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-100 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* If already in a room */}
        {roomCode ? (
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 text-center">
              <div className="text-xs text-stone-400 uppercase tracking-widest font-semibold">
                Kód tvé místnosti
              </div>
              <div className="text-4xl font-mono font-black text-amber-400 my-2 tracking-widest">
                {roomCode}
              </div>
              <p className="text-xs text-stone-400">
                Pošli tento kód kamarádovi nebo zkopíruj odkaz níže.
              </p>

              <button
                onClick={copyShareLink}
                className="mt-3 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl border border-stone-700 w-full flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🔗</span>
                <span>{copiedLink ? '✓ Odkaz zkopírován do schránky!' : 'Kopírovat odkaz ke hře'}</span>
              </button>
            </div>

            {/* Players Status in Room */}
            <div className="bg-stone-950/80 p-3 rounded-xl border border-stone-800 flex flex-col gap-2">
              <div className="text-xs font-bold text-stone-400 uppercase">
                Stav připojení hráčů:
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-stone-200">
                    Hráč 1: {seats?.p1?.name || 'Založil místnost'} {mySeat === 'p1' && '(Ty)'}
                  </span>
                </span>
                <span className="text-emerald-400 font-bold">Připojen</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      seats?.p2 ? 'bg-emerald-500 animate-pulse' : 'bg-stone-600'
                    }`}
                  />
                  <span className="font-bold text-stone-200">
                    Hráč 2: {seats?.p2?.name || 'Čeká se na připojení...'} {mySeat === 'p2' && '(Ty)'}
                  </span>
                </span>
                <span className={seats?.p2 ? 'text-emerald-400 font-bold' : 'text-stone-500'}>
                  {seats?.p2 ? 'Připojen' : 'Čeká'}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 font-black text-xs uppercase rounded-xl shadow cursor-pointer"
              >
                Vstoupit do hry
              </button>
              <button
                onClick={onLeaveRoom}
                className="px-3 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 text-xs font-bold uppercase rounded-xl cursor-pointer"
              >
                Opustit místnost
              </button>
            </div>
          </div>
        ) : mode === 'menu' ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setMode('create')}
              className="p-4 bg-stone-950 border border-stone-800 hover:border-amber-500 rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="text-sm font-bold text-amber-400 group-hover:text-amber-300">
                ✨ Založit novou hru
              </div>
              <div className="text-xs text-stone-400 mt-1">
                Vytvoř novou místnost a získej kód pro druhého hráče.
              </div>
            </button>

            <button
              onClick={() => setMode('join')}
              className="p-4 bg-stone-950 border border-stone-800 hover:border-blue-500 rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="text-sm font-bold text-blue-400 group-hover:text-blue-300">
                🔑 Připojit se ke hře
              </div>
              <div className="text-xs text-stone-400 mt-1">
                Zadej 6místný kód od kamaráda a začněte hrát.
              </div>
            </button>
          </div>
        ) : (
          /* Form for Create or Join */
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-bold text-stone-400 uppercase">Tvé jméno</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                className="w-full mt-1 p-2 bg-stone-950 border border-stone-800 rounded-xl text-sm font-bold text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-400 uppercase">Vyber hrdinu</label>
              <select
                value={heroClassId}
                onChange={(e) => setHeroClassId(e.target.value)}
                className="w-full mt-1 p-2 bg-stone-950 border border-stone-800 rounded-xl text-sm font-bold text-stone-100 focus:outline-none focus:border-amber-500"
              >
                {HERO_CLASSES.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.avatar} {h.name} ({h.title})
                  </option>
                ))}
              </select>
            </div>

            {mode === 'join' && (
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase">
                  6místný kód místnosti
                </label>
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full mt-1 p-2 bg-stone-950 border border-stone-800 rounded-xl text-lg font-mono font-black text-center text-amber-400 focus:outline-none focus:border-amber-500 tracking-widest"
                />
              </div>
            )}

            {errorMessage && (
              <div className="p-2 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setMode('menu')}
                className="px-4 py-2.5 bg-stone-800 text-stone-300 font-bold text-xs uppercase rounded-xl cursor-pointer"
              >
                Zpět
              </button>
              <button
                onClick={mode === 'create' ? handleCreate : handleJoin}
                disabled={isLoading}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 font-black text-xs uppercase rounded-xl shadow cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Zpracovávám...' : mode === 'create' ? 'Vytvořit místnost' : 'Připojit se'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
