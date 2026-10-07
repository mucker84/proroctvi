import React, { useState } from 'react'
import { HERO_CLASSES } from '../data/characters'
import { RoomSeat } from '../engine/multiplayer'

interface LobbyScreenProps {
  onStartHotseat: (p1HeroId: string, p2HeroId: string) => void
  onCreateOnlineRoom: (name: string, heroClassId: string) => Promise<string | null>
  onJoinOnlineRoom: (code: string, name: string, heroClassId: string) => Promise<boolean>
  onStartOnlineGame: () => Promise<void>
  onLeaveRoom: () => void
  roomCode: string | null
  mySeat: 'p1' | 'p2' | null
  seats: { p1: RoomSeat | null; p2: RoomSeat | null } | null
  initialJoinCode?: string | null
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  onStartHotseat,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onStartOnlineGame,
  onLeaveRoom,
  roomCode,
  mySeat,
  seats,
  initialJoinCode = '',
}) => {
  const [activeTab, setActiveTab] = useState<'online' | 'hotseat'>('online')
  const [onlineAction, setOnlineAction] = useState<'create' | 'join'>(
    initialJoinCode ? 'join' : 'create'
  )

  // Player configurations
  const [playerName, setPlayerName] = useState(mySeat === 'p2' ? 'Hrdina 2' : 'Hrdina 1')
  const [selectedHeroId, setSelectedHeroId] = useState('warrior')
  const [inputCode, setInputCode] = useState(initialJoinCode || '')

  // Hotseat configurations
  const [hotseatP1Hero, setHotseatP1Hero] = useState('warrior')
  const [hotseatP2Hero, setHotseatP2Hero] = useState('mage')

  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  const handleCreate = async () => {
    setIsLoading(true)
    setErrorMsg(null)
    const code = await onCreateOnlineRoom(playerName, selectedHeroId)
    setIsLoading(false)
    if (!code) {
      setErrorMsg('Nepodařilo se vytvořit místnost. Zkontroluj internetové připojení.')
    }
  }

  const handleJoin = async () => {
    if (!inputCode || inputCode.length !== 6) {
      setErrorMsg('Kód místnosti musí mít přesně 6 číslic.')
      return
    }
    setIsLoading(true)
    setErrorMsg(null)
    const ok = await onJoinOnlineRoom(inputCode, playerName, selectedHeroId)
    setIsLoading(false)
    if (!ok) {
      setErrorMsg('Místnost neexistuje, vypršela nebo je již plná.')
    }
  }

  const copyShareLink = () => {
    if (!roomCode) return
    const url = `${window.location.origin}/proroctvi/?room=${roomCode}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const bothPlayersConnected = Boolean(seats?.p1 && seats?.p2)

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-4 selection:bg-amber-500 selection:text-stone-950 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-950/30 via-stone-950 to-stone-950 pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-6">
        {/* Title & Brand */}
        <div className="text-center">
          <div className="text-5xl mb-2 filter drop-shadow-lg">🔮</div>
          <h1 className="text-4xl sm:text-5xl font-black text-amber-400 font-serif tracking-widest uppercase m-0 drop-shadow-md">
            Proroctví
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm tracking-wider uppercase mt-1 font-semibold">
            Digitální adaptace deskové hry • Vladimír Chvátil
          </p>
        </div>

        {/* If Player is in an Online Waiting Room */}
        {roomCode ? (
          <div className="w-full bg-stone-900/90 border-2 border-amber-600/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md flex flex-col gap-6">
            <div className="text-center border-b border-stone-800 pb-4">
              <span className="text-xs uppercase font-extrabold text-amber-500 tracking-widest">
                🌐 Online Místnost
              </span>
              <div className="text-5xl font-mono font-black text-amber-400 my-2 tracking-widest">
                {roomCode}
              </div>
              <p className="text-xs text-stone-300">
                Sdílej tento kód se svým spoluhráčem pro připojení do hry.
              </p>

              <button
                onClick={copyShareLink}
                className="mt-3 px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold text-xs uppercase rounded-xl border border-stone-700 shadow-md flex items-center justify-center gap-2 mx-auto cursor-pointer transition-all"
              >
                <span>🔗</span>
                <span>{copiedLink ? '✓ Odkaz zkopírován do schránky!' : 'Kopírovat odkaz ke hře'}</span>
              </button>
            </div>

            {/* The 2 Player Slots */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Slot 1: Host */}
              <div className="p-4 bg-stone-950/80 rounded-2xl border border-stone-800 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-2xl mb-2">
                  {HERO_CLASSES.find((h) => h.id === seats?.p1?.heroClassId)?.avatar || '⚔️'}
                </div>
                <div className="text-xs font-bold text-stone-400 uppercase">Hráč 1 (Hostitel)</div>
                <div className="font-bold text-base text-stone-100 mt-0.5">
                  {seats?.p1?.name || 'Hráč 1'} {mySeat === 'p1' && '(Ty)'}
                </div>
                <div className="text-xs text-amber-400 font-semibold">
                  {HERO_CLASSES.find((h) => h.id === seats?.p1?.heroClassId)?.name || 'Válečník'}
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Připraven v lobby</span>
                </div>
              </div>

              {/* Slot 2: Guest */}
              <div
                className={`p-4 bg-stone-950/80 rounded-2xl border flex flex-col items-center text-center ${
                  seats?.p2 ? 'border-stone-800' : 'border-dashed border-stone-700'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center text-2xl mb-2">
                  {seats?.p2
                    ? HERO_CLASSES.find((h) => h.id === seats.p2?.heroClassId)?.avatar || '🔮'
                    : '⏳'}
                </div>
                <div className="text-xs font-bold text-stone-400 uppercase">Hráč 2 (Vyzývatel)</div>

                {seats?.p2 ? (
                  <>
                    <div className="font-bold text-base text-stone-100 mt-0.5">
                      {seats.p2.name} {mySeat === 'p2' && '(Ty)'}
                    </div>
                    <div className="text-xs text-blue-400 font-semibold">
                      {HERO_CLASSES.find((h) => h.id === seats.p2?.heroClassId)?.name}
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Připraven v lobby</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-bold text-sm text-stone-400 mt-1 animate-pulse">
                      Čekám na připojení...
                    </div>
                    <div className="text-[11px] text-stone-500 mt-1">
                      Druhý hráč se připojí zadáním kódu {roomCode}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Launch Actions */}
            <div className="flex flex-col gap-2 pt-2">
              {mySeat === 'p1' ? (
                <button
                  onClick={onStartOnlineGame}
                  disabled={!bothPlayersConnected}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl transition-all cursor-pointer ${
                    bothPlayersConnected
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 scale-102 animate-bounce'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                  }`}
                >
                  {bothPlayersConnected
                    ? '⚔️ Vstoupit do království (Spustit hru!)'
                    : '⏳ Čeká se na připojení Hráče 2...'}
                </button>
              ) : (
                <div className="text-center py-3 bg-stone-950 rounded-xl border border-stone-800 text-xs text-amber-300 font-semibold animate-pulse">
                  Jsi připojen jako Hráč 2. Čeká se na hostitele, až spustí hru...
                </div>
              )}

              <button
                onClick={onLeaveRoom}
                className="w-full py-2.5 text-xs font-bold text-stone-400 hover:text-stone-200 uppercase tracking-wider cursor-pointer"
              >
                Opustit místnost
              </button>
            </div>
          </div>
        ) : (
          /* Main Lobby Card: Mode Selection & Setup */
          <div className="w-full bg-stone-900/90 border-2 border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md flex flex-col gap-6">
            {/* Mode Switch Tabs */}
            <div className="grid grid-cols-2 p-1.5 bg-stone-950 rounded-2xl border border-stone-800">
              <button
                onClick={() => setActiveTab('online')}
                className={`py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'online'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                🌐 Online (2 Hráči)
              </button>
              <button
                onClick={() => setActiveTab('hotseat')}
                className={`py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'hotseat'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                👥 Lokální (Hotseat)
              </button>
            </div>

            {/* TAB: ONLINE MULTIPLAYER */}
            {activeTab === 'online' && (
              <div className="flex flex-col gap-5">
                {/* Create or Join Sub-Tabs */}
                <div className="flex gap-2 border-b border-stone-800 pb-3">
                  <button
                    onClick={() => setOnlineAction('create')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                      onlineAction === 'create'
                        ? 'bg-stone-800 text-amber-400 border border-amber-500/50'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    ✨ Založit novou hru
                  </button>
                  <button
                    onClick={() => setOnlineAction('join')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                      onlineAction === 'join'
                        ? 'bg-stone-800 text-amber-400 border border-amber-500/50'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    🔑 Připojit se ke kódu
                  </button>
                </div>

                {/* Player Profile Inputs */}
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                      Tvé herní jméno
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      maxLength={20}
                      className="w-full mt-1.5 p-3 bg-stone-950 border border-stone-800 rounded-xl text-sm font-bold text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                      Vyber svého hrdinu
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
                      {HERO_CLASSES.map((hero) => {
                        const isSelected = selectedHeroId === hero.id
                        return (
                          <button
                            key={hero.id}
                            type="button"
                            onClick={() => setSelectedHeroId(hero.id)}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-400'
                                : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                            }`}
                          >
                            <span className="text-2xl">{hero.avatar}</span>
                            <div>
                              <div className="font-bold text-xs text-stone-200">{hero.name}</div>
                              <div className="text-[10px] text-stone-400 line-clamp-1">
                                {hero.title}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {onlineAction === 'join' && (
                    <div className="mt-2">
                      <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                        6místný kód místnosti od protihráče
                      </label>
                      <input
                        type="text"
                        value={inputCode}
                        onChange={(e) =>
                          setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        placeholder="123456"
                        maxLength={6}
                        className="w-full mt-1.5 p-3 bg-stone-950 border border-stone-800 rounded-xl text-2xl font-mono font-black text-center text-amber-400 tracking-widest focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}

                  {errorMsg && (
                    <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300 font-medium">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  <button
                    onClick={onlineAction === 'create' ? handleCreate : handleJoin}
                    disabled={isLoading}
                    className="mt-3 w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isLoading
                      ? 'Zpracovávám...'
                      : onlineAction === 'create'
                      ? '✨ Vytvořit místnost a pozvat hráče'
                      : '🔑 Připojit se ke hře'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB: HOTSEAT LOCAL */}
            {activeTab === 'hotseat' && (
              <div className="flex flex-col gap-5">
                <p className="text-xs text-stone-400 leading-relaxed">
                  Tradiční hra dvou hráčů na jednom zařízení (Pass-and-Play). Hráči se střídají v
                  tazích u jedné obrazovky.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Player 1 Selection */}
                  <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800">
                    <div className="text-xs font-bold text-amber-400 uppercase mb-2">
                      Hráč 1: Hrdina
                    </div>
                    <select
                      value={hotseatP1Hero}
                      onChange={(e) => setHotseatP1Hero(e.target.value)}
                      className="w-full p-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs font-bold text-stone-100"
                    >
                      {HERO_CLASSES.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.avatar} {h.name} ({h.title})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Player 2 Selection */}
                  <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800">
                    <div className="text-xs font-bold text-blue-400 uppercase mb-2">
                      Hráč 2: Hrdina
                    </div>
                    <select
                      value={hotseatP2Hero}
                      onChange={(e) => setHotseatP2Hero(e.target.value)}
                      className="w-full p-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs font-bold text-stone-100"
                    >
                      {HERO_CLASSES.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.avatar} {h.name} ({h.title})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => onStartHotseat(hotseatP1Hero, hotseatP2Hero)}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer transition-all"
                >
                  ⚔️ Spustit lokální hru
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
