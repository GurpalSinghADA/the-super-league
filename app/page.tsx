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

    const achievements: {icon: