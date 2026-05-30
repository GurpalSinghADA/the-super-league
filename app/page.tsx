"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

// Personal Passwords Dictionary
const PASSWORDS: Record<string, string> = {
  "Rajat": "Apple",
  "Kola": "Tree",
  "Gurpal": "Chels",
  "Sukhi": "Trueee"
};

const TABS = [
  { id: 'league', icon: '⚽', label: 'League' },
  { id: 'h2h', icon: '⚔️', label: 'H2H' },
  { id: 'profiles', icon: '🛡️', label: 'Profiles' },
  { id: 'hof', icon: '🏛️', label: 'HOF' },
  { id: 'transfers', icon: '🤝', label: 'Transfers' },
  { id: 'ebay', icon: '🛒', label: 'eBay' },
  { id: 'awards', icon: '🏆', label: 'Awards' }
] as const;

type TabType = typeof TABS[number]['id'];

export default function Home() {
  // Authentication States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginManagerId, setLoginManagerId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Data States
  const [managers, setManagers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [nominations, setNominations] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [lineups, setLineups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // App States
  const [activeTab, setActiveTab] = useState<TabType>('league');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('all');
  const [myManagerId, setMyManagerId] = useState(''); 
  const [password, setPassword] = useState(''); 
  
  // Transfer Filter States
  const [transferManagerFilter, setTransferManagerFilter] = useState<string>('all');
  const [transferTypeFilter, setTransferTypeFilter] = useState<string>('all');

  // H2H States
  const [h2hManagerA, setH2hManagerA] = useState('');
  const [h2hManagerB, setH2hManagerB] = useState('');

  // Lineup Builder States
  const [isLineupModalOpen, setIsLineupModalOpen] = useState(false);
  const [activeLineupPosition, setActiveLineupPosition] = useState('');
  const [customPlayerName, setCustomPlayerName] = useState('');

  // Time States
  const [ukTime, setUkTime] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Form States
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [acquiringManagerId, setAcquiringManagerId] = useState('');
  const [transferFee, setTransferFee] = useState<number | ''>('');
  const [auctionPlayerName, setAuctionPlayerName] = useState('');
  const [auctionStartBid, setAuctionStartBid] = useState<number | ''>('');
  const [bidInputs, setBidInputs] = useState<Record<string, number>>({});
  const [nominationName, setNominationName] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setUkTime(new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/London' }));
      setCurrentTime(Date.now());
    }, 1000);

    async function fetchData() {
      const { data: managerData } = await supabase.from('managers').select('*');
      const { data: matchData } = await supabase.from('matches').select('*, home:home_manager_id(name), away:away_manager_id(name)');
      const { data: seasonData } = await supabase.from('seasons').select('*').order('name', { ascending: true });
      const { data: transferData } = await supabase.from('transfers').select('*, manager:manager_id(name)');
      const { data: lineupData } = await supabase.from('lineups').select('*');
      
      if (managerData) setManagers(managerData);
      if (matchData) setMatches(matchData);
      if (transferData) setTransfers(transferData);
      if (lineupData) setLineups(lineupData);
      if (seasonData && seasonData.length > 0) {
        setSeasons(seasonData);
      }
      fetchAuctions();
      fetchAwards();
      setLoading(false);
    }
    
    async function fetchAuctions() {
      const { data } = await supabase.from('auctions').select('*, highest_bidder:highest_bidder_id(name)').neq('status', 'archived').order('created_at', { ascending: false });
      if (data) setAuctions(data);
    }

    async function fetchAwards() {
      const { data: nomData } = await supabase.from('award_nominations').select('*, manager:manager_id(name)');
      const { data: voteData } = await supabase.from('award_votes').select('*');
      if (nomData) setNominations(nomData);
      if (voteData) setVotes(voteData);
    }

    async function fetchLineups() {
      const { data } = await supabase.from('lineups').select('*');
      if (data) setLineups(data);
    }

    fetchData();

    const channel = supabase.channel('realtime-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, fetchAuctions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'award_nominations' }, fetchAwards)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'award_votes' }, fetchAwards)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lineups' }, fetchLineups)
      .subscribe();

    return () => { 
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  // --- LOGIN FUNCTION ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedManager = managers.find(m => m.id === loginManagerId);
    
    if (!selectedManager) return alert("Please select your name!");
    
    if (PASSWORDS[selectedManager.name] === loginPassword) {
      setMyManagerId(loginManagerId);
      setIsAuthenticated(true);      
    } else {
      alert("Incorrect password!");
    }
  };

  const isAdmin = managers.find(m => m.id === myManagerId)?.name === 'Gurpal';

  // Filter Data Base (By Season)
  const isTotal = selectedSeasonId === 'all';
  const currentSeasonMatches = isTotal ? matches : matches.filter(match => match.season_id === selectedSeasonId);
  const currentSeasonTransfers = isTotal ? transfers : transfers.filter(transfer => transfer.season_id === selectedSeasonId);
  const currentSeasonAuctions = isTotal ? auctions : auctions.filter(auction => auction.season_id === selectedSeasonId);
  const currentSeasonNominations = isTotal ? nominations : nominations.filter(nom => nom.season_id === selectedSeasonId);

  const displayedTransfers = currentSeasonTransfers.filter(t => {
    const matchManager = transferManagerFilter === 'all' || t.manager_id === transferManagerFilter;
    const matchType = 
      transferTypeFilter === 'all' || 
      (transferTypeFilter === 'in' && t.transfer_fee < 0) || 
      (transferTypeFilter === 'out' && t.transfer_fee > 0);
    return matchManager && matchType;
  });

  // Calculate League Table
  const calculateTable = () => {
    let table: Record<string, any> = {};
    managers.forEach(m => { table[m.id] = { id: m.id, name: m.name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: [] as string[] }; });

    currentSeasonMatches.forEach(match => {
      if (!table[match.home_manager_id] || !table[match.away_manager_id]) return;
      const home = table[match.home_manager_id]; const away = table[match.away_manager_id];

      home.p += 1; away.p += 1;
      home.gf += match.home_goals; away.gf += match.away_goals;
      home.ga += match.away_goals; away.ga += match.home_goals;

      if (match.home_goals > match.away_goals) { 
        home.w += 1; home.pts += 3; home.form.push('W');
        away.l += 1; away.form.push('L');
      } 
      else if (match.home_goals < match.away_goals) { 
        away.w += 1; away.pts += 3; away.form.push('W');
        home.l += 1; home.form.push('L');
      } 
      else { 
        home.d += 1; home.pts += 1; home.form.push('D');
        away.d += 1; away.pts += 1; away.form.push('D');
      }
      
      home.gd = home.gf - home.ga; away.gd = away.gf - away.ga;
    });

    Object.values(table).forEach(row => { row.form = row.form.slice(-5); });
    return Object.values(table).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  };

  const leagueTable = calculateTable();
  const managerBalances = managers.map(m => {
    const net = currentSeasonTransfers.filter(t => t.manager_id === m.id).reduce((sum, t) => sum + Number(t.transfer_fee), 0);
    return { ...m, net };
  });

  // Profiles
  const managerProfiles = managers.map(m => {
    const mMatches = currentSeasonMatches.filter(match => match.home_manager_id === m.id || match.away_manager_id === m.id);
    let w=0, d=0, l=0;
    let maxGd = -999; let minGd = 999;
    let biggestWin = null; let worstDefeat = null;
    let cleanSheets = 0; let scoredFive = false;

    mMatches.forEach(match => {
      const isHome = match.home_manager_id === m.id;
      const oppName = isHome ? match.away?.name : match.home?.name;
      const mGoals = isHome ? match.home_goals : match.away_goals;
      const oppGoals = isHome ? match.away_goals : match.home_goals;
      const gd = mGoals - oppGoals;

      if(gd > 0) w++; else if(gd < 0) l++; else d++;

      if(gd > maxGd && gd > 0) { maxGd = gd; biggestWin = `${mGoals}-${oppGoals} vs ${oppName || 'Unknown'}`; }
      if(gd < minGd && gd < 0) { minGd = gd; worstDefeat = `${mGoals}-${oppGoals} vs ${oppName || 'Unknown'}`; }
      if(oppGoals === 0) cleanSheets++;
      if(mGoals >= 5) scoredFive = true;
    });

    const winPct = mMatches.length > 0 ? Math.round((w / mMatches.length) * 100) : 0;
    const mTransfers = currentSeasonTransfers.filter(t => t.manager_id === m.id);
    const mNetSpend = mTransfers.reduce((sum, t) => sum + Number(t.transfer_fee), 0);
    
    let biggestTransfer = null;
    if (mTransfers.length > 0) {
      biggestTransfer = mTransfers.reduce((prev, current) => Math.abs(Number(current.transfer_fee)) > Math.abs(Number(prev.transfer_fee)) ? current : prev );
    }

    const achievements: {icon: string, title: string, desc: string}[] = [];
    if (cleanSheets >= 3) achievements.push({ icon: '🛑', title: 'Park the Bus', desc: '3+ Clean Sheets' });
    if (mNetSpend <= -150) achievements.push({ icon: '💸', title: 'Financial Ruin', desc: 'Net Spend ≤ -£150M' });
    if (scoredFive) achievements.push({ icon: '🏏', title: 'Cricket Score', desc: 'Scored 5+ goals in a game' });
    if (biggestTransfer && Math.abs(biggestTransfer.transfer_fee) >= 80) achievements.push({ icon: '🤑', title: 'Galáctico', desc: '£80M+ on a single player' });
    if (w >= 5) achievements.push({ icon: '🔥', title: 'Unstoppable', desc: 'Won 5+ Matches' });

    return { ...m, p: mMatches.length, w, d, l, winPct, biggestWin: maxGd > 0 ? biggestWin : 'N/A', worstDefeat: minGd < 0 ? worstDefeat : 'N/A', biggestTransfer, achievements };
  });

  // H2H
  let h2hStats = { p: 0, aWins: 0, bWins: 0, d: 0, aGoals: 0, bGoals: 0, matches: [] as any[] };
  if (h2hManagerA && h2hManagerB && h2hManagerA !== h2hManagerB) {
    const h2hMatches = currentSeasonMatches.filter(m => (m.home_manager_id === h2hManagerA && m.away_manager_id === h2hManagerB) || (m.home_manager_id === h2hManagerB && m.away_manager_id === h2hManagerA));
    h2hStats.p = h2hMatches.length;
    h2hStats.matches = h2hMatches.slice().reverse();
    h2hMatches.forEach(m => {
      const aIsHome = m.home_manager_id === h2hManagerA;
      const aG = aIsHome ? m.home_goals : m.away_goals;
      const bG = aIsHome ? m.away_goals : m.home_goals;
      h2hStats.aGoals += aG; h2hStats.bGoals += bG;
      if(aG > bG) h2hStats.aWins++; else if(bG > aG) h2hStats.bWins++; else h2hStats.d++;
    });
  }

  const tickerEvents: string[] = [];
  matches.slice(-5).forEach(m => tickerEvents.push(`⚽ RESULT: ${m.home?.name} ${m.home_goals}-${m.away_goals} ${m.away?.name}`));
  transfers.slice(-5).forEach(t => tickerEvents.push(`🤝 TRANSFER: ${t.player_name} ${t.transfer_fee < 0 ? 'signed by' : 'sold by'} ${t.manager?.name} for £${Math.abs(t.transfer_fee)}M`));
  const shuffledTicker = tickerEvents.sort(() => 0.5 - Math.random()).join("   |   ");

  const calculateHallOfFame = () => {
    let mostExpensiveTransfer: any = null; let maxFee = -1;
    let biggestDemolition: any = null; let maxMargin = -1;
    let highestScoringGame: any = null; let maxGoals = -1;
    let maxPointsRecord: any = null; let maxPts = -1;

    transfers.forEach(t => {
      const fee = Math.abs(Number(t.transfer_fee));
      if (fee > maxFee) { maxFee = fee; mostExpensiveTransfer = { ...t, absFee: fee, seasonName: seasons.find(s => s.id === t.season_id)?.name }; }
    });

    matches.forEach(m => {
      const margin = Math.abs(m.home_goals - m.away_goals);
      if (margin > maxMargin) { maxMargin = margin; biggestDemolition = { ...m, margin, seasonName: seasons.find(s => s.id === m.season_id)?.name }; }
      const totalGoals = m.home_goals + m.away_goals;
      if (totalGoals > maxGoals) { maxGoals = totalGoals; highestScoringGame = { ...m, totalGoals, seasonName: seasons.find(s => s.id === m.season_id)?.name }; }
    });

    const seasonManagerPoints: Record<string, number> = {};
    matches.forEach(match => {
      const sId = match.season_id; const keyHome = `${sId}_${match.home_manager_id}`; const keyAway = `${sId}_${match.away_manager_id}`;
      if (!seasonManagerPoints[keyHome]) seasonManagerPoints[keyHome] = 0;
      if (!seasonManagerPoints[keyAway]) seasonManagerPoints[keyAway] = 0;
      if (match.home_goals > match.away_goals) seasonManagerPoints[keyHome] += 3; else if (match.home_goals < match.away_goals) seasonManagerPoints[keyAway] += 3; else { seasonManagerPoints[keyHome] += 1; seasonManagerPoints[keyAway] += 1; }
    });
    Object.entries(seasonManagerPoints).forEach(([key, pts]) => {
      if (pts > maxPts) { maxPts = pts; const [sId, mId] = key.split('_'); maxPointsRecord = { managerName: managers.find(x => x.id === mId)?.name, seasonName: seasons.find(x => x.id === sId)?.name, points: pts }; }
    });
    return { mostExpensiveTransfer, biggestDemolition, highestScoringGame, maxPointsRecord };
  };
  const hof = calculateHallOfFame();

  // --- ACTIONS ---
  const submitMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTotal) return alert("Select a specific season to log a match!");
    if (!isAdmin && password !== "1") return alert("Incorrect admin password!");
    if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) return alert("Select valid teams!");
    const { error } = await supabase.from('matches').insert([{ season_id: selectedSeasonId, home_manager_id: homeTeamId, away_manager_id: awayTeamId, home_goals: homeGoals, away_goals: awayGoals }]);
    if (!error) {
      setHomeGoals(0); setAwayGoals(0); setHomeTeamId(''); setAwayTeamId(''); setPassword(''); 
    }
  };

  const submitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTotal) return alert("Select a specific season to log a transfer!");
    if (!isAdmin && password !== "1") return alert("Incorrect admin password!");
    if (!playerName || !acquiringManagerId || transferFee === '') return alert("Fill all details!");
    const { error } = await supabase.from('transfers').insert([{ season_id: selectedSeasonId, manager_id: acquiringManagerId, player_name: playerName, transfer_fee: transferFee }]);
    if (!error) {
      setPlayerName(''); setAcquiringManagerId(''); setTransferFee(''); setPassword('');
    }
  };

  const deleteTransfer = async (transferId: string) => {
    if (!isAdmin) return;
    if (window.confirm("Commissioner Action: Remove this transfer?")) {
      await supabase.from('transfers').delete().eq('id', transferId);
    }
  };

  const listAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTotal) return alert("Select a specific season to list a player!");
    if (!isAdmin && password !== "1") return alert("Incorrect Admin password!");
    if (!auctionPlayerName) return alert("Enter a player name!");
    await supabase.from('auctions').insert([{ season_id: selectedSeasonId, player_name: auctionPlayerName, current_bid: auctionStartBid || 0, status: 'pending' }]);
    setAuctionPlayerName(''); setAuctionStartBid(''); setPassword('');
  };

  const startAuctionTimer = async (auctionId: string) => {
    if (!isAdmin && password !== "1" && window.prompt("Admin Password:") !== "1") return alert("Incorrect password.");
    await supabase.from('auctions').update({ status: 'active', end_time: new Date(Date.now() + 30000).toISOString() }).eq('id', auctionId);
  };

  const placeBid = async (auctionId: string, currentBid: number, currentEndTime: string) => {
    const bidValue = bidInputs[auctionId];
    if (!bidValue || bidValue <= currentBid) return alert("Bid must be higher than the current bid!");
    await supabase.from('auctions').update({ current_bid: bidValue, highest_bidder_id: myManagerId, end_time: new Date(new Date(currentEndTime).getTime() + 10000).toISOString() }).eq('id', auctionId);
    setBidInputs({ ...bidInputs, [auctionId]: '' as any });
  };

  const archiveAuction = async (auctionId: string) => {
    if (!isAdmin && password !== "1" && window.prompt("Admin Password:") !== "1") return alert("Incorrect password.");
    await supabase.from('auctions').update({ status: 'archived' }).eq('id', auctionId);
  };

  const submitNomination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTotal) return alert("Select a specific season!");
    if (!nominationName) return;
    if (currentSeasonNominations.filter(n => n.manager_id === myManagerId).length >= 2) return alert("Max 2 nominations per season!");
    await supabase.from('award_nominations').insert([{ season_id: selectedSeasonId, manager_id: myManagerId, player_name: nominationName }]);
    setNominationName('');
  };

  const castVote = async (nomination: any) => {
    if (nomination.manager_id === myManagerId) return alert("You cannot vote for a player you nominated!");
    if (votes.find(v => v.voter_id === myManagerId && v.season_id === nomination.season_id)) return alert("You already voted this season!");
    await supabase.from('award_votes').insert([{ nomination_id: nomination.id, voter_id: myManagerId, season_id: nomination.season_id }]);
  };

  const deleteNomination = async (nominationId: string) => {
    if (!isAdmin) return;
    if (window.confirm("Remove nomination?")) await supabase.from('award_nominations').delete().eq('id', nominationId);
  };

  // --- SQUAD BUILDER FUNCTIONS ---
  const handlePositionClick = (managerId: string, pos: string) => {
    if (managerId !== myManagerId) return; 
    setActiveLineupPosition(pos);
    setIsLineupModalOpen(true);
  };

  const saveSquadPlayer = async (nameToSave: string) => {
    if (!nameToSave) return;
    await supabase.from('lineups').delete().match({ manager_id: myManagerId, position: activeLineupPosition });
    await supabase.from('lineups').insert([{ manager_id: myManagerId, position: activeLineupPosition, player_name: nameToSave }]);
    setIsLineupModalOpen(false);
    setCustomPlayerName('');
  };

  const clearSquadPlayer = async () => {
    await supabase.from('lineups').delete().match({ manager_id: myManagerId, position: activeLineupPosition });
    setIsLineupModalOpen(false);
  };

  const mySignedPlayers = Array.from(new Set(
    transfers.filter(t => t.manager_id === myManagerId && t.transfer_fee < 0).map(t => t.player_name)
  ));

  // FUT-Style Card Component
  const renderPitchPlayer = (manager: any, pos: string) => {
    const isMine = manager.id === myManagerId;
    const lineupEntry = lineups.find(l => l.manager_id === manager.id && l.position === pos);
    const hasPlayer = !!lineupEntry;
    
    const cardBg = hasPlayer 
      ? "bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 border border-yellow-200" 
      : "bg-slate-900/60 border border-slate-500 border-dashed backdrop-blur-sm";

    return (
      <div 
        onClick={() => handlePositionClick(manager.id, pos)}
        className={`relative flex flex-col items-center justify-start w-[50px] h-[72px] sm:w-[60px] sm:h-[84px] ${cardBg} rounded-t-sm rounded-b-lg shadow-xl ${isMine ? 'cursor-pointer hover:scale-110 hover:z-20 transition-transform group' : ''}`}
      >
        <div className={`absolute top-0.5 left-1 text-[8px] sm:text-[10px] font-black ${hasPlayer ? 'text-yellow-900' : 'text-slate-400'}`}>
          {pos}
        </div>
        
        <div className="mt-3 sm:mt-4 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
          {hasPlayer ? (
            <span className="text-xl sm:text-2xl drop-shadow-md">👤</span>
          ) : (
            <span className="text-slate-500 text-sm font-black">+</span>
          )}
        </div>
        
        {hasPlayer && (
          <div className="absolute bottom-1 w-full text-center px-0.5">
            <span className="text-[8px] sm:text-[9px] font-black text-yellow-900 leading-tight uppercase truncate block drop-shadow-sm">
              {lineupEntry.player_name}
            </span>
          </div>
        )}
        
        {!hasPlayer && isMine && (
          <div className="absolute inset-0 bg-indigo-600/80 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Add</span>
          </div>
        )}
      </div>
    );
  };


  // --- RENDER SCREENS ---

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center p-10 text-center text-indigo-400 font-bold animate-pulse">Loading the pitch...</div>;

  // 1. THE LOGIN SCREEN (DARK MODE)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-cyan-400"></div>
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              The Super League
            </h1>
            <p className="mt-2 text-slate-400 font-medium">Please sign in to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Who are you?</label>
              <select className="w-full p-4 bg-slate-950 border border-slate-800 text-white rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer shadow-inner" value={loginManagerId} onChange={(e) => setLoginManagerId(e.target.value)}>
                <option value="">Select Manager...</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Password</label>
              <input type="password" placeholder="Enter password" className="w-full p-4 bg-slate-950 border border-slate-800 text-white placeholder-slate-600 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 text-lg uppercase tracking-wider">
              Enter Locker Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. THE MAIN APP DASHBOARD (DARK MODE + MOBILE NAV)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans overflow-x-hidden relative pb-24 md:pb-8">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes popInOut { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } } 
        .animate-pop { animation: popInOut 1s ease-in-out infinite; }
        @keyframes marquee { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
        .animate-marquee { animation: marquee 35s linear infinite; display: inline-block; white-space: nowrap; }
        .custom-scrollbar::-webkit-scrollbar { display: none; } .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* SQUAD BUILDER MODAL (DARK) */}
      {isLineupModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-slate-900 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-slate-800 relative animate-in zoom-in-95 duration-200">
              <h2 className="text-2xl font-black mb-2 text-white">Assign {activeLineupPosition}</h2>
              <p className="text-sm font-bold text-slate-400 mb-6">Select a player from your squad or type a name.</p>
              
              <div className="space-y-6">
                 <div>
                    <label className="text-xs font-black uppercase text-slate-500 tracking-widest mb-2 block">Custom Input</label>
                    <div className="flex gap-2">
                       <input 
                         type="text" 
                         placeholder="Enter player name..." 
                         className="flex-1 p-3 bg-slate-950 border border-slate-700 text-white rounded-xl font-bold outline-none focus:border-indigo-500 transition-colors"
                         value={customPlayerName}
                         onChange={(e) => setCustomPlayerName(e.target.value)}
                       />
                       <button onClick={() => saveSquadPlayer(customPlayerName)} className="bg-indigo-600 text-white px-6 rounded-xl font-black hover:bg-indigo-500 transition-colors shadow-lg">SAVE</button>
                    </div>
                 </div>

                 {mySignedPlayers.length > 0 && (
                   <div>
                      <label className="text-xs font-black uppercase text-slate-500 tracking-widest mb-3 block border-t border-slate-800 pt-4">Your Transfers</label>
                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                         {mySignedPlayers.map(pName => (
                            <button 
                              key={pName} 
                              onClick={() => saveSquadPlayer(pName)}
                              className="bg-slate-800 text-indigo-300 border border-slate-700 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm"
                            >
                              {pName}
                            </button>
                         ))}
                      </div>
                   </div>
                 )}
              </div>

              <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-800">
                 <button onClick={clearSquadPlayer} className="text-sm font-bold text-red-500 hover:text-red-400 transition-colors">Clear Position</button>
                 <button onClick={() => setIsLineupModalOpen(false)} className="text-sm font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest">Cancel</button>
              </div>
           </div>
        </div>
      )}

      {/* Breaking News Ticker (Sky Sports Dark) */}
      <div className="w-full bg-red-800 text-white overflow-hidden py-2 border-b border-red-900 shadow-md relative z-10 flex items-center">
        <div className="bg-red-900 font-black px-4 py-2 absolute left-0 z-20 h-full flex items-center shadow-lg uppercase tracking-widest text-sm">🚨 Latest</div>
        <div className="w-full pl-28">
           <span className="animate-marquee font-bold tracking-wider">{shuffledTicker || "Welcome to The Super League..."}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-8">
        <div className="text-center py-4">
          <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 drop-shadow-sm">The Super League</h1>
          <p className="mt-2 text-slate-400 font-medium">Official Tracker, Auctions & Awards</p>
          {isAdmin && <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-3 border border-indigo-500/30 inline-block px-3 py-1 rounded-full bg-indigo-900/20">Commissioner Access</p>}
        </div>
        
        {/* Nav & Controls */}
        <div className="bg-slate-900 p-4 rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
          
          {/* DESKTOP NAV (Hidden on Mobile) */}
          <div className="hidden md:flex bg-slate-950 p-1.5 rounded-xl w-auto overflow-x-auto border border-slate-800 shadow-inner gap-1">
            {TABS.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)} 
                className={`min-w-[90px] py-2.5 px-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-slate-800 text-indigo-400 shadow-md border border-slate-700' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl shadow-inner">
               <span className="text-xl">👤</span><span className="text-white font-black tracking-wide">{managers.find(m => m.id === myManagerId)?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-500 uppercase tracking-wide text-xs font-bold whitespace-nowrap">Season:</label>
              <select className="p-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl font-bold text-sm outline-none shadow-inner focus:border-indigo-500 transition-colors cursor-pointer" value={selectedSeasonId} onChange={(e) => setSelectedSeasonId(e.target.value)}>
                <option value="all">🌍 TOTAL (ALL TIME)</option>
                {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ======================= LEAGUE TAB ======================= */}
        {activeTab === 'league' && (
           <div className="space-y-6 animate-in fade-in duration-300">
             <div className="bg-slate-900 p-6 md:p-8 rounded-3xl shadow-xl border border-slate-800 overflow-x-auto">
               <h2 className="text-2xl font-black mb-6 text-white flex items-center gap-2">🏆 {isTotal ? 'All-Time Leaderboard' : 'League Standings'}</h2>
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-950 border-y border-slate-800 text-slate-500 text-xs uppercase tracking-widest">
                     <th className="p-4 font-black rounded-tl-lg">Manager</th>
                     <th className="p-4 font-black">P</th><th className="p-4 font-black">W</th><th className="p-4 font-black">D</th><th className="p-4 font-black">L</th>
                     <th className="p-4 font-black">Form</th><th className="p-4 font-black">GD</th><th className="p-4 font-black text-indigo-400 rounded-tr-lg">Pts</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800/50">
                   {leagueTable.map((row, index) => (
                     <tr key={row.id} className="hover:bg-slate-800/50 transition-colors">
                       <td className="p-4 flex items-center gap-3"><span className="text-slate-600 font-bold text-sm">{index + 1}</span><span className="font-black text-white text-lg">{row.name}</span></td>
                       <td className="p-4 text-slate-400 font-medium">{row.p}</td><td className="p-4 text-slate-400 font-medium">{row.w}</td><td className="p-4 text-slate-400 font-medium">{row.d}</td><td className="p-4 text-slate-400 font-medium">{row.l}</td>
                       <td className="p-4 flex gap-1.5 items-center h-full min-h-[60px]">
                         {row.form.length > 0 ? row.form.map((f: string, i: number) => ( <span key={i} className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black text-white shadow-sm ${f === 'W' ? 'bg-green-600' : f === 'D' ? 'bg-slate-600' : 'bg-red-600'}`}>{f}</span> )) : <span className="text-slate-600 font-black">-</span>}
                       </td>
                       <td className="p-4 text-slate-300 font-bold">{row.gd > 0 ? `+${row.gd}` : row.gd}</td><td className="p-4 font-black text-indigo-400 text-xl">{row.pts}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
 
             {!isTotal && (
               <div className="bg-slate-900 p-6 md:p-8 rounded-3xl shadow-xl border border-slate-800">
                  <h2 className="text-2xl font-black mb-6 text-white flex items-center gap-2">⚽ Log Match Result</h2>
                  <form onSubmit={submitMatch} className="flex flex-col space-y-6">
                     <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-inner">
                        <div className="flex flex-col w-full md:w-2/5">
                           <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Home Team</label>
                           <select className="p-3.5 bg-slate-900 border border-slate-700 text-white rounded-xl outline-none focus:border-indigo-500 transition-colors" value={homeTeamId} onChange={(e) => setHomeTeamId(e.target.value)}>
                              <option value="">Select Manager...</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                           </select>
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-1/5 justify-center">
                           <input type="number" min="0" className="w-16 p-3 bg-slate-900 border border-slate-700 text-white text-center text-2xl font-black rounded-xl focus:border-indigo-500 outline-none" value={homeGoals} onChange={(e) => setHomeGoals(parseInt(e.target.value) || 0)} />
                           <span className="font-black text-slate-600 text-xl">-</span>
                           <input type="number" min="0" className="w-16 p-3 bg-slate-900 border border-slate-700 text-white text-center text-2xl font-black rounded-xl focus:border-indigo-500 outline-none" value={awayGoals} onChange={(e) => setAwayGoals(parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="flex flex-col w-full md:w-2/5">
                           <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Away Team</label>
                           <select className="p-3.5 bg-slate-900 border border-slate-700 text-white rounded-xl outline-none focus:border-indigo-500 transition-colors" value={awayTeamId} onChange={(e) => setAwayTeamId(e.target.value)}>
                              <option value="">Select Manager...</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                           </select>
                        </div>
                     </div>
                     <div className="flex flex-col md:flex-row gap-4 items-end pt-2">
                       {!isAdmin && ( <div className="flex flex-col w-full md:w-1/3"><label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Admin Password</label><input type="password" placeholder="••••••••" className="p-3.5 bg-slate-950 border border-slate-700 text-white rounded-xl w-full outline-none focus:border-indigo-500" value={password} onChange={(e) => setPassword(e.target.value)} /></div> )}
                       <button type="submit" className={`w-full ${isAdmin ? '' : 'md:w-2/3'} bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl shadow-lg transition-all`}>Submit Final Score</button>
                     </div>
                  </form>
               </div>
             )}
           </div>
         )}

        {/* ======================= PROFILES TAB (DARK MODE + FUT CARDS) ======================= */}
        {activeTab === 'profiles' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {managerProfiles.map(profile => {
                const isMyProfile = profile.id === myManagerId;
                
                return (
                <div key={profile.id} className="bg-slate-900 rounded-3xl shadow-xl border border-slate-800 overflow-hidden relative">
                   <div className="bg-slate-950 h-32 absolute top-0 left-0 right-0 z-0 opacity-80 border-b border-slate-800"></div>
                   
                   <div className="p-6 relative z-10">
                     <div className="flex justify-between items-end mb-8 mt-4">
                        <div className="flex items-center gap-5">
                           <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white text-5xl shadow-[0_10px_30px_rgba(79,70,229,0.5)] font-black border-4 border-slate-900 relative">
                             {profile.name.charAt(0)}
                           </div>
                           <div>
                             <h2 className="text-4xl font-black text-white drop-shadow-md">{profile.name}</h2>
                             <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mt-1">Club Manager</p>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-3 gap-3 mb-8">
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center shadow-inner">
                          <p className="text-3xl font-black text-cyan-400">{profile.winPct}%</p>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Win Rate</p>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center shadow-inner">
                          <p className="text-3xl font-black text-white">{profile.w}</p>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Wins</p>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center shadow-inner">
                          <p className="text-3xl font-black text-white">{profile.p}</p>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Matches</p>
                        </div>
                     </div>

                     {/* THE PITCH / FUT SQUAD BUILDER */}
                     <div className="mt-8 mb-8">
                        <div className="flex justify-between items-center mb-4 px-2">
                          <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <span>📋</span> Starting XI
                          </h3>
                          {isMyProfile && <span className="text-[10px] font-black bg-indigo-900/40 text-indigo-400 border border-indigo-500/30 px-2 py-1 rounded uppercase tracking-wider animate-pulse">Tap to edit</span>}
                        </div>

                        {/* GREEN PITCH UI (DARKER FOR NIGHT MODE) */}
                        <div className="relative w-full aspect-[3/4] max-w-sm mx-auto bg-emerald-900/80 rounded-xl border-4 border-slate-800 shadow-[inset_0_0_60px_rgba(0,0,0,0.8)] overflow-hidden">
                           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                           <div className="absolute top-0 left-1/4 right-1/4 h-1/6 border-x-2 border-b-2 border-white/20"></div>
                           <div className="absolute top-0 left-[35%] right-[35%] h-[8%] border-x-2 border-b-2 border-white/20"></div>
                           <div className="absolute bottom-0 left-1/4 right-1/4 h-1/6 border-x-2 border-t-2 border-white/20"></div>
                           <div className="absolute bottom-0 left-[35%] right-[35%] h-[8%] border-x-2 border-t-2 border-white/20"></div>
                           <div className="absolute top-1/2 left-0 right-0 border-t-2 border-white/20"></div>
                           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/20 rounded-full"></div>

                           <div className="absolute inset-0 flex flex-col justify-between py-6 z-10">
                              <div className="flex justify-evenly px-4">{renderPitchPlayer(profile, 'LW')}{renderPitchPlayer(profile, 'ST')}{renderPitchPlayer(profile, 'RW')}</div>
                              <div className="flex justify-evenly px-8">{renderPitchPlayer(profile, 'LCM')}{renderPitchPlayer(profile, 'CM')}{renderPitchPlayer(profile, 'RCM')}</div>
                              <div className="flex justify-evenly px-2">{renderPitchPlayer(profile, 'LB')}{renderPitchPlayer(profile, 'LCB')}{renderPitchPlayer(profile, 'RCB')}{renderPitchPlayer(profile, 'RB')}</div>
                              <div className="flex justify-center mt-2">{renderPitchPlayer(profile, 'GK')}</div>
                           </div>
                        </div>
                     </div>

                     {/* Achievements Section */}
                     <div className="border-t border-slate-800 pt-6">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Trophy Cabinet</h3>
                        <div className="flex flex-wrap gap-3">
                          {profile.achievements.length > 0 ? profile.achievements.map((ach: any, i: number) => (
                             <div key={i} className="flex items-center gap-2 bg-slate-950 border border-yellow-700/50 px-3 py-2 rounded-xl shadow-md" title={ach.desc}>
                                <span className="text-xl">{ach.icon}</span>
                                <span className="text-xs font-black text-yellow-500 uppercase tracking-wide">{ach.title}</span>
                             </div>
                          )) : (
                             <div className="text-xs font-bold text-slate-600 italic">No achievements unlocked yet.</div>
                          )}
                        </div>
                     </div>

                   </div>
                </div>
              )})}
            </div>
          </div>
        )}

        {/* ======================= TRANSFERS TAB ======================= */}
        {activeTab === 'transfers' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {managerBalances.map(mb => (
                  <div key={mb.id} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-center items-center text-center">
                     <h4 className="text-slate-500 font-black uppercase tracking-widest text-[10px] mb-2">{mb.name}&apos;s Net</h4>
                     <p className={`text-2xl lg:text-3xl font-black ${mb.net >= 0 ? 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.4)]' : 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]'}`}>{mb.net >= 0 ? '+' : ''}£{mb.net}M</p>
                  </div>
               ))}
            </div>

            {!isTotal && (
               <div className="bg-slate-900 p-6 md:p-8 rounded-3xl shadow-xl border border-slate-800">
                  <h2 className="text-2xl font-black mb-6 text-white flex items-center gap-2">📝 Log Transfer</h2>
                  <form onSubmit={submitTransfer} className="flex flex-col space-y-6">
                     <div className="flex flex-col md:flex-row gap-6 bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-inner">
                        <div className="flex flex-col w-full md:w-1/3">
                           <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Player Name</label>
                           <input type="text" className="p-3.5 bg-slate-900 border border-slate-700 text-white rounded-xl outline-none focus:border-indigo-500" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
                        </div>
                        <div className="flex flex-col w-full md:w-1/3">
                           <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Manager</label>
                           <select className="p-3.5 bg-slate-900 border border-slate-700 text-white rounded-xl outline-none focus:border-indigo-500" value={acquiringManagerId} onChange={(e) => setAcquiringManagerId(e.target.value)}>
                              <option value="">Select Manager...</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                           </select>
                        </div>
                        <div className="flex flex-col w-full md:w-1/3">
                           <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Fee (Use - for Money Spent)</label>
                           <div className="relative">
                             <span className="absolute left-4 top-3.5 text-slate-400 font-black">£</span>
                             <input type="number" step="0.1" className="p-3.5 pl-9 bg-slate-900 border border-slate-700 text-white rounded-xl w-full outline-none focus:border-indigo-500" value={transferFee} onChange={(e) => setTransferFee(e.target.value === '' ? '' : parseFloat(e.target.value))} />
                             <span className="absolute right-4 top-3.5 text-slate-400 font-black">M</span>
                           </div>
                        </div>
                     </div>
                     <div className="flex flex-col md:flex-row gap-4 items-end pt-2">
                       {!isAdmin && ( <div className="flex flex-col w-full md:w-1/3"><label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Admin Password</label><input type="password" placeholder="••••••••" className="p-3.5 bg-slate-950 border border-slate-700 text-white rounded-xl w-full outline-none" value={password} onChange={(e) => setPassword(e.target.value)} /></div> )}
                       <button type="submit" className={`w-full ${isAdmin ? '' : 'md:w-2/3'} bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl shadow-lg transition-all`}>Confirm Transfer</button>
                     </div>
                  </form>
               </div>
            )}

            <div className="bg-slate-900 p-6 md:p-8 rounded-3xl shadow-xl border border-slate-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-black text-white">🔄 Transfer Activity {isTotal && '(All Time)'}</h2>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <select className="p-3 bg-slate-950 border border-slate-700 text-white font-bold rounded-xl text-sm outline-none cursor-pointer w-full sm:w-auto focus:border-indigo-500" value={transferManagerFilter} onChange={(e) => setTransferManagerFilter(e.target.value)}><option value="all">👥 All Managers</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                  <select className="p-3 bg-slate-950 border border-slate-700 text-white font-bold rounded-xl text-sm outline-none cursor-pointer w-full sm:w-auto focus:border-indigo-500" value={transferTypeFilter} onChange={(e) => setTransferTypeFilter(e.target.value)}><option value="all">💸 All Types</option><option value="in">📥 Signed (Money Out)</option><option value="out">📤 Sold (Money In)</option></select>
                </div>
              </div>
              <div className="grid gap-4">
                {displayedTransfers.length > 0 ? (
                  displayedTransfers.slice().reverse().map((transfer) => (
                    <div key={transfer.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-center shadow-sm hover:border-indigo-500/50 transition-colors">
                      <div className="flex items-center gap-4 w-full md:w-1/3">
                        <div className="bg-indigo-900/30 text-indigo-400 p-3 rounded-full text-xl border border-indigo-500/30">👤</div>
                        <span className="font-black text-white text-lg">{transfer.player_name}</span>
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-1/3 justify-center text-slate-400 font-bold my-4 md:my-0 text-sm uppercase tracking-wider">
                        {transfer.transfer_fee < 0 ? 'Signed by ' : 'Sold by '}<span className="font-black text-white">{transfer.manager?.name}</span>
                      </div>
                      <div className="w-full md:w-1/3 flex flex-col items-center md:items-end justify-center gap-2">
                        <span className={`border px-5 py-2.5 rounded-full font-black tracking-widest text-sm shadow-inner ${transfer.transfer_fee >= 0 ? 'bg-green-900/30 border-green-500/50 text-green-400' : 'bg-red-900/30 border-red-500/50 text-red-400'}`}>
                          {transfer.transfer_fee > 0 ? '+' : ''}£{transfer.transfer_fee}M
                        </span>
                        {isAdmin && (<button onClick={() => deleteTransfer(transfer.id)} className="text-[10px] font-black text-slate-600 hover:text-red-500 uppercase tracking-widest transition-colors mt-1">Admin: Remove</button>)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-slate-950 rounded-2xl border border-dashed border-slate-700"><p className="text-slate-500 font-bold text-lg">No transfers found.</p></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================= eBay TAB ======================= */}
        {activeTab === 'ebay' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/40 to-slate-900 opacity-50 mix-blend-overlay"></div>
               <div className="z-10 flex items-center gap-3"><div className="h-4 w-4 bg-red-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div><h2 className="text-2xl font-black tracking-widest uppercase">Live Auction House</h2></div>
               <div className="z-10 font-mono text-xl font-bold bg-slate-950 px-6 py-2.5 rounded-xl border border-slate-700 shadow-inner text-cyan-400">UK: {ukTime}</div>
            </div>
            {!isTotal && (
               <div className="bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-800">
                  <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Admin: List Player</h3>
                  <form onSubmit={listAuction} className="flex flex-col md:flex-row items-end gap-4">
                     <div className={`w-full ${isAdmin ? 'md:w-1/2' : 'md:w-1/3'}`}><label className="text-xs font-black text-slate-500 tracking-widest mb-2 block uppercase">Player Name</label><input type="text" className="w-full p-3.5 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none focus:border-indigo-500" value={auctionPlayerName} onChange={e => setAuctionPlayerName(e.target.value)} /></div>
                     <div className={`w-full ${isAdmin ? 'md:w-1/2' : 'md:w-1/4'}`}><label className="text-xs font-black text-slate-500 tracking-widest mb-2 block uppercase">Starting Bid (£M)</label><input type="number" step="0.1" className="w-full p-3.5 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none focus:border-indigo-500" value={auctionStartBid} onChange={e => setAuctionStartBid(e.target.value === '' ? '' : parseFloat(e.target.value))} /></div>
                     {!isAdmin && (<div className="w-full md:w-1/4"><label className="text-xs font-black text-slate-500 tracking-widest mb-2 block uppercase">Password</label><input type="password" placeholder="••••••••" className="w-full p-3.5 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none" value={password} onChange={e => setPassword(e.target.value)} /></div>)}
                     <button type="submit" className="w-full md:w-auto bg-white text-slate-900 px-8 py-3.5 rounded-xl font-black hover:bg-slate-200 transition-colors">LIST</button>
                  </form>
               </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentSeasonAuctions.map(auction => {
                 const endTimeMs = auction.end_time ? new Date(auction.end_time).getTime() : 0;
                 const timeLeft = auction.end_time ? Math.max(0, Math.floor((endTimeMs - currentTime) / 1000)) : 0;
                 const isPending = auction.status === 'pending';
                 const isActive = auction.status === 'active' && timeLeft > 0;
                 const isFinished = auction.status === 'active' && auction.end_time && timeLeft === 0;
                 const isUrgent = isActive && timeLeft <= 10;
                 
                 let cardStyle = "p-6 rounded-3xl border-2 transition-all duration-300 relative overflow-hidden ";
                 if (isPending) cardStyle += "bg-slate-900 border-slate-700"; 
                 else if (isActive && !isUrgent) cardStyle += "bg-slate-900 border-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.2)]"; 
                 else if (isUrgent) cardStyle += "bg-slate-900 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.3)] animate-pop"; 
                 else if (isFinished) cardStyle += "bg-slate-900 border-green-500";

                 return (
                 <div key={auction.id} className={cardStyle}>
                    <div className="flex justify-between items-start mb-6">
                       <h3 className="text-3xl font-black text-white">{auction.player_name}</h3>
                       {isPending && <span className="bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-slate-600">Waiting</span>}
                       {isActive && <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${isUrgent ? 'bg-red-600 text-white border-red-500' : 'bg-indigo-900/50 text-indigo-400 border-indigo-500/50 animate-pulse'} flex items-center gap-1`}>LIVE ⏳ {timeLeft}s</span>}
                       {isFinished && <span className="bg-green-900/50 text-green-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-green-500/50">SOLD 🎉</span>}
                    </div>
                    <div className={`rounded-2xl p-5 border mb-6 flex justify-between items-center shadow-inner ${isFinished ? 'bg-green-950/30 border-green-900/50' : 'bg-slate-950 border-slate-800'}`}>
                       <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{isFinished ? 'Winning Bid' : 'Current Highest Bid'}</p><p className={`text-4xl font-black ${isFinished ? 'text-green-400' : 'text-indigo-400'}`}>£{auction.current_bid}M</p></div>
                       <div className="text-right"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{isFinished ? 'Won By' : 'Held By'}</p><p className="text-lg font-black text-white">{auction.highest_bidder?.name || 'No bids yet'}</p></div>
                    </div>
                    {isPending && <button onClick={() => startAuctionTimer(auction.id)} className="w-full bg-slate-800 text-white px-6 py-4 rounded-xl font-black hover:bg-slate-700 transition-colors uppercase tracking-wider text-sm border border-slate-700">Admin: Start 30s Timer</button>}
                    {isActive && (<div className="flex gap-3"><input type="number" step="0.1" placeholder={`> ${auction.current_bid}`} className="flex-1 p-3.5 bg-slate-950 border-2 border-slate-700 text-white rounded-xl font-black text-lg outline-none focus:border-indigo-500" value={bidInputs[auction.id] || ''} onChange={(e) => setBidInputs({...bidInputs, [auction.id]: parseFloat(e.target.value)})} /><button onClick={() => placeBid(auction.id, auction.current_bid, auction.end_time)} className="bg-indigo-600 text-white px-10 rounded-xl font-black text-lg hover:bg-indigo-500 active:scale-95 transition-transform shadow-lg">BID</button></div>)}
                    {(isFinished || isPending) && <button onClick={() => archiveAuction(auction.id)} className="w-full mt-6 text-[10px] font-black text-slate-600 hover:text-red-500 transition-colors uppercase tracking-widest">Admin: Clear / Hide Auction</button>}
                 </div>
              )})}
            </div>
          </div>
        )}

        {/* ======================= HALL OF FAME TAB ======================= */}
        {activeTab === 'hof' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 text-white p-8 rounded-3xl shadow-xl text-center relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-b from-yellow-900/20 to-transparent"></div>
               <h2 className="text-4xl font-black tracking-widest uppercase mb-3 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 relative z-10">🏛️ The Hall of Fame</h2>
               <p className="font-bold text-slate-400 relative z-10">Permanent records from across all seasons.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 text-9xl opacity-5 grayscale group-hover:scale-110 transition-transform duration-500">💰</div><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Most Expensive Transfer</h3>
                {hof.mostExpensiveTransfer ? (<><p className="text-4xl font-black text-white mb-2">{hof.mostExpensiveTransfer.player_name}</p><p className="text-5xl font-black text-cyan-400 mb-6 drop-shadow-md">£{hof.mostExpensiveTransfer.absFee}M</p><div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-between items-center shadow-inner"><span className="font-black text-slate-300">{hof.mostExpensiveTransfer.manager?.name}</span><span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{hof.mostExpensiveTransfer.seasonName}</span></div></>) : (<p className="text-slate-600 font-bold py-8">No transfers logged yet.</p>)}
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 text-9xl opacity-5 grayscale group-hover:scale-110 transition-transform duration-500">👑</div><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">The Invincible Season</h3>
                {hof.maxPointsRecord && hof.maxPointsRecord.points > 0 ? (<><p className="text-4xl font-black text-white mb-2">{hof.maxPointsRecord.managerName}</p><p className="text-5xl font-black text-yellow-500 mb-6 drop-shadow-md">{hof.maxPointsRecord.points} PTS</p><div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-center items-center shadow-inner"><span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{hof.maxPointsRecord.seasonName}</span></div></>) : (<p className="text-slate-600 font-bold py-8">No completed matches yet.</p>)}
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 text-9xl opacity-5 grayscale group-hover:scale-110 transition-transform duration-500">🥊</div><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Biggest Demolition</h3>
                {hof.biggestDemolition ? (<><div className="flex justify-between items-center my-6"><p className={`text-2xl font-black ${hof.biggestDemolition.home_goals > hof.biggestDemolition.away_goals ? 'text-white' : 'text-slate-600'}`}>{hof.biggestDemolition.home?.name}</p><p className="text-4xl font-black text-red-500 bg-slate-950 px-5 py-2 rounded-2xl border border-red-900/50 shadow-inner">{hof.biggestDemolition.home_goals} - {hof.biggestDemolition.away_goals}</p><p className={`text-2xl font-black ${hof.biggestDemolition.away_goals > hof.biggestDemolition.home_goals ? 'text-white' : 'text-slate-600'}`}>{hof.biggestDemolition.away?.name}</p></div><div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-center items-center mt-4 shadow-inner"><span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{hof.biggestDemolition.seasonName}</span></div></>) : (<p className="text-slate-600 font-bold py-8">No matches logged yet.</p>)}
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 text-9xl opacity-5 grayscale group-hover:scale-110 transition-transform duration-500">🎇</div><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Highest Scoring Match</h3>
                {hof.highestScoringGame ? (<><div className="flex justify-between items-center my-6"><p className="text-2xl font-black text-white">{hof.highestScoringGame.home?.name}</p><div className="text-center"><p className="text-4xl font-black text-indigo-400 bg-slate-950 px-5 py-2 rounded-2xl border border-indigo-900/50 shadow-inner mb-2">{hof.highestScoringGame.home_goals} - {hof.highestScoringGame.away_goals}</p><p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{hof.highestScoringGame.totalGoals} Goals</p></div><p className="text-2xl font-black text-white">{hof.highestScoringGame.away?.name}</p></div><div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-center items-center mt-4 shadow-inner"><span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{hof.highestScoringGame.seasonName}</span></div></>) : (<p className="text-slate-600 font-bold py-8">No matches logged yet.</p>)}
              </div>
            </div>
          </div>
        )}

        {/* ======================= H2H TAB ======================= */}
        {activeTab === 'h2h' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 p-6 md:p-8 rounded-3xl shadow-xl border border-slate-800">
               <h2 className="text-2xl font-black mb-8 text-white flex items-center gap-2">⚔️ Head-to-Head Records</h2>
               <div className="flex flex-col md:flex-row justify-center items-center gap-6 mb-12">
                  <select className="p-4 bg-slate-950 border border-slate-700 text-white rounded-2xl font-black text-xl outline-none cursor-pointer w-full md:w-1/3 text-center focus:border-indigo-500 transition-colors shadow-inner" value={h2hManagerA} onChange={(e) => setH2hManagerA(e.target.value)}><option value="">Select Manager</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                  <div className="text-3xl font-black text-slate-700 italic">VS</div>
                  <select className="p-4 bg-slate-950 border border-slate-700 text-white rounded-2xl font-black text-xl outline-none cursor-pointer w-full md:w-1/3 text-center focus:border-indigo-500 transition-colors shadow-inner" value={h2hManagerB} onChange={(e) => setH2hManagerB(e.target.value)}><option value="">Select Manager</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
               </div>
               {h2hManagerA && h2hManagerB && h2hManagerA !== h2hManagerB ? (
                 <div className="space-y-10 animate-in slide-in-from-bottom-4">
                   <div className="grid grid-cols-3 gap-4 text-center items-center bg-slate-950 border border-slate-800 text-white rounded-3xl p-8 shadow-inner"><div><p className="text-5xl font-black text-cyan-400">{h2hStats.aWins}</p><p className="text-[10px] uppercase tracking-widest text-slate-500 mt-2 font-black">Wins</p></div><div className="border-x border-slate-800"><p className="text-5xl font-black text-slate-600">{h2hStats.d}</p><p className="text-[10px] uppercase tracking-widest text-slate-500 mt-2 font-black">Draws</p></div><div><p className="text-5xl font-black text-cyan-400">{h2hStats.bWins}</p><p className="text-[10px] uppercase tracking-widest text-slate-500 mt-2 font-black">Wins</p></div></div>
                   <div className="flex justify-between items-center px-4"><div className="text-center"><p className="text-3xl font-black text-white">{h2hStats.aGoals}</p><p className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Goals</p></div><div className="text-center"><p className="text-[10px] font-black uppercase tracking-widest bg-indigo-900/40 border border-indigo-500/30 text-indigo-400 px-4 py-1.5 rounded-full">{h2hStats.p} Matches Played</p></div><div className="text-center"><p className="text-3xl font-black text-white">{h2hStats.bGoals}</p><p className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Goals</p></div></div>
                   {h2hStats.matches.length > 0 && ( <div className="mt-8 border-t border-slate-800 pt-8"><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Match History (Recent First)</h3><div className="grid gap-4">{h2hStats.matches.map(m => ( <div key={m.id} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex justify-between items-center shadow-inner"><span className={`w-1/3 text-right font-black text-lg ${m.home_goals > m.away_goals ? 'text-white' : 'text-slate-600'}`}>{m.home?.name}</span><span className="w-1/3 text-center font-black bg-slate-900 py-1.5 px-4 rounded-xl border border-slate-700 text-indigo-400">{m.home_goals} - {m.away_goals}</span><span className={`w-1/3 text-left font-black text-lg ${m.away_goals > m.home_goals ? 'text-white' : 'text-slate-600'}`}>{m.away?.name}</span></div> ))}</div></div> )}
                 </div>
               ) : h2hManagerA === h2hManagerB && h2hManagerA !== '' ? (<div className="text-center text-red-500 font-bold py-10">You cannot select the same manager twice.</div>) : (<div className="text-center text-slate-600 font-bold py-12 border-2 border-dashed border-slate-800 rounded-3xl">Select two managers above to view their history.</div>)}
            </div>
          </div>
        )}

        {/* ======================= AWARDS TAB ======================= */}
        {activeTab === 'awards' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-yellow-700/50 p-8 rounded-3xl shadow-xl text-center relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/20 to-transparent"></div>
               <h2 className="text-3xl font-black tracking-widest uppercase mb-2 text-yellow-500 relative z-10">🏆 Nominations</h2>
               <p className="font-bold text-slate-400 text-sm relative z-10">Nominate 2 players. Cast 1 vote for another team.</p>
            </div>
            {!isTotal && (
               <div className="bg-slate-900 p-6 md:p-8 rounded-3xl shadow-xl border border-slate-800">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Nominate a Player</h3>
                  <form onSubmit={submitNomination} className="flex flex-col md:flex-row items-end gap-4">
                     <div className="w-full md:w-3/4"><label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Player Name</label><input type="text" placeholder="Who deserves the award?" className="w-full p-3.5 bg-slate-950 border border-slate-700 focus:border-yellow-500 rounded-xl outline-none font-bold text-white transition-colors" value={nominationName} onChange={e => setNominationName(e.target.value)} /></div>
                     <button type="submit" className="w-full md:w-1/4 bg-yellow-600 hover:bg-yellow-500 text-slate-900 px-6 py-4 rounded-xl font-black transition-colors shadow-lg">NOMINATE</button>
                  </form>
               </div>
            )}
            <div className="grid gap-4">
              {currentSeasonNominations.map(nom => ({ ...nom, voteCount: votes.filter(v => v.nomination_id === nom.id).length })).sort((a, b) => b.voteCount - a.voteCount).map(nom => {
                   const hasVotedThisSeason = votes.some(v => v.voter_id === myManagerId && v.season_id === nom.season_id);
                   const isOwnPlayer = nom.manager_id === myManagerId;
                   const iVotedForThis = votes.some(v => v.nomination_id === nom.id && v.voter_id === myManagerId);
                   return (
                   <div key={nom.id} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-center shadow-md">
                      <div className="w-full md:w-1/3"><h3 className="text-2xl font-black text-white">{nom.player_name}</h3><p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">By {nom.manager?.name}</p></div>
                      <div className="w-full md:w-1/3 flex justify-center my-6 md:my-0"><div className="bg-slate-950 border border-yellow-700/50 px-6 py-2.5 rounded-full flex items-center gap-3 shadow-inner"><span className="text-xl drop-shadow-md">⭐️</span><span className="text-2xl font-black text-yellow-500">{nom.voteCount}</span></div></div>
                      <div className="w-full md:w-1/3 flex flex-col items-center md:items-end justify-center gap-3">
                         {isTotal ? (<span className="text-slate-600 font-bold italic">Voting closed</span>) : iVotedForThis ? (<span className="bg-green-900/40 text-green-400 px-8 py-3 rounded-xl font-black flex items-center gap-2 border border-green-500/50">✅ Voted</span>) : (<button onClick={() => castVote(nom)} disabled={isOwnPlayer || hasVotedThisSeason} className={`w-full md:max-w-[160px] px-8 py-3.5 rounded-xl font-black transition-all text-sm uppercase tracking-wider ${isOwnPlayer ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700' : hasVotedThisSeason ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700' : 'bg-white text-slate-900 hover:bg-slate-200 active:scale-95 shadow-lg'}`}>{isOwnPlayer ? 'Your Player' : hasVotedThisSeason ? 'Vote Cast' : 'VOTE'}</button>)}
                         {isAdmin && (<button onClick={() => deleteNomination(nom.id)} className="text-[10px] font-black text-slate-600 hover:text-red-500 uppercase tracking-widest transition-colors mt-1">Admin: Remove</button>)}
                      </div>
                   </div>
              )})}
            </div>
          </div>
        )}

      </div>

      {/* MOBILE BOTTOM NAVIGATION (Fixed) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 flex justify-around items-center px-1 py-2 z-50 overflow-x-auto safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        {TABS.map(tab => (
           <button 
             key={tab.id}
             onClick={() => setActiveTab(tab.id)} 
             className={`flex flex-col items-center justify-center w-[70px] min-w-[70px] py-1 gap-1 transition-all rounded-xl ${activeTab === tab.id ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
           >
             <span className="text-xl mb-0.5">{tab.icon}</span>
             <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
             {/* Active Indicator dot */}
             <div className={`h-1 w-1 rounded-full mt-0.5 ${activeTab === tab.id ? 'bg-cyan-400' : 'bg-transparent'}`}></div>
           </button>
        ))}
      </div>

    </div>
  );
}