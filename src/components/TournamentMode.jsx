import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Trophy, Swords, ArrowRight, CheckCircle2, Sparkles, X } from '../lib/icons';
import confetti from 'canvas-confetti';
import { useSound } from '../hooks/useSound';
import styles from './TournamentMode.module.css';

// Build bracket tree structure for visual bracket display
function buildBracketTree(allMatches) {
  // Group matches by round
  const rounds = {};
  allMatches.forEach(match => {
    const round = match.round || 1;
    if (!rounds[round]) rounds[round] = [];
    rounds[round].push(match);
  });
  
  // Sort rounds and matches within rounds
  const sortedRounds = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b)
    .map(roundNum => ({
      round: roundNum,
      label: roundNum === 1 ? 'ROUND 1' : roundNum === 2 ? 'SEMIS' : roundNum === 3 ? 'FINALS' : `ROUND ${roundNum}`,
      matches: rounds[roundNum].sort((a, b) => (a.matchNum || 0) - (b.matchNum || 0))
    }));
  
  return sortedRounds;
}

// BracketTree component for visual bracket display
function BracketTree({ matches, currentMatch }) {
  const rounds = useMemo(() => buildBracketTree(matches), [matches]);
  
  // Find the globally active match across all rounds
  let activeMatchId = null;
  if (currentMatch) {
    activeMatchId = currentMatch.id;
  }
  
  return (
    <div className={styles.bracketTree} role="region" aria-label="Tournament bracket visualization">
      <h4 className="mono text-xs text-lime uppercase tracking-wider mb-8">
        BRACKET VIEW
      </h4>
      <div className={styles.bracketTree__rounds}>
        {rounds.map((round, roundIdx) => (
          <div key={round.round} className={styles.bracketTree__round}>
            <span className={styles.bracketTree__roundLabel}>{round.label}</span>
            {round.matches.map((match) => {
              const isActive = match.id === activeMatchId;
              const hasWinner = match.winner !== null;
              const isWinnerMatch = hasWinner && match.winner;
              
              return (
                <div
                  key={match.id}
                  className={`${styles.bracketTree__match} ${isActive ? styles['bracketTree__match--active'] : ''} ${hasWinner ? styles['bracketTree__match--winner'] : ''}`}
                >
                  {/* Player 1 */}
                  <div className={`${styles.bracketTree__player} ${styles['bracketTree__player--p1']} ${isWinnerMatch && match.winner.id === match.player1.id ? styles['bracketTree__player--winner'] : ''}`}>
                    <span className={styles.bracketTree__playerLabel}>PLAYER 1</span>
                    <span className={styles.bracketTree__playerName}>{match.player1.label}</span>
                    {isWinnerMatch && match.winner.id === match.player1.id && (
                      <span className={styles.bracketTree__winnerBadge}>WINNER</span>
                    )}
                  </div>
                  
                  {/* Player 2 */}
                  <div className={`${styles.bracketTree__player} ${styles['bracketTree__player--p2']} ${isWinnerMatch && match.winner.id === match.player2.id ? styles['bracketTree__player--winner'] : ''}`}>
                    <span className={styles.bracketTree__playerLabel}>PLAYER 2</span>
                    <span className={styles.bracketTree__playerName}>{match.player2.label}</span>
                    {isWinnerMatch && match.winner.id === match.player2.id && (
                      <span className={styles.bracketTree__winnerBadge}>WINNER</span>
                    )}
                  </div>
                  
                  {/* Connector to next round */}
                  {roundIdx < rounds.length - 1 && (
                    <div className={`${styles.bracketTree__connector} ${hasWinner ? styles['bracketTree__connector--winner'] : ''}`} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TournamentMode({ options, onExitTournament }) {
  const { playVictory } = useSound();
  const [matches, setMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [champion, setChampion] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [matchWinner, setMatchWinner] = useState(null);
  const [seedingMode, setSeedingMode] = useState('random'); // 'random', 'weight', 'manual'
  const animRef = useRef(null);
  const tournamentStartedRef = useRef(false);

  // Seed options based on seeding mode
  const getSeededOptions = useCallback((opts, mode) => {
    let seeded = [...opts];
    if (mode === 'weight') {
      // Higher weight = better seed (lower index)
      seeded.sort((a, b) => (b.weight || 1) - (a.weight || 1));
    } else if (mode === 'random') {
      // Cryptographically secure shuffle
      const randArr = new Uint32Array(seeded.length);
      crypto.getRandomValues(randArr);
      for (let i = seeded.length - 1; i > 0; i--) {
        const j = randArr[i] % (i + 1);
        [seeded[i], seeded[j]] = [seeded[j], seeded[i]];
      }
    }
    // 'manual' keeps user's order
    return seeded;
  }, []);

  useEffect(() => {
    if (!options || options.length < 2) return;
    if (tournamentStartedRef.current) return;

    let seedOptions = getSeededOptions(options, seedingMode);
    if (seedOptions.length % 2 !== 0) {
      seedOptions.push({
        id: `opt-bye-${Date.now()}`,
        label: 'Wildcard Choice',
        desc: 'Bonus wildcard entry to balance bracket',
        color: '#a3ff12',
        weight: 1,
      });
    }

    const round1 = [];
    for (let i = 0; i < seedOptions.length; i += 2) {
      round1.push({
        id: `match-1-${i / 2}`,
        round: 1,
        matchNum: (i / 2) + 1,
        player1: seedOptions[i],
        player2: seedOptions[i + 1],
        winner: null,
      });
    }

    setMatches(round1);
    setCurrentMatchIndex(0);
    setChampion(null);
    setMatchWinner(null);
    tournamentStartedRef.current = true;
  }, [options, seedingMode, getSeededOptions]);

  const currentMatch = matches[currentMatchIndex];

  const handleSpinMatch = () => {
    if (!currentMatch || isSpinning || matchWinner) return;

    setIsSpinning(true);
    setMatchWinner(null);

    const randArr = new Uint32Array(1);
    crypto.getRandomValues(randArr);
    const winnerIdx = randArr[0] % 2;
    const winningPlayer = winnerIdx === 0 ? currentMatch.player1 : currentMatch.player2;

    const targetMid = winnerIdx === 0 ? 90 : 270;
    const deltaTarget = (360 - (targetMid % 360)) % 360;
    const fullTurns = 5;
    const startRot = rotation % 360;
    const finalRot = rotation + 360 * fullTurns + ((deltaTarget - startRot + 360) % 360);

    const startTime = performance.now();
    const duration = 3800;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3.5);
      const currentRot = rotation + (finalRot - rotation) * easeOut;

      setRotation(currentRot);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setMatchWinner(winningPlayer);
        playVictory();
      }
    };

    animRef.current = requestAnimationFrame(animate);
  };

  const handleAdvanceWinner = () => {
    if (!matchWinner || !currentMatch) return;

    const updatedMatches = matches.map((m, idx) => (
      idx === currentMatchIndex ? { ...m, winner: matchWinner } : m
    ));

    setMatches(updatedMatches);
    setMatchWinner(null);

    const allCurrentFinished = updatedMatches.every(m => m.winner !== null);

    if (!allCurrentFinished) {
      setCurrentMatchIndex(prev => prev + 1);
      return;
    }

    const roundWinners = updatedMatches.map(m => m.winner);
    if (roundWinners.length === 1) {
      setChampion(roundWinners[0]);
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReduced) {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      }
      return;
    }

    const nextRoundMatches = [];
    for (let i = 0; i < roundWinners.length; i += 2) {
      nextRoundMatches.push({
        id: `match-next-${i / 2}`,
        round: (updatedMatches[0].round || 1) + 1,
        matchNum: (i / 2) + 1,
        player1: roundWinners[i],
        player2: roundWinners[i + 1] || roundWinners[i],
        winner: null,
      });
    }

    setMatches(nextRoundMatches);
    setCurrentMatchIndex(0);
  };

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  if (!options || options.length < 2) {
    return (
      <div className="glass-panel p-32 text-center">
        <p>Tournament Mode requires at least 2 options!</p>
        <button className="btn btn-primary mt-14" onClick={onExitTournament}>
          Return to Studio
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.wrapper} mx-auto`}>
      <div className="flex justify-between items-center mb-24">
        <div>
          <span className="mono text-xs text-lime uppercase tracking-wider font-bold">
            TOURNAMENT
          </span>
          <h2 className="text-2xl font-black mt-4">Tournament</h2>
        </div>

        <div className="flex items-center gap-8">
          {/* Seeding Mode Selector */}
          <div className="flex items-center gap-6">
            <label className="mono text-xs text-muted" htmlFor="seeding-mode">Seed:</label>
            <select
              id="seeding-mode"
              value={seedingMode}
              onChange={(e) => setSeedingMode(e.target.value)}
              disabled={matches.length > 0}
              className="bg-surface border-medium rounded-sm text-primary px-8 py-4 text-sm"
              aria-label="Tournament seeding mode"
            >
              <option value="random">Random</option>
              <option value="weight">Weight-Based</option>
              <option value="manual">Manual</option>
            </select>
            {matches.length > 0 && (
              <span className="mono text-xs text-muted">(Start new tournament to change)</span>
            )}
          </div>

          <button className="btn btn-secondary btn-sm" onClick={onExitTournament}>
            <X size={16} aria-hidden="true" />
            Exit Tournament
          </button>
        </div>
      </div>

      {champion ? (
        <div className={`glass-panel-glow p-40 text-center ${styles.championBanner}`}>
          <div className={`grid-center bg-lime-strong text-inverse mx-auto mb-16 ${styles.winnerCircle}`}>
            <Trophy size={32} aria-hidden="true" />
          </div>

          <span className="mono text-sm text-lime tracking-wider font-extrabold">
            TOURNAMENT GRAND CHAMPION
          </span>

          <h2 className={`text-primary mt-8 ${styles.championTitle}`}>{champion.label}</h2>
          <p className={`text-secondary text-md mx-auto mt-12 mb-24 ${styles.championDescription}`}>
            {champion.desc || `Victorious through all tournament head-to-head eliminations!`}
          </p>

          <button className="btn btn-primary btn-lg" onClick={onExitTournament}>
            <Sparkles size={18} aria-hidden="true" />
            Load Champion into Studio
          </button>
        </div>
      ) : (
        <div className={styles.matchGrid}>
          {currentMatch && (
            <div className="glass-panel p-28">
              <div className="flex justify-between items-center mb-16">
                <span className={`mono text-xs text-lime bg-lime-faint px-10 font-bold rounded-sm ${styles.badge}`}>
                  ROUND {currentMatch.round} — MATCH #{currentMatchIndex + 1} OF {matches.length}
                </span>
                <span className={`mono text-xs uppercase tracking-wider ${styles.statusBadge}`}>
                  {matchWinner ? 'Winner locked in' : 'Ready to spin'}
                </span>
                <Swords size={18} color="var(--accent-lime)" aria-hidden="true" />
              </div>

              <div className={styles.matchupBanner}>
                <div className={`${styles.matchCase} ${matchWinner?.id === currentMatch.player1.id ? styles.matchCaseActive : styles.matchCaseInactive}`}>
                  <span className="mono text-xs text-muted">CORNER A</span>
                  <h4 className="text-md font-extrabold mt-4">{currentMatch.player1.label}</h4>
                </div>
                <span className="mono text-base font-black text-lime">VS</span>
                <div className={`${styles.matchCase} ${matchWinner?.id === currentMatch.player2.id ? styles.matchCaseActive : styles.matchCaseInactive}`}>
                  <span className="mono text-xs text-muted">CORNER B</span>
                  <h4 className="text-md font-extrabold mt-4">{currentMatch.player2.label}</h4>
                </div>
              </div>

              <div className={styles.wheelFrame}>
                <div
                  role="img"
                  aria-label={`1v1 match wheel: ${currentMatch.player1.label} vs ${currentMatch.player2.label}`}
                  className={styles.wheelInner}
                  style={{ '--wheel-rotation': `${rotation}deg` }}
                >
                  <svg viewBox="-100 -100 200 200" className={`w-full h-full ${styles.wheelSvg}`}>
                    <path
                      d="M 0 0 L 100 0 A 100 100 0 0 1 -100 0 Z"
                      fill={currentMatch.player1.color || '#d8ff5b'}
                      stroke="#07070d"
                      strokeWidth="2"
                    />
                    <path
                      d="M 0 0 L -100 0 A 100 100 0 0 1 100 0 Z"
                      fill={currentMatch.player2.color || '#a3ff12'}
                      stroke="#07070d"
                      strokeWidth="2"
                    />
                    <circle r="12" fill="#07070d" stroke="var(--border-medium)" strokeWidth="2" />
                    <circle r="5" fill="var(--accent-lime)" />
                  </svg>
                </div>

                <div aria-hidden="true" className={styles.pointer} />
              </div>

              <div className="text-center">
                {!matchWinner ? (
                  <button
                    className="btn btn-primary btn-lg w-full"
                    onClick={handleSpinMatch}
                    aria-disabled={isSpinning}
                    aria-label={isSpinning ? 'Spinning match wheel — please wait' : `Spin 1v1 match ${currentMatchIndex + 1}`}
                    disabled={isSpinning}
                  >
                    {isSpinning ? 'SPINNING MATCH...' : `Spin 1v1 Match #${currentMatchIndex + 1}`}
                  </button>
                ) : (
                  <button className={`btn btn-primary btn-lg w-full ${styles.advanceWinnerButton}`} onClick={handleAdvanceWinner}>
                    <span>Advance Winner: {matchWinner.label}</span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Visual Bracket Tree */}
          <BracketTree 
            matches={matches} 
            currentMatchIndex={currentMatchIndex} 
            currentMatch={currentMatch} 
          />

          <div className="glass-panel p-24">
            <h3 className="mono text-sm text-muted uppercase tracking-wider mb-16">
              TOURNAMENT BRACKET LOG
            </h3>
            <p className={`text-xs text-muted mb-12 ${styles.logHint}`}>
              Completed matches are marked with winners, and the active match is highlighted for easy follow-through.
            </p>

            <div className="flex-col gap-12">
              {matches.map((m, idx) => (
                <div
                  key={m.id}
                  className={`${styles.bracketItem} ${idx === currentMatchIndex ? styles.bracketItemActive : ''}`}
                >
                  <div className="flex justify-between text-xs text-muted mb-4">
                    <span>Match #{idx + 1}</span>
                    {m.winner && (
                      <span className="text-lime flex items-center gap-4">
                        <CheckCircle2 size={12} /> Winner: {m.winner.label}
                      </span>
                    )}
                  </div>
                  <div className="font-bold">
                    {m.player1.label} <span className="text-muted">vs</span> {m.player2.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TournamentMode;
