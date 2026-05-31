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

// Club Logos Dictionary
const CLUB_LOGOS: Record<string, string> = {
  "Kola": "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg",
  "Gurpal": "https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg",
  "Rajat": "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg",
  "Sukhi": "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg"
};

const TABS = [
  { id: 'league', icon: '⚽', label: 'League' },
  { id: 'h2h', icon: '⚔️', label: 'H2H' },
  { id: 'transfer_market', icon: '📊', label: 'Market' },
  { id: 'profiles', icon: '🛡️', label: 'Profiles' },
  { id: 'hof', icon: '🏛️', label: 'HOF' },
  { id: 'transfers', icon: '🤝', label: 'Transfers' },
  { id: 'ebay', icon: '🛒', label: 'eBay' },
  { id: 'awards', icon: '🏆', label: 'Awards' }
] as const;

type TabType = typeof TABS[number]['id'];

const FORMATIONS: Record<string, string[][]> = {
  '4-3-3': [['LW', 'ST', 'RW'], ['LCM', 'CM', 'RCM'], ['LB', 'LCB', 'RCB', 'RB'], ['GK']],
  '4-4-2': [['LS', 'RS'], ['LM', 'LCM', 'RCM', 'RM'], ['LB', 'LCB', 'RCB', 'RB'], ['GK']],
  '4-2-3-1': [['ST'], ['LAM', 'CAM', 'RAM'], ['LDM', 'RDM'], ['LB', 'LCB', 'RCB', 'RB'], ['GK']],
  '3-5-2': [['LS', 'RS'], ['LM', 'LCM', 'CAM', 'RCM', 'RM'], ['LCB', 'CB', 'RCB'], ['GK']]
};

export default function Home() {
  // Authentication & Data States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginManagerId, setLoginManagerId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [managers, setManagers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [nominations, setNominations] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [lineups, setLineups] = useState<any[]>([]);
  const [marketPlayers, setMarketPlayers] = useState<any[]>([]);
  const [interests, setInterests] = useState<any[]>([]);
  const [shortlists, setShortlists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // App States
  const [activeTab, setActiveTab] = useState<TabType>('league');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('all');
  const [myManagerId, setMyManagerId] = useState(''); 
  const [password, setPassword] = useState(''); 
  
  // Filters & Sorting
  const [transferManagerFilter, setTransferManagerFilter] = useState<string>('all');
  const [transferTypeFilter, setTransferTypeFilter] = useState<string>('all');
  const [marketSearchQuery, setMarketSearchQuery] = useState('');
  const [marketPositionFilter, setMarketPositionFilter] = useState('All');
  const [showOnlyShortlist, setShowOnlyShortlist] = useState(false);
  const [marketSort, setMarketSort] = useState<{key: string, dir: 'asc'|'desc'}>({key: 'value', dir: 'desc'});

  const [h2hManagerA, setH2hManagerA] = useState('');
  const [h2hManagerB, setH2hManagerB] = useState('');

  const [isLineupModalOpen, setIsLineupModalOpen] = useState(false);
  const [activeLineupPosition, setActiveLineupPosition] = useState('');
  const [customPlayerName, setCustomPlayerName] = useState('');

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
      if (seasonData && seasonData.length > 0) setSeasons(seasonData);
      
      fetchAuctions();
      fetchAwards();
      fetchMarketData();
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

    async function fetchMarketData() {
      const { data: players } = await supabase.from('transfer_market_players').select('*');
      const { data: ints } = await supabase.from('player_interests').select('*');
      const { data: shorts } = await supabase.from('player_shortlists').select('*');
      if (players) setMarketPlayers(players);
      if (ints) setInterests(ints);
      if (shorts) setShortlists(shorts);
    }

    fetchData();

    const channel = supabase.channel('realtime-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, fetchAuctions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_interests' }, fetchMarketData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_shortlists' }, fetchMarketData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lineups' }, async () => {
        const { data } = await supabase.from('lineups').select('*');
        if (data) setLineups(data);
      })
      .subscribe();

    return () => { clearInterval(timer); supabase.removeChannel(channel); };
  }, []);

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
  const isTotal = selectedSeasonId === 'all';
  
  const currentSeasonMatches = isTotal ? matches : matches.filter(match => match.season_id === selectedSeasonId);
  const currentSeasonTransfers = isTotal ? transfers : transfers.filter(transfer => transfer.season_id === selectedSeasonId);
  const currentSeasonAuctions = isTotal ? auctions : auctions.filter(auction => auction.season_id === selectedSeasonId);
  const currentSeasonNominations = isTotal ? nominations : nominations.filter(nom => nom.season_id === selectedSeasonId);

  // RESTORED DISPLAYED TRANSFERS LOGIC
  const displayedTransfers = currentSeasonTransfers.filter(t => {
    const matchManager = transferManagerFilter === 'all' || t.manager_id === transferManagerFilter;
    const matchType = 
      transferTypeFilter === 'all' || 
      (transferTypeFilter === 'in' && t.transfer_fee < 0) || 
      (transferTypeFilter === 'out' && t.transfer_fee > 0);
    return matchManager && matchType;
  });

  // --- MARKET LOGIC ---
  const handleSort = (key: string) => {
    setMarketSort(prev => ({ key, dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc' }));
  };

  const toggleShortlist = async (playerId: string) => {
    const existing = shortlists.find(s => s.player_id === playerId && s.manager_id === myManagerId);
    if (existing) {
      await supabase.from('player_shortlists').delete().eq('id', existing.id);
    } else {
      await supabase.from('player_shortlists').insert([{ player_id: playerId, manager_id: myManagerId }]);
    }
  };

  const declareInterest = async (player: any) => {
    if (selectedSeasonId === 'all') {
      return alert("Please select a specific Season from the top right before scouting players, so the app knows which season's auction to trigger!");
    }

    const existing = interests.find(i => i.player_id === player.id && i.manager_id === myManagerId);
    if (existing) {
      await supabase.from('player_interests').delete().eq('id', existing.id);
      return;
    }

    // Insert interest
    await supabase.from('player_interests').insert([{ player_id: player.id, manager_id: myManagerId }]);
    
    // Check if someone else was already interested
    const otherInterests = interests.filter(i => i.player_id === player.id && i.manager_id !== myManagerId);
    if (otherInterests.length > 0) {
       // AUCTION TRIGGERED!
       const { data: existingAuction } = await supabase.from('auctions').select('*').eq('player_name', player.player_name).neq('status', 'archived');
       if (!existingAuction || existingAuction.length === 0) {
           await supabase.from('auctions').insert([{ 
             season_id: selectedSeasonId, 
             player_name: player.player_name, 
             current_bid: player.market_value_millions_gbp || 0, 
             status: 'pending' 
           }]);
           alert(`🚨 BIDDING WAR! Both you and another manager scouted ${player.player_name}. They have been moved to the Live Auction House (eBay tab).`);
       }
    }
  };

  const activeAuctionNames = auctions.map(a => a.player_name);
  
  let displayedMarketPlayers = marketPlayers.filter(player => {
    // Hide players that are currently in an active auction
    if (activeAuctionNames.includes(player.player_name)) return false;
    if (showOnlyShortlist && !shortlists.some(s => s.player_id === player.id && s.manager_id === myManagerId)) return false;
    const matchSearch = player.player_name?.toLowerCase().includes(marketSearchQuery.toLowerCase()) || player.club?.toLowerCase().includes(marketSearchQuery.toLowerCase());
    const matchPos = marketPositionFilter === 'All' || player.position === marketPositionFilter;
    return matchSearch && matchPos;
  });

  // Apply sorting
  displayedMarketPlayers.sort((a, b) => {
    let valA = a.market_value_gbp || 0; let valB = b.market_value_gbp || 0;
    if (marketSort.key === 'age') { valA = a.age || 0; valB = b.age || 0; }
    return marketSort.dir === 'asc' ? valA - valB : valB - valA;
  });

  // --- STANDARD LOGIC ---
  const calculateTable = () => {
    let table: Record<string, any> = {};
    managers.forEach(m => { table[m.id] = { id: m.id, name: m.name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: [] as string[] }; });
    currentSeasonMatches.forEach(match => {
      if (!table[match.home_manager_id] || !table[match.away_manager_id]) return;
      const home = table[match.home_manager_id]; const away = table[match.away_manager_id];
      home.p += 1; away.p += 1;
      home.gf += match.home_goals; away.gf += match.away_goals;
      home.ga += match.away_goals; away.ga += match.home_goals;
      if (match.home_goals > match.away_goals) { home.w += 1; home.pts += 3; home.form.push('W'); away.l += 1; away.form.push('L'); } 
      else if (match.home_goals < match.away_goals) { away.w += 1; away.pts += 3; away.form.push('W'); home.l += 1; home.form.push('L'); } 
      else { home.d += 1; home.pts += 1; home.form.push('D'); away.d += 1; away.pts += 1; away.form.push('D'); }
      home.gd = home.gf - home.ga; away.gd = away.gf - away.ga;
    });
    Object.values(table).forEach(row => { row.form = row.form.slice(-5); });
    return Object.values(table).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  };
  const leagueTable = calculateTable();

  const managerProfiles = managers.map(m => {
    const mMatches = currentSeasonMatches.filter(match => match.home_manager_id === m.id || match.away_manager_id === m.id);
    let w=0, d=0, l=0, maxGd = -999, minGd = 999, cleanSheets = 0, scoredFive = false;
    let biggestWin = null, worstDefeat = null;
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
    if (mTransfers.length > 0) biggestTransfer = mTransfers.reduce((p, c) => Math.abs(Number(c.transfer_fee)) > Math.abs(Number(p.transfer_fee)) ? c : p );
    const achievements: any[] = [];
    if (cleanSheets >= 3) achievements.push({ icon: '🛑', title: 'Park the Bus', desc: '3+ Clean Sheets' });
    if (mNetSpend <= -150) achievements.push({ icon: '💸', title: 'Financial Ruin', desc: 'Net Spend ≤ -£150M' });
    if (scoredFive) achievements.push({ icon: '🏏', title: 'Cricket Score', desc: 'Scored 5+ goals in a game' });
    if (biggestTransfer && Math.abs(biggestTransfer.transfer_fee) >= 80) achievements.push({ icon: '🤑', title: 'Galáctico', desc: '£80M+ on a single player' });
    if (w >= 5) achievements.push({ icon: '🔥', title: 'Unstoppable', desc: 'Won 5+ Matches' });
    return { ...m, p: mMatches.length, w, d, l, winPct, biggestWin: maxGd > 0 ? biggestWin : 'N/A', worstDefeat: minGd < 0 ? worstDefeat : 'N/A', achievements };
  });

  const managerBalances = managers.map(m => {
    const net = currentSeasonTransfers.filter(t => t.manager_id === m.id).reduce((sum, t) => sum + Number(t.transfer_fee), 0);
    return { ...m, net };
  });

  // H2H Logic
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
      const sId = match.season_id; 
      const keyHome = `${sId}_${match.home_manager_id}`; 
      const keyAway = `${sId}_${match.away_manager_id}`;
      
      if (!seasonManagerPoints[keyHome]) seasonManagerPoints[keyHome] = 0;
      if (!seasonManagerPoints[keyAway]) seasonManagerPoints[keyAway] = 0;
      
      if (match.home_goals > match.away_goals) {
        seasonManagerPoints[keyHome] += 3; 
      } else if (match.home_goals < match.away_goals) {
        seasonManagerPoints[keyAway] += 3; 
      } else { 
        seasonManagerPoints[keyHome] += 1; 
        seasonManagerPoints[keyAway] += 1; 
      }
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
    await supabase.from('matches').insert([{ season_id: selectedSeasonId, home_manager_id: homeTeamId, away_manager_id: awayTeamId, home_goals: homeGoals, away_goals: awayGoals }]);
    setHomeGoals(0); setAwayGoals(0); setHomeTeamId(''); setAwayTeamId(''); setPassword(''); 
  };

  const submitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTotal) return alert("Select a specific season!");
    if (!isAdmin && password !== "1") return alert("Incorrect admin password!");
    if (!playerName || !acquiringManagerId || transferFee === '') return alert("Fill all details!");
    await supabase.from('transfers').insert([{ season_id: selectedSeasonId, manager_id: acquiringManagerId, player_name: playerName, transfer_fee: transferFee }]);
    setPlayerName(''); setAcquiringManagerId(''); setTransferFee(''); setPassword('');
  };

  const deleteTransfer = async (tId: string) => { if (isAdmin && window.confirm("Remove transfer?")) await supabase.from('transfers').delete().eq('id', tId); };

  const listAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTotal) return alert("Select a specific season!");
    if (!isAdmin && password !== "1") return alert("Incorrect password!");
    if (!auctionPlayerName) return alert("Enter a player name!");
    await supabase.from('auctions').insert([{ season_id: selectedSeasonId, player_name: auctionPlayerName, current_bid: auctionStartBid || 0, status: 'pending' }]);
    setAuctionPlayerName(''); setAuctionStartBid(''); setPassword('');
  };

  const startAuctionTimer = async (aId: string) => {
    if (!isAdmin && password !== "1" && window.prompt("Admin Password:") !== "1") return alert("Incorrect password.");
    await supabase.from('auctions').update({ status: 'active', end_time: new Date(Date.now() + 30000).toISOString() }).eq('id', aId);
  };

  const placeBid = async (aId: string, currentBid: number, currentEndTime: string) => {
    const bidValue = bidInputs[aId];
    if (!bidValue || bidValue <= currentBid) return alert("Bid must be higher than current bid!");
    await supabase.from('auctions').update({ current_bid: bidValue, highest_bidder_id: myManagerId, end_time: new Date(new Date(currentEndTime).getTime() + 10000).toISOString() }).eq('id', aId);
    setBidInputs({ ...bidInputs, [aId]: '' as any });
  };

  const archiveAuction = async (aId: string) => {
    if (!isAdmin && password !== "1" && window.prompt("Admin Password:") !== "1") return alert("Incorrect password.");
    await supabase.from('auctions').update({ status: 'archived' }).eq('id', aId);
  };

  const submitNomination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTotal) return alert("Select a specific season!");
    if (!nominationName) return;
    if (currentSeasonNominations.filter(n => n.manager_id === myManagerId).length >= 2) return alert("Max 2 nominations per season!");
    await supabase.from('award_nominations').insert([{ season_id: selectedSeasonId, manager_id: myManagerId, player_name: nominationName }]);
    setNominationName('');
  };

  const castVote = async (nom: any) => {
    if (nom.manager_id === myManagerId) return alert("Cannot vote for your own nomination!");
    if (votes.find(v => v.voter_id === myManagerId && v.season_id === nom.season_id)) return alert("Already voted this season!");
    await supabase.from('award_votes').insert([{ nomination_id: nom.id, voter_id: myManagerId, season_id: nom.season_id }]);
  };

  const deleteNomination = async (nId: string) => { if (isAdmin && window.confirm("Remove nomination?")) await supabase.from('award_nominations').delete().eq('id', nId); };

  // --- SQUAD BUILDER LOGIC ---
  const handlePositionClick = (mId: string, pos: string) => { if (mId !== myManagerId) return; setActiveLineupPosition(pos); setIsLineupModalOpen(true); };
  const saveSquadPlayer = async (name: string) => {
    const fn = name.trim(); if (!fn) return;
    await supabase.from('lineups').delete().match({ manager_id: myManagerId, position: activeLineupPosition });
    await supabase.from('lineups').insert([{ manager_id: myManagerId, position: activeLineupPosition, player_name: fn }]);
    setIsLineupModalOpen(false); setCustomPlayerName('');
  };
  const clearSquadPlayer = async () => { await supabase.from('lineups').delete().match({ manager_id: myManagerId, position: activeLineupPosition }); setIsLineupModalOpen(false); };
  const changeFormation = async (newForm: string) => {
    await supabase.from('lineups').delete().match({ manager_id: myManagerId, position: 'FORMATION' });
    await supabase.from('lineups').insert([{ manager_id: myManagerId, position: 'FORMATION', player_name: newForm }]);
  };
  const mySignedPlayers = Array.from(new Set(transfers.filter(t => t.manager_id === myManagerId && t.transfer_fee < 0).map(t => t.player_name)));
  
  const renderPitchPlayer = (manager: any, pos: string) => {
    const isMine = manager.id === myManagerId;
    const lineupEntry = lineups.find(l => l.manager_id === manager.id && l.position === pos);
    const hasPlayer = !!lineupEntry;
    const cardBg = hasPlayer ? "bg-gradient-to-br from-yellow-100 via-yellow-300 to-yellow-500 border border-yellow-400" : "bg-white/80 border border-gray-300 border-dashed backdrop-blur-sm";
    return (
      <div key={pos} onClick={() => handlePositionClick(manager.id, pos)} className={`relative flex flex-col items-center justify-start w-[50px] h-[72px] sm:w-[60px] sm:h-[84px] ${cardBg} rounded-t-sm rounded-b-lg shadow-md ${isMine ? 'cursor-pointer hover:scale-110 hover:z-20 transition-transform group' : ''}`}>
        <div className={`absolute top-0.5 left-1 text-[8px] sm:text-[10px] font-black ${hasPlayer ? 'text-yellow-900' : 'text-gray-400'}`}>{pos}</div>
        <div className="mt-3 sm:mt-4 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">{hasPlayer ? (<span className="text-xl sm:text-2xl drop-shadow-sm">👤</span>) : (<span className="text-gray-400 text-sm font-black">+</span>)}</div>
        {hasPlayer && (<div className="absolute bottom-1 w-full text-center px-0.5"><span className="text-[8px] sm:text-[9px] font-black text-yellow-900 leading-tight uppercase truncate block drop-shadow-sm">{lineupEntry.player_name}</span></div>)}
        {!hasPlayer && isMine && (<div className="absolute inset-0 bg-blue-600/80 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[10px] font-black text-white uppercase tracking-widest">Add</span></div>)}
      </div>
    );
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-10 text-center text-gray-500 font-bold animate-pulse">Loading the pitch...</div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-gray-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
          <div className="text-center mb-8"><h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">The Super League</h1><p className="mt-2 text-gray-500 font-medium">Please sign in to continue</p></div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Who are you?</label><select className="w-full p-4 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer shadow-sm" value={loginManagerId} onChange={(e) => setLoginManagerId(e.target.value)}><option value="">Select Manager...</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Password</label><input type="password" placeholder="Enter password" className="w-full p-4 bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} /></div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-md transition-all active:scale-95 text-lg uppercase tracking-wider">Enter Locker Room</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 font-sans overflow-x-hidden relative pb-24 md:pb-8">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes popInOut { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } } 
        .animate-pop { animation: popInOut 1s ease-in-out infinite; }
        @keyframes marquee { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
        .animate-marquee { animation: marquee 35s linear infinite; display: inline-block; white-space: nowrap; }
        .custom-scrollbar::-webkit-scrollbar { display: none; } .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* SQUAD BUILDER MODAL */}
      {isLineupModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-gray-100 relative animate-in zoom-in-95 duration-200">
              <h2 className="text-2xl font-black mb-2 text-gray-900">Assign {activeLineupPosition}</h2>
              <p className="text-sm font-bold text-gray-500 mb-6">Select a player from your squad or type a name.</p>
              <div className="space-y-6">
                 <div>
                    <label className="text-xs font-black uppercase text-gray-400 tracking-widest mb-2 block">Custom Input</label>
                    <form onSubmit={(e) => { e.preventDefault(); saveSquadPlayer(customPlayerName); }} className="flex gap-2">
                       <input type="text" placeholder="Enter player name..." className="flex-1 p-3 bg-white border border-gray-200 text-gray-900 rounded-xl font-bold outline-none focus:border-blue-500 transition-colors" value={customPlayerName} onChange={(e) => setCustomPlayerName(e.target.value)} autoFocus />
                       <button type="submit" disabled={!customPlayerName.trim()} className="bg-blue-600 disabled:bg-blue-300 text-white px-6 rounded-xl font-black hover:bg-blue-700 transition-colors shadow-md">SAVE</button>
                    </form>
                 </div>
                 {mySignedPlayers.length > 0 && (
                   <div>
                      <label className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3 block border-t border-gray-100 pt-4">Your Transfers</label>
                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                         {mySignedPlayers.map(pName => <button key={pName} onClick={() => saveSquadPlayer(pName)} className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm">{pName}</button>)}
                      </div>
                   </div>
                 )}
              </div>
              <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-100">
                 <button onClick={clearSquadPlayer} className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors">Clear Position</button>
                 <button onClick={() => setIsLineupModalOpen(false)} className="text-sm font-black text-gray-400 hover:text-gray-800 transition-colors uppercase tracking-widest">Cancel</button>
              </div>
           </div>
        </div>
      )}

      {/* Breaking News Ticker */}
      <div className="w-full bg-red-600 text-white overflow-hidden py-2 border-b-4 border-red-700 shadow-md relative z-10 flex items-center">
        <div className="bg-red-700 font-black px-4 py-2 absolute left-0 z-20 h-full flex items-center shadow-lg uppercase tracking-widest text-sm">🚨 Latest</div>
        <div className="w-full pl-28"><span className="animate-marquee font-bold tracking-wider">{shuffledTicker || "Welcome to The Super League..."}</span></div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-8">
        <div className="text-center py-4">
          <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 drop-shadow-sm">The Super League</h1>
          <p className="mt-2 text-gray-500 font-medium">Official Tracker, Auctions & Awards</p>
          {isAdmin && <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-3 border border-blue-200 inline-block px-3 py-1 rounded-full bg-blue-50">Commissioner Access</p>}
        </div>
        
        {/* Nav & Controls */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="hidden md:flex bg-gray-100 p-1.5 rounded-xl w-auto overflow-x-auto border border-gray-200 shadow-inner gap-1">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`min-w-[90px] py-2.5 px-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}>
                {tab.id === 'ebay' ? <img src="https://upload.wikimedia.org/wikipedia/commons/1/1b/EBay_logo.svg" alt="eBay" className="h-4 w-auto object-contain" /> : <span>{tab.icon}</span>}
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl shadow-sm"><span className="text-xl">👤</span><span className="text-blue-900 font-black tracking-wide">{managers.find(m => m.id === myManagerId)?.name}</span></div>
            <div className="flex items-center gap-2">
              <label className="text-gray-500 uppercase tracking-wide text-xs font-bold whitespace-nowrap">Season:</label>
              <select className="p-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl font-bold text-sm outline-none shadow-sm focus:border-blue-500 transition-colors cursor-pointer" value={selectedSeasonId} onChange={(e) => setSelectedSeasonId(e.target.value)}><option value="all">🌍 TOTAL (ALL TIME)</option>{seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </div>
          </div>
        </div>

        {/* ======================= TRANSFER MARKET TAB (NEW) ======================= */}
        {activeTab === 'transfer_market' && (
           <div className="space-y-6 animate-in fade-in duration-300">
             <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">📊 Global Transfer Market</h2>
                    <p className="text-sm font-bold text-gray-500 mt-1">Scout players. 2 managers interested = Instant Auction.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <button onClick={() => setShowOnlyShortlist(!showOnlyShortlist)} className={`px-4 py-3 rounded-xl font-black text-sm border shadow-sm transition-all flex items-center gap-2 ${showOnlyShortlist ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                      {showOnlyShortlist ? '📌 My Shortlist' : '📌 Show Shortlist'}
                    </button>
                    <input type="text" placeholder="Search player or club..." className="p-3 bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-xl text-sm outline-none focus:border-blue-500 w-full sm:w-auto" value={marketSearchQuery} onChange={(e) => setMarketSearchQuery(e.target.value)} />
                    <select className="p-3 bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-xl text-sm outline-none cursor-pointer focus:border-blue-500 w-full sm:w-auto" value={marketPositionFilter} onChange={(e) => setMarketPositionFilter(e.target.value)}>
                      <option value="All">All Positions</option>
                      <option value="Centre-Forward">Centre-Forward</option>
                      <option value="Left Winger">Left Winger</option>
                      <option value="Right Winger">Right Winger</option>
                      <option value="Attacking Midfield">Attacking Midfield</option>
                      <option value="Central Midfield">Central Midfield</option>
                      <option value="Defensive Midfield">Defensive Midfield</option>
                      <option value="Centre-Back">Centre-Back</option>
                      <option value="Left-Back">Left-Back</option>
                      <option value="Right-Back">Right-Back</option>
                      <option value="Goalkeeper">Goalkeeper</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-[10px] uppercase tracking-widest font-black">
                        <th className="p-4">Player</th>
                        <th className="p-4">Position</th>
                        <th className="p-4 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('age')}>Age {marketSort.key === 'age' && (marketSort.dir === 'asc' ? '▲' : '▼')}</th>
                        <th className="p-4">Club / League</th>
                        <th className="p-4 text-right cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('value')}>Value {marketSort.key === 'value' && (marketSort.dir === 'asc' ? '▲' : '▼')}</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayedMarketPlayers.length > 0 ? (
                        displayedMarketPlayers.map((player) => {
                          const isShortlisted = shortlists.some(s => s.player_id === player.id && s.manager_id === myManagerId);
                          const isInterested = interests.some(i => i.player_id === player.id && i.manager_id === myManagerId);
                          const playerInterests = interests.filter(i => i.player_id === player.id);
                          const isWonderkid = player.age <= 21 && player.market_value_gbp <= 20000000;

                          return (
                          <tr key={player.id} className="hover:bg-blue-50/50 transition-colors group">
                            <td className="p-4">
                              <div className="font-black text-gray-900">{player.player_name}</div>
                              {isWonderkid && <span className="bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex inline-block mt-1 w-fit">✨ Wonderkid</span>}
                            </td>
                            <td className="p-4"><span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg text-xs font-black tracking-wide">{player.position}</span></td>
                            <td className="p-4 font-bold text-gray-500">{player.age}</td>
                            <td className="p-4"><div className="font-black text-gray-800">{player.club}</div><div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{player.league}</div></td>
                            <td className="p-4 text-right font-black text-gray-900 text-lg">{player.market_value_display}</td>
                            <td className="p-4 flex justify-center items-center gap-2 h-full min-h-[60px]">
                              {/* Action Buttons */}
                              <button onClick={() => toggleShortlist(player.id)} title="Add to Private Shortlist" className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isShortlisted ? 'bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-inner' : 'text-gray-300 hover:bg-gray-100 hover:text-gray-600'}`}>
                                {isShortlisted ? '📌' : '📍'}
                              </button>
                              <button onClick={() => declareInterest(player)} title="Publicly Scout Player" className={`px-3 py-1.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all shadow-sm border ${isInterested ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-500 hover:bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                                {isInterested ? '👀 Scouting' : '👀 Scout'}
                              </button>
                              
                              {/* Show badges of interested managers */}
                              {playerInterests.length > 0 && (
                                <div className="flex -space-x-2 ml-2">
                                  {playerInterests.map(pi => {
                                     const mName = managers.find(m => m.id === pi.manager_id)?.name;
                                     if (!mName || !CLUB_LOGOS[mName]) return null;
                                     return <img key={pi.id} src={CLUB_LOGOS[mName]} alt={mName} className="w-5 h-5 rounded-full border border-gray-200 bg-white object-contain p-0.5" title={`${mName} is interested!`} />;
                                  })}
                                </div>
                              )}
                            </td>
                          </tr>
                        )})
                      ) : (
                        <tr><td colSpan={6} className="p-12 text-center text-gray-400 font-bold border-2 border-dashed border-gray-200 rounded-2xl">No players found matching your search.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
             </div>
           </div>
        )}

        {/* ======================= LEAGUE TAB ======================= */}
        {activeTab === 'league' && (
           <div className="space-y-6 animate-in fade-in duration-300">
             <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200 overflow-x-auto">
               <h2 className="text-2xl font-black mb-6 text-gray-900 flex items-center gap-2">🏆 {isTotal ? 'All-Time Leaderboard' : 'League Standings'}</h2>
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-gray-50 border-y border-gray-200 text-gray-500 text-xs uppercase tracking-widest">
                     <th className="p-4 font-black rounded-tl-lg">Manager</th>
                     <th className="p-4 font-black">P</th><th className="p-4 font-black">W</th><th className="p-4 font-black">D</th><th className="p-4 font-black">L</th>
                     <th className="p-4 font-black">Form</th><th className="p-4 font-black">GD</th><th className="p-4 font-black text-blue-600 rounded-tr-lg">Pts</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {leagueTable.map((row, index) => (
                     <tr key={row.id} className="hover:bg-blue-50/50 transition-colors">
                       <td className="p-4 flex items-center gap-3">
                         <span className="text-gray-400 font-bold text-sm w-4">{index + 1}</span>
                         {CLUB_LOGOS[row.name] && <img src={CLUB_LOGOS[row.name]} alt={`${row.name} club badge`} className="w-6 h-6 object-contain drop-shadow-sm" />}
                         <span className="font-black text-gray-900 text-lg">{row.name}</span>
                       </td>
                       <td className="p-4 text-gray-600 font-medium">{row.p}</td><td className="p-4 text-gray-600 font-medium">{row.w}</td><td className="p-4 text-gray-600 font-medium">{row.d}</td><td className="p-4 text-gray-600 font-medium">{row.l}</td>
                       <td className="p-4 flex gap-1.5 items-center h-full min-h-[60px]">{row.form.length > 0 ? row.form.map((f: string, i: number) => ( <span key={i} className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black text-white shadow-sm ${f === 'W' ? 'bg-green-500' : f === 'D' ? 'bg-gray-400' : 'bg-red-500'}`}>{f}</span> )) : <span className="text-gray-300 font-black">-</span>}</td>
                       <td className="p-4 text-gray-700 font-bold">{row.gd > 0 ? `+${row.gd}` : row.gd}</td><td className="p-4 font-black text-blue-600 text-xl">{row.pts}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
 
             {!isTotal && (
               <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200">
                  <h2 className="text-2xl font-black mb-6 text-gray-900 flex items-center gap-2">⚽ Log Match Result</h2>
                  <form onSubmit={submitMatch} className="flex flex-col space-y-6">
                     <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex flex-col w-full md:w-2/5">
                           <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Home Team</label>
                           <select className="p-3.5 bg-white border border-gray-300 text-gray-900 rounded-xl outline-none focus:border-blue-500 transition-colors" value={homeTeamId} onChange={(e) => setHomeTeamId(e.target.value)}><option value="">Select Manager...</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-1/5 justify-center">
                           <input type="number" min="0" className="w-16 p-3 bg-white border border-gray-300 text-gray-900 text-center text-2xl font-black rounded-xl focus:border-blue-500 outline-none" value={homeGoals} onChange={(e) => setHomeGoals(parseInt(e.target.value) || 0)} />
                           <span className="font-black text-gray-400 text-xl">-</span>
                           <input type="number" min="0" className="w-16 p-3 bg-white border border-gray-300 text-gray-900 text-center text-2xl font-black rounded-xl focus:border-blue-500 outline-none" value={awayGoals} onChange={(e) => setAwayGoals(parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="flex flex-col w-full md:w-2/5">
                           <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Away Team</label>
                           <select className="p-3.5 bg-white border border-gray-300 text-gray-900 rounded-xl outline-none focus:border-blue-500 transition-colors" value={awayTeamId} onChange={(e) => setAwayTeamId(e.target.value)}><option value="">Select Manager...</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                        </div>
                     </div>
                     <div className="flex flex-col md:flex-row gap-4 items-end pt-2">
                       {!isAdmin && ( <div className="flex flex-col w-full md:w-1/3"><label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Admin Password</label><input type="password" placeholder="••••••••" className="p-3.5 bg-white border border-gray-300 text-gray-900 rounded-xl w-full outline-none focus:border-blue-500" value={password} onChange={(e) => setPassword(e.target.value)} /></div> )}
                       <button type="submit" className={`w-full ${isAdmin ? '' : 'md:w-2/3'} bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-md transition-all`}>Submit Final Score</button>
                     </div>
                  </form>
               </div>
             )}
           </div>
         )}

        {/* ======================= PROFILES TAB ======================= */}
        {activeTab === 'profiles' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {managerProfiles.map(profile => {
                const isMyProfile = profile.id === myManagerId;
                const formationEntry = lineups.find(l => l.manager_id === profile.id && l.position === 'FORMATION');
                const currentFormation = formationEntry ? formationEntry.player_name : '4-3-3';
                const formationRows = FORMATIONS[currentFormation] || FORMATIONS['4-3-3'];
                
                return (
                <div key={profile.id} className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden relative">
                   <div className="bg-gray-100 h-32 absolute top-0 left-0 right-0 z-0 border-b border-gray-200"></div>
                   <div className="p-6 relative z-10">
                     <div className="flex justify-between items-end mb-8 mt-4">
                        <div className="flex items-center gap-5">
                           {CLUB_LOGOS[profile.name] ? (
                             <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-lg border-4 border-gray-50 relative overflow-hidden p-2"><img src={CLUB_LOGOS[profile.name]} alt={`${profile.name} Club`} className="w-full h-full object-contain" /></div>
                           ) : (
                             <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white text-5xl shadow-lg font-black border-4 border-white relative">{profile.name.charAt(0)}</div>
                           )}
                           <div><h2 className="text-4xl font-black text-gray-900 drop-shadow-sm">{profile.name}</h2><p className="text-xs font-black text-gray-500 uppercase tracking-widest mt-1">Club Manager</p></div>
                        </div>
                     </div>
                     <div className="grid grid-cols-3 gap-3 mb-8">
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center shadow-sm"><p className="text-3xl font-black text-blue-600">{profile.winPct}%</p><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Win Rate</p></div>
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center shadow-sm"><p className="text-3xl font-black text-gray-800">{profile.w}</p><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Wins</p></div>
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center shadow-sm"><p className="text-3xl font-black text-gray-800">{profile.p}</p><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Matches</p></div>
                     </div>
                     <div className="mt-8 mb-8">
                        <div className="flex justify-between items-center mb-4 px-2">
                          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2"><span>📋</span> Starting XI</h3>
                          {isMyProfile ? (
                            <div className="flex items-center gap-2">
                               <select className="text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1.5 rounded outline-none cursor-pointer uppercase shadow-sm" value={currentFormation} onChange={(e) => changeFormation(e.target.value)}>{Object.keys(FORMATIONS).map(f => <option key={f} value={f}>{f}</option>)}</select>
                               <span className="text-[10px] font-black bg-blue-100 text-blue-600 border border-blue-200 px-2 py-1 rounded uppercase tracking-wider animate-pulse hidden sm:inline-block">Tap to edit</span>
                            </div>
                          ) : (<span className="text-[10px] font-black bg-gray-100 text-gray-500 border border-gray-200 px-3 py-1 rounded uppercase tracking-wider">{currentFormation}</span>)}
                        </div>
                        <div className="relative w-full aspect-[3/4] max-w-sm mx-auto bg-green-600 rounded-xl border-4 border-white shadow-[inset_0_0_20px_rgba(0,0,0,0.3)] overflow-hidden">
                           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                           <div className="absolute top-0 left-1/4 right-1/4 h-1/6 border-x-2 border-b-2 border-white/40"></div><div className="absolute top-0 left-[35%] right-[35%] h-[8%] border-x-2 border-b-2 border-white/40"></div><div className="absolute bottom-0 left-1/4 right-1/4 h-1/6 border-x-2 border-t-2 border-white/40"></div><div className="absolute bottom-0 left-[35%] right-[35%] h-[8%] border-x-2 border-t-2 border-white/40"></div><div className="absolute top-1/2 left-0 right-0 border-t-2 border-white/40"></div><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/40 rounded-full"></div>
                           <div className="absolute inset-0 flex flex-col justify-between py-6 z-10">{formationRows.map((row, rowIndex) => <div key={rowIndex} className={`flex justify-evenly px-2 w-full ${row.length >= 5 ? 'gap-0.5' : ''}`}>{row.map(pos => renderPitchPlayer(profile, pos))}</div>)}</div>
                        </div>
                     </div>
                     <div className="border-t border-gray-100 pt-6">
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Trophy Cabinet</h3>
                        <div className="flex flex-wrap gap-3">
                          {profile.achievements.length > 0 ? profile.achievements.map((ach: any, i: number) => <div key={i} className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-xl shadow-sm" title={ach.desc}><span className="text-xl">{ach.icon}</span><span className="text-xs font-black text-yellow-700 uppercase tracking-wide">{ach.title}</span></div>) : <div className="text-xs font-bold text-gray-400 italic">No achievements unlocked yet.</div>}
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
                  <div key={mb.id} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-center items-center text-center">
                     <h4 className="text-gray-500 font-black uppercase tracking-widest text-[10px] mb-2">{mb.name}&apos;s Net</h4>
                     <p className={`text-2xl lg:text-3xl font-black ${mb.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>{mb.net >= 0 ? '+' : ''}£{mb.net}M</p>
                  </div>
               ))}
            </div>

            {!isTotal && (
               <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200">
                  <h2 className="text-2xl font-black mb-6 text-gray-900 flex items-center gap-2">📝 Log Transfer</h2>
                  <form onSubmit={submitTransfer} className="flex flex-col space-y-6">
                     <div className="flex flex-col md:flex-row gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex flex-col w-full md:w-1/3"><label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Player Name</label><input type="text" className="p-3.5 bg-white border border-gray-300 text-gray-900 rounded-xl outline-none focus:border-blue-500" value={playerName} onChange={(e) => setPlayerName(e.target.value)} /></div>
                        <div className="flex flex-col w-full md:w-1/3"><label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Manager</label><select className="p-3.5 bg-white border border-gray-300 text-gray-900 rounded-xl outline-none focus:border-blue-500" value={acquiringManagerId} onChange={(e) => setAcquiringManagerId(e.target.value)}><option value="">Select Manager...</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                        <div className="flex flex-col w-full md:w-1/3"><label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Fee (Use - for Money Spent)</label><div className="relative"><span className="absolute left-4 top-3.5 text-gray-400 font-black">£</span><input type="number" step="0.1" className="p-3.5 pl-9 bg-white border border-gray-300 text-gray-900 rounded-xl w-full outline-none focus:border-blue-500" value={transferFee} onChange={(e) => setTransferFee(e.target.value === '' ? '' : parseFloat(e.target.value))} /><span className="absolute right-4 top-3.5 text-gray-400 font-black">M</span></div></div>
                     </div>
                     <div className="flex flex-col md:flex-row gap-4 items-end pt-2">
                       {!isAdmin && ( <div className="flex flex-col w-full md:w-1/3"><label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Admin Password</label><input type="password" placeholder="••••••••" className="p-3.5 bg-white border border-gray-300 text-gray-900 rounded-xl w-full outline-none" value={password} onChange={(e) => setPassword(e.target.value)} /></div> )}
                       <button type="submit" className={`w-full ${isAdmin ? '' : 'md:w-2/3'} bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl shadow-md transition-all`}>Confirm Transfer</button>
                     </div>
                  </form>
               </div>
            )}

            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-black text-gray-900">🔄 Transfer Activity {isTotal && '(All Time)'}</h2>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <select className="p-3 bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-xl text-sm outline-none cursor-pointer w-full sm:w-auto focus:border-blue-500" value={transferManagerFilter} onChange={(e) => setTransferManagerFilter(e.target.value)}><option value="all">👥 All Managers</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                  <select className="p-3 bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-xl text-sm outline-none cursor-pointer w-full sm:w-auto focus:border-blue-500" value={transferTypeFilter} onChange={(e) => setTransferTypeFilter(e.target.value)}><option value="all">💸 All Types</option><option value="in">📥 Signed (Money Out)</option><option value="out">📤 Sold (Money In)</option></select>
                </div>
              </div>
              <div className="grid gap-4">
                {displayedTransfers.length > 0 ? (
                  displayedTransfers.slice().reverse().map((transfer) => (
                    <div key={transfer.id} className="bg-white border border-gray-200 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-center shadow-sm hover:border-blue-300 transition-colors">
                      <div className="flex items-center gap-4 w-full md:w-1/3"><div className="bg-blue-50 text-blue-600 p-3 rounded-full text-xl border border-blue-100">👤</div><span className="font-black text-gray-900 text-lg">{transfer.player_name}</span></div>
                      <div className="flex items-center gap-2 w-full md:w-1/3 justify-center text-gray-500 font-bold my-4 md:my-0 text-sm uppercase tracking-wider">{transfer.transfer_fee < 0 ? 'Signed by ' : 'Sold by '}<span className="font-black text-gray-900">{transfer.manager?.name}</span></div>
                      <div className="w-full md:w-1/3 flex flex-col items-center md:items-end justify-center gap-2"><span className={`border px-5 py-2.5 rounded-full font-black tracking-widest text-sm shadow-sm ${transfer.transfer_fee >= 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>{transfer.transfer_fee > 0 ? '+' : ''}£{transfer.transfer_fee}M</span>{isAdmin && (<button onClick={() => deleteTransfer(transfer.id)} className="text-[10px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors mt-1">Admin: Remove</button>)}</div>
                    </div>
                  ))
                ) : <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300"><p className="text-gray-500 font-bold text-lg">No transfers found.</p></div>}
              </div>
            </div>
          </div>
        )}

        {/* ======================= eBay TAB ======================= */}
        {activeTab === 'ebay' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-gray-900 border border-gray-800 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 to-gray-900 opacity-50 mix-blend-overlay"></div>
               <div className="z-10 flex items-center gap-3">
                 <div className="h-4 w-4 bg-red-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div>
                 <h2 className="text-2xl font-black tracking-widest uppercase flex items-center gap-3">Live Auction House<img src="https://upload.wikimedia.org/wikipedia/commons/1/1b/EBay_logo.svg" alt="eBay" className="h-8 w-auto object-contain bg-white/90 px-3 py-1 rounded-xl shadow-sm" /></h2>
               </div>
               <div className="z-10 font-mono text-xl font-bold bg-gray-950 px-6 py-2.5 rounded-xl border border-gray-700 shadow-inner text-cyan-400">UK: {ukTime}</div>
            </div>
            {!isTotal && (
               <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                  <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">Admin: List Player</h3>
                  <form onSubmit={listAuction} className="flex flex-col md:flex-row items-end gap-4">
                     <div className={`w-full ${isAdmin ? 'md:w-1/2' : 'md:w-1/3'}`}><label className="text-xs font-black text-gray-500 tracking-widest mb-2 block uppercase">Player Name</label><input type="text" className="w-full p-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl outline-none focus:border-blue-500" value={auctionPlayerName} onChange={e => setAuctionPlayerName(e.target.value)} /></div>
                     <div className={`w-full ${isAdmin ? 'md:w-1/2' : 'md:w-1/4'}`}><label className="text-xs font-black text-gray-500 tracking-widest mb-2 block uppercase">Starting Bid (£M)</label><input type="number" step="0.1" className="w-full p-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl outline-none focus:border-blue-500" value={auctionStartBid} onChange={e => setAuctionStartBid(e.target.value === '' ? '' : parseFloat(e.target.value))} /></div>
                     {!isAdmin && (<div className="w-full md:w-1/4"><label className="text-xs font-black text-gray-500 tracking-widest mb-2 block uppercase">Password</label><input type="password" placeholder="••••••••" className="w-full p-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl outline-none" value={password} onChange={e => setPassword(e.target.value)} /></div>)}
                     <button type="submit" className="w-full md:w-auto bg-gray-900 text-white px-8 py-3.5 rounded-xl font-black hover:bg-gray-800 transition-colors">LIST</button>
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
                 if (isPending) cardStyle += "bg-white border-yellow-400 shadow-sm"; else if (isActive && !isUrgent) cardStyle += "bg-white border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.2)]"; else if (isUrgent) cardStyle += "bg-white border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.3)] animate-pop"; else if (isFinished) cardStyle += "bg-white border-green-500 shadow-sm";
                 return (
                 <div key={auction.id} className={cardStyle}>
                    <div className="flex justify-between items-start mb-6">
                       <h3 className="text-3xl font-black text-gray-900">{auction.player_name}</h3>
                       {isPending && <span className="bg-yellow-50 text-yellow-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-yellow-200">Waiting</span>}
                       {isActive && <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${isUrgent ? 'bg-red-600 text-white border-red-500' : 'bg-blue-100 text-blue-600 border-blue-200 animate-pulse'} flex items-center gap-1`}>LIVE ⏳ {timeLeft}s</span>}
                       {isFinished && <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-green-200">SOLD 🎉</span>}
                    </div>
                    <div className={`rounded-2xl p-5 border mb-6 flex justify-between items-center shadow-sm ${isFinished ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                       <div><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{isFinished ? 'Winning Bid' : 'Current Highest Bid'}</p><p className={`text-4xl font-black ${isFinished ? 'text-green-600' : 'text-blue-600'}`}>£{auction.current_bid}M</p></div>
                       <div className="text-right"><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{isFinished ? 'Won By' : 'Held By'}</p><p className="text-lg font-black text-gray-900">{auction.highest_bidder?.name || 'No bids yet'}</p></div>
                    </div>
                    {isPending && <button onClick={() => startAuctionTimer(auction.id)} className="w-full bg-yellow-400 text-yellow-900 px-6 py-4 rounded-xl font-black hover:bg-yellow-500 transition-colors uppercase tracking-wider text-sm">Admin: Start 30s Timer</button>}
                    {isActive && (<div className="flex gap-3"><input type="number" step="0.1" placeholder={`> ${auction.current_bid}`} className="flex-1 p-3.5 bg-white border-2 border-gray-200 text-gray-900 rounded-xl font-black text-lg outline-none focus:border-blue-500" value={bidInputs[auction.id] || ''} onChange={(e) => setBidInputs({...bidInputs, [auction.id]: parseFloat(e.target.value)})} /><button onClick={() => placeBid(auction.id, auction.current_bid, auction.end_time)} className="bg-blue-600 text-white px-10 rounded-xl font-black text-lg hover:bg-blue-700 active:scale-95 transition-transform shadow-md">BID</button></div>)}
                    {(isFinished || isPending) && <button onClick={() => archiveAuction(auction.id)} className="w-full mt-6 text-[10px] font-black text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest">Admin: Clear / Hide Auction</button>}
                 </div>
              )})}
            </div>
          </div>
        )}

        {/* ======================= HALL OF FAME TAB ======================= */}
        {activeTab === 'hof' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-yellow-50 border-2 border-yellow-400 text-yellow-900 p-8 rounded-3xl shadow-sm text-center relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent"></div>
               <h2 className="text-4xl font-black tracking-widest uppercase mb-3 relative z-10">🏛️ The Hall of Fame</h2>
               <p className="font-bold relative z-10">Permanent records from across all seasons.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border-2 border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-md relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 text-9xl opacity-5 group-hover:scale-110 transition-transform duration-500">💰</div><h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Most Expensive Transfer</h3>
                {hof.mostExpensiveTransfer ? (<><p className="text-4xl font-black text-gray-900 mb-2">{hof.mostExpensiveTransfer.player_name}</p><p className="text-5xl font-black text-blue-600 mb-6 drop-shadow-sm">£{hof.mostExpensiveTransfer.absFee}M</p><div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex justify-between items-center"><span className="font-black text-gray-700">{hof.mostExpensiveTransfer.manager?.name}</span><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{hof.mostExpensiveTransfer.seasonName}</span></div></>) : <p className="text-gray-400 font-bold py-8">No transfers logged yet.</p>}
              </div>
              <div className="bg-white border-2 border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-md relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 text-9xl opacity-5 group-hover:scale-110 transition-transform duration-500">👑</div><h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">The Invincible Season</h3>
                {hof.maxPointsRecord && hof.maxPointsRecord.points > 0 ? (<><p className="text-4xl font-black text-gray-900 mb-2">{hof.maxPointsRecord.managerName}</p><p className="text-5xl font-black text-yellow-500 mb-6 drop-shadow-sm">{hof.maxPointsRecord.points} PTS</p><div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex justify-center items-center"><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{hof.maxPointsRecord.seasonName}</span></div></>) : <p className="text-gray-400 font-bold py-8">No completed matches yet.</p>}
              </div>
              <div className="bg-white border-2 border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-md relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 text-9xl opacity-5 group-hover:scale-110 transition-transform duration-500">🥊</div><h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Biggest Demolition</h3>
                {hof.biggestDemolition ? (<><div className="flex justify-between items-center my-6"><p className={`text-2xl font-black ${hof.biggestDemolition.home_goals > hof.biggestDemolition.away_goals ? 'text-gray-900' : 'text-gray-400'}`}>{hof.biggestDemolition.home?.name}</p><p className="text-4xl font-black text-red-600 bg-red-50 px-5 py-2 rounded-2xl border border-red-200">{hof.biggestDemolition.home_goals} - {hof.biggestDemolition.away_goals}</p><p className={`text-2xl font-black ${hof.biggestDemolition.away_goals > hof.biggestDemolition.home_goals ? 'text-gray-900' : 'text-gray-400'}`}>{hof.biggestDemolition.away?.name}</p></div><div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex justify-center items-center mt-4"><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{hof.biggestDemolition.seasonName}</span></div></>) : <p className="text-gray-400 font-bold py-8">No matches logged yet.</p>}
              </div>
              <div className="bg-white border-2 border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-md relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 text-9xl opacity-5 group-hover:scale-110 transition-transform duration-500">🎇</div><h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Highest Scoring Match</h3>
                {hof.highestScoringGame ? (<><div className="flex justify-between items-center my-6"><p className="text-2xl font-black text-gray-900">{hof.highestScoringGame.home?.name}</p><div className="text-center"><p className="text-4xl font-black text-indigo-600 bg-indigo-50 px-5 py-2 rounded-2xl border border-indigo-200 mb-2">{hof.highestScoringGame.home_goals} - {hof.highestScoringGame.away_goals}</p><p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{hof.highestScoringGame.totalGoals} Goals</p></div><p className="text-2xl font-black text-gray-900">{hof.highestScoringGame.away?.name}</p></div><div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex justify-center items-center mt-4"><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{hof.highestScoringGame.seasonName}</span></div></>) : <p className="text-gray-400 font-bold py-8">No matches logged yet.</p>}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MOBILE BOTTOM NAVIGATION (Fixed) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 flex justify-around items-center px-1 py-2 z-50 overflow-x-auto safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        {TABS.map(tab => (
           <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center w-[70px] min-w-[70px] py-1 gap-1 transition-all rounded-xl ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>
             {tab.id === 'ebay' ? <img src="https://upload.wikimedia.org/wikipedia/commons/1/1b/EBay_logo.svg" alt="eBay" className="h-6 w-auto object-contain mb-0.5" /> : <span className="text-xl mb-0.5">{tab.icon}</span>}
             <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
             <div className={`h-1 w-1 rounded-full mt-0.5 ${activeTab === tab.id ? 'bg-blue-600' : 'bg-transparent'}`}></div>
           </button>
        ))}
      </div>
    </div>
  );
}