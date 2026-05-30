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
  const [loading, setLoading] = useState(true);
  
  // App States
  const [activeTab, setActiveTab] = useState<'league' | 'transfers' | 'ebay' | 'awards' | 'profiles' | 'h2h'>('league');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('all');
  const [myManagerId, setMyManagerId] = useState(''); 
  const [password, setPassword] = useState(''); 
  
  // Transfer Filter States
  const [transferManagerFilter, setTransferManagerFilter] = useState<string>('all');
  const [transferTypeFilter, setTransferTypeFilter] = useState<string>('all');

  // H2H States
  const [h2hManagerA, setH2hManagerA] = useState('');
  const [h2hManagerB, setH2hManagerB] = useState('');

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
      
      if (managerData) setManagers(managerData);
      if (matchData) setMatches(matchData);
      if (transferData) setTransfers(transferData);
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

    fetchData();

    const channel = supabase.channel('realtime-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, fetchAuctions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'award_nominations' }, fetchAwards)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'award_votes' }, fetchAwards)
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

  // Apply Transfer Activity Filters
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
    managers.forEach(m => { table[m.id] = { id: m.id, name: m.name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }; });

    currentSeasonMatches.forEach(match => {
      if (!table[match.home_manager_id] || !table[match.away_manager_id]) return;
      const home = table[match.home_manager_id]; const away = table[match.away_manager_id];

      home.p += 1; away.p += 1;
      home.gf += match.home_goals; away.gf += match.away_goals;
      home.ga += match.away_goals; away.ga += match.home_goals;

      if (match.home_goals > match.away_goals) { home.w += 1; home.pts += 3; away.l += 1; } 
      else if (match.home_goals < match.away_goals) { away.w += 1; away.pts += 3; home.l += 1; } 
      else { home.d += 1; home.pts += 1; away.d += 1; away.pts += 1; }
      
      home.gd = home.gf - home.ga; away.gd = away.gf - away.ga;
    });
    return Object.values(table).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  };

  const leagueTable = calculateTable();
  const managerBalances = managers.map(m => {
    const net = currentSeasonTransfers.filter(t => t.manager_id === m.id).reduce((sum, t) => sum + Number(t.transfer_fee), 0);
    return { ...m, net };
  });

  // Calculate Profiles Stats
  const managerProfiles = managers.map(m => {
    const mMatches = currentSeasonMatches.filter(match => match.home_manager_id === m.id || match.away_manager_id === m.id);
    let w=0, d=0, l=0;
    let maxGd = -999;
    let minGd = 999;
    let biggestWin = null;
    let worstDefeat = null;

    mMatches.forEach(match => {
      const isHome = match.home_manager_id === m.id;
      const oppName = isHome ? match.away?.name : match.home?.name;
      const mGoals = isHome ? match.home_goals : match.away_goals;
      const oppGoals = isHome ? match.away_goals : match.home_goals;
      const gd = mGoals - oppGoals;

      if(gd > 0) w++;
      else if(gd < 0) l++;
      else d++;

      if(gd > maxGd && gd > 0) { maxGd = gd; biggestWin = `${mGoals}-${oppGoals} vs ${oppName || 'Unknown'}`; }
      if(gd < minGd && gd < 0) { minGd = gd; worstDefeat = `${mGoals}-${oppGoals} vs ${oppName || 'Unknown'}`; }
    });

    const winPct = mMatches.length > 0 ? Math.round((w / mMatches.length) * 100) : 0;
    const mTransfers = currentSeasonTransfers.filter(t => t.manager_id === m.id);
    
    // Most expensive signing based on absolute transfer fee
    let biggestTransfer = null;
    if (mTransfers.length > 0) {
      biggestTransfer = mTransfers.reduce((prev, current) =>
        Math.abs(Number(current.transfer_fee)) > Math.abs(Number(prev.transfer_fee)) ? current : prev
      );
    }

    return { ...m, p: mMatches.length, w, d, l, winPct, biggestWin: maxGd > 0 ? biggestWin : 'N/A', worstDefeat: minGd < 0 ? worstDefeat : 'N/A', biggestTransfer };
  });

  // Calculate H2H Stats
  let h2hStats = { p: 0, aWins: 0, bWins: 0, d: 0, aGoals: 0, bGoals: 0, matches: [] as any[] };
  if (h2hManagerA && h2hManagerB && h2hManagerA !== h2hManagerB) {
    const h2hMatches = currentSeasonMatches.filter(m => 
      (m.home_manager_id === h2hManagerA && m.away_manager_id === h2hManagerB) ||
      (m.home_manager_id === h2hManagerB && m.away_manager_id === h2hManagerA)
    );
    h2hStats.p = h2hMatches.length;
    h2hStats.matches = h2hMatches.slice().reverse(); // Show newest first

    h2hMatches.forEach(m => {
      const aIsHome = m.home_manager_id === h2hManagerA;
      const aG = aIsHome ? m.home_goals : m.away_goals;
      const bG = aIsHome ? m.away_goals : m.home_goals;
      h2hStats.aGoals += aG;
      h2hStats.bGoals += bG;

      if(aG > bG) h2hStats.aWins++;
      else if(bG > aG) h2hStats.bWins++;
      else h2hStats.d++;
    });
  }

  // Database Submissions
  const submitMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTotal) return alert("Select a specific season to log a match!");
    if (!isAdmin && password !== "1") return alert("Incorrect admin password!");
    if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) return alert("Select valid teams!");
    const { error } = await supabase.from('matches').insert([{ season_id: selectedSeasonId, home_manager_id: homeTeamId, away_manager_id: awayTeamId, home_goals: homeGoals, away_goals: awayGoals }]);
    if (!error) {
      const { data } = await supabase.from('matches').select('*, home:home_manager_id(name), away:away_manager_id(name)');
      if (data) setMatches(data);
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
      const { data } = await supabase.from('transfers').select('*, manager:manager_id(name)');
      if (data) setTransfers(data);
      setPlayerName(''); setAcquiringManagerId(''); setTransferFee(''); setPassword('');
    }
  };

  const deleteTransfer = async (transferId: string) => {
    if (!isAdmin) return;
    const confirmDelete = window.confirm("Commissioner Action: Are you sure you want to completely remove this transfer?");
    if (!confirmDelete) return;

    await supabase.from('transfers').delete().eq('id', transferId);
    const { data } = await supabase.from('transfers').select('*, manager:manager_id(name)');
    if (data) setTransfers(data);
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
    if (!isAdmin && password !== "1") {
       const promptPass = window.prompt("Admin Password required to start timer:");
       if (promptPass !== "1") return alert("Incorrect password.");
    }
    const endTime = new Date(Date.now() + 30000).toISOString();
    await supabase.from('auctions').update({ status: 'active', end_time: endTime }).eq('id', auctionId);
  };

  const placeBid = async (auctionId: string, currentBid: number, currentEndTime: string) => {
    const bidValue = bidInputs[auctionId];
    if (!bidValue || bidValue <= currentBid) return alert("Bid must be higher than the current bid!");
    const newEndTime = new Date(new Date(currentEndTime).getTime() + 10000).toISOString();
    await supabase.from('auctions').update({ current_bid: bidValue, highest_bidder_id: myManagerId, end_time: newEndTime }).eq('id', auctionId);
    setBidInputs({ ...bidInputs, [auctionId]: '' as any });
  };

  const archiveAuction = async (auctionId: string) => {
    if (!isAdmin && password !== "1") {
       const promptPass = window.prompt("Admin Password required:");
       if (promptPass !== "1") return alert("Incorrect password.");
    }
    await supabase.from('auctions').update({ status: 'archived' }).eq('id', auctionId);
  };

  const submitNomination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTotal) return alert("You must select a specific season to nominate a player!");
    if (!nominationName) return;

    const myNoms = currentSeasonNominations.filter(n => n.manager_id === myManagerId);
    if (myNoms.length >= 2) return alert("You can only nominate a maximum of 2 players per season!");

    await supabase.from('award_nominations').insert([{ season_id: selectedSeasonId, manager_id: myManagerId, player_name: nominationName }]);
    setNominationName('');
  };

  const castVote = async (nomination: any) => {
    if (nomination.manager_id === myManagerId) return alert("You cannot vote for a player you nominated!");
    const myVoteThisSeason = votes.find(v => v.voter_id === myManagerId && v.season_id === nomination.season_id);
    if (myVoteThisSeason) return alert("You have already cast your 1 vote for this season's awards!");

    await supabase.from('award_votes').insert([{ nomination_id: nomination.id, voter_id: myManagerId, season_id: nomination.season_id }]);
  };

  const deleteNomination = async (nominationId: string) => {
    if (!isAdmin) return;
    const confirmDelete = window.confirm("Commissioner Action: Are you sure you want to remove this nomination?");
    if (!confirmDelete) return;

    await supabase.from('award_nominations').delete().eq('id', nominationId);
  };

  // --- RENDER SCREENS ---

  if (loading) return <div className="p-10 text-center text-gray-500 font-medium">Loading the pitch...</div>;

  // 1. THE LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              The Super League
            </h1>
            <p className="mt-2 text-gray-500 font-medium">Please sign in to continue</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Who are you?</label>
              <select 
                className="w-full p-4 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer shadow-sm"
                value={loginManagerId}
                onChange={(e) => setLoginManagerId(e.target.value)}
              >
                <option value="">Select Manager...</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Password</label>
              <input 
                type="password" 
                placeholder="Enter your personal password"
                className="w-full p-4 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>
            
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-md transition-all active:scale-95 text-lg">
              Enter Locker Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. THE MAIN APP DASHBOARD
  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-4 md:p-8 font-sans overflow-x-hidden">
      <style dangerouslySetInnerHTML={{__html: `@keyframes popInOut { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } } .animate-pop { animation: popInOut 1s ease-in-out infinite; }`}} />

      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="text-center py-6">
          <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            The Super League
          </h1>
          <p className="mt-2 text-gray-500 font-medium">Official Tracker, Auctions & Awards</p>
          {isAdmin && <p className="text-xs font-black text-blue-500 uppercase tracking-widest mt-2 border border-blue-200 inline-block px-3 py-1 rounded-full bg-blue-50">Commissioner Access Granted</p>}
        </div>
        
        {/* Global Navigation & Controls */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto custom-scrollbar">
            <button onClick={() => setActiveTab('league')} className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'league' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>⚽ League</button>
            <button onClick={() => setActiveTab('h2h')} className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'h2h' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>⚔️ H2H</button>
            <button onClick={() => setActiveTab('profiles')} className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'profiles' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>🛡️ Profiles</button>
            <button onClick={() => setActiveTab('transfers')} className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'transfers' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>🤝 Transfers</button>
            <button onClick={() => setActiveTab('ebay')} className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'ebay' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>🛒 eBay</button>
            <button onClick={() => setActiveTab('awards')} className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'awards' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>🏆 Awards</button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg">
               <span className="text-xl">👤</span>
               <span className="text-blue-900 font-black tracking-wide">{managers.find(m => m.id === myManagerId)?.name}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-gray-400 uppercase tracking-wide text-xs font-bold whitespace-nowrap">Season:</label>
              <select className="p-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg font-bold text-sm outline-none cursor-pointer shadow-sm" value={selectedSeasonId} onChange={(e) => setSelectedSeasonId(e.target.value)}>
                <option value="all">🌍 TOTAL (ALL TIME)</option>
                {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ======================= LEAGUE TAB ======================= */}
        {activeTab === 'league' && (
           <div className="space-y-6 animate-in fade-in duration-300">
             <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
               <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">🏆 {isTotal ? 'All-Time Leaderboard' : 'League Standings'}</h2>
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-gray-50 border-y border-gray-200 text-gray-500 text-sm uppercase tracking-wider">
                     <th className="p-4 font-semibold rounded-tl-lg">Manager</th><th className="p-4 font-semibold">P</th><th className="p-4 font-semibold">W</th><th className="p-4 font-semibold">D</th><th className="p-4 font-semibold">L</th><th className="p-4 font-semibold">GD</th><th className="p-4 font-bold text-blue-600 rounded-tr-lg">Pts</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {leagueTable.map((row, index) => (
                     <tr key={row.id} className="hover:bg-blue-50/50 transition-colors">
                       <td className="p-4 flex items-center gap-3"><span className="text-gray-400 font-medium text-sm">{index + 1}</span><span className="font-bold text-gray-800">{row.name}</span></td>
                       <td className="p-4 text-gray-600">{row.p}</td><td className="p-4 text-gray-600">{row.w}</td><td className="p-4 text-gray-600">{row.d}</td><td className="p-4 text-gray-600">{row.l}</td>
                       <td className="p-4 text-gray-600 font-medium">{row.gd > 0 ? `+${row.gd}` : row.gd}</td><td className="p-4 font-black text-blue-600 text-lg">{row.pts}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
 
             {!isTotal ? (
               <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
                  <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">⚽ Log Match Result</h2>
                  <form onSubmit={submitMatch} className="flex flex-col space-y-6">
                     <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <div className="flex flex-col w-full md:w-2/5">
                           <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Home Team</label>
                           <select className="p-3 bg-white border border-gray-300 rounded-lg outline-none" value={homeTeamId} onChange={(e) => setHomeTeamId(e.target.value)}>
                              <option value="">Select Manager...</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                           </select>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-1/5 justify-center">
                           <input type="number" min="0" className="w-16 p-3 bg-white border border-gray-300 text-center text-2xl font-black rounded-lg" value={homeGoals} onChange={(e) => setHomeGoals(parseInt(e.target.value) || 0)} />
                           <span className="font-bold text-gray-400 text-xl">-</span>
                           <input type="number" min="0" className="w-16 p-3 bg-white border border-gray-300 text-center text-2xl font-black rounded-lg" value={awayGoals} onChange={(e) => setAwayGoals(parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="flex flex-col w-full md:w-2/5">
                           <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Away Team</label>
                           <select className="p-3 bg-white border border-gray-300 rounded-lg outline-none" value={awayTeamId} onChange={(e) => setAwayTeamId(e.target.value)}>
                              <option value="">Select Manager...</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                           </select>
                        </div>
                     </div>
                     <div className="flex flex-col md:flex-row gap-4 items-end pt-2">
                       {!isAdmin && (
                         <div className="flex flex-col w-full md:w-1/3">
                           <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Admin Password</label>
                           <input type="password" placeholder="••••••••" className="p-3 border rounded-lg w-full outline-none" value={password} onChange={(e) => setPassword(e.target.value)} />
                         </div>
                       )}
                       <button type="submit" className={`w-full ${isAdmin ? '' : 'md:w-2/3'} bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg shadow-md transition-all`}>Submit Final Score</button>
                     </div>
                  </form>
               </div>
             ) : (
               <div className="text-center p-6 bg-gray-100 rounded-xl border border-dashed border-gray-300 text-gray-500 font-bold">Select a specific season to log new match results.</div>
             )}
           </div>
         )}

        {/* ======================= H2H TAB ======================= */}
        {activeTab === 'h2h' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
               <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">⚔️ Head-to-Head Records {isTotal && '(All-Time)'}</h2>
               
               <div className="flex flex-col md:flex-row justify-center items-center gap-6 mb-10">
                  <select 
                    className="p-4 bg-gray-50 border-2 border-gray-200 text-gray-900 rounded-xl font-black text-xl outline-none cursor-pointer w-full md:w-1/3 text-center focus:border-blue-500 transition-colors"
                    value={h2hManagerA}
                    onChange={(e) => setH2hManagerA(e.target.value)}
                  >
                    <option value="">Select Manager</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>

                  <div className="text-3xl font-black text-gray-300 italic">VS</div>

                  <select 
                    className="p-4 bg-gray-50 border-2 border-gray-200 text-gray-900 rounded-xl font-black text-xl outline-none cursor-pointer w-full md:w-1/3 text-center focus:border-blue-500 transition-colors"
                    value={h2hManagerB}
                    onChange={(e) => setH2hManagerB(e.target.value)}
                  >
                    <option value="">Select Manager</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
               </div>

               {h2hManagerA && h2hManagerB && h2hManagerA !== h2hManagerB ? (
                 <div className="space-y-8 animate-in slide-in-from-bottom-4">
                   <div className="grid grid-cols-3 gap-4 text-center items-center bg-gray-900 text-white rounded-2xl p-6 shadow-lg">
                      <div>
                        <p className="text-4xl font-black">{h2hStats.aWins}</p>
                        <p className="text-xs uppercase tracking-widest text-gray-400 mt-1">Wins</p>
                      </div>
                      <div className="border-x border-gray-700">
                        <p className="text-4xl font-black text-gray-400">{h2hStats.d}</p>
                        <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Draws</p>
                      </div>
                      <div>
                        <p className="text-4xl font-black">{h2hStats.bWins}</p>
                        <p className="text-xs uppercase tracking-widest text-gray-400 mt-1">Wins</p>
                      </div>
                   </div>

                   <div className="flex justify-between items-center px-4">
                     <div className="text-center">
                        <p className="text-2xl font-bold text-gray-800">{h2hStats.aGoals}</p>
                        <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Goals Scored</p>
                     </div>
                     <div className="text-center">
                        <p className="text-xs font-black uppercase tracking-widest bg-blue-100 text-blue-600 px-3 py-1 rounded-full">{h2hStats.p} Matches Played</p>
                     </div>
                     <div className="text-center">
                        <p className="text-2xl font-bold text-gray-800">{h2hStats.bGoals}</p>
                        <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Goals Scored</p>
                     </div>
                   </div>

                   {h2hStats.matches.length > 0 && (
                     <div className="mt-8 border-t pt-8">
                       <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Match History (Recent First)</h3>
                       <div className="grid gap-3">
                         {h2hStats.matches.map(m => (
                           <div key={m.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                             <span className={`w-1/3 text-right font-bold ${m.home_goals > m.away_goals ? 'text-gray-900' : 'text-gray-400'}`}>{m.home?.name}</span>
                             <span className="w-1/3 text-center font-black bg-white py-1 px-4 rounded-lg border shadow-sm">
                               {m.home_goals} - {m.away_goals}
                             </span>
                             <span className={`w-1/3 text-left font-bold ${m.away_goals > m.home_goals ? 'text-gray-900' : 'text-gray-400'}`}>{m.away?.name}</span>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                 </div>
               ) : h2hManagerA === h2hManagerB && h2hManagerA !== '' ? (
                 <div className="text-center text-red-500 font-bold py-10">You cannot select the same manager twice.</div>
               ) : (
                 <div className="text-center text-gray-400 font-bold py-10 border-2 border-dashed rounded-xl">Select two managers above to view their history.</div>
               )}
            </div>
          </div>
        )}

        {/* ======================= PROFILES TAB ======================= */}
        {activeTab === 'profiles' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {managerProfiles.map(profile => (
                <div key={profile.id} className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden relative">
                   <div className="bg-gray-900 h-24 absolute top-0 left-0 right-0 z-0 opacity-5"></div>
                   
                   <div className="p-6 relative z-10">
                     <div className="flex justify-between items-end mb-6">
                        <div className="flex items-center gap-4">
                           <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg font-black">
                             {profile.name.charAt(0)}
                           </div>
                           <div>
                             <h2 className="text-3xl font-black text-gray-900">{profile.name}</h2>
                             <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Club Manager</p>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="bg-gray-50 p-4 rounded-2xl border text-center">
                          <p className="text-3xl font-black text-blue-600">{profile.winPct}%</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Win Rate</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl border text-center">
                          <p className="text-3xl font-black text-gray-800">{profile.w}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Wins</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl border text-center">
                          <p className="text-3xl font-black text-gray-800">{profile.p}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Matches</p>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl border border-green-100">
                           <span className="text-xs font-bold text-green-700 uppercase tracking-widest">Biggest Win</span>
                           <span className="font-black text-gray-800">{profile.biggestWin}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl border border-red-100">
                           <span className="text-xs font-bold text-red-700 uppercase tracking-widest">Worst Defeat</span>
                           <span className="font-black text-gray-800">{profile.worstDefeat}</span>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border">
                           <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Record Signing</span>
                           {profile.biggestTransfer ? (
                             <span className="font-black text-gray-800 text-right">
                               {profile.biggestTransfer.player_name} <span className="text-blue-600 text-sm ml-1">(£{Math.abs(profile.biggestTransfer.transfer_fee)}M)</span>
                             </span>
                           ) : (
                             <span className="font-bold text-gray-400 italic">None logged</span>
                           )}
                        </div>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================= TRANSFERS TAB ======================= */}
        {activeTab === 'transfers' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {managerBalances.map(mb => (
                  <div key={mb.id} className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-center items-center text-center">
                     <h4 className="text-gray-500 font-bold uppercase tracking-wide text-xs mb-2">{mb.name}&apos;s Net</h4>
                     <p className={`text-2xl lg:text-3xl font-black ${mb.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>{mb.net >= 0 ? '+' : ''}£{mb.net}M</p>
                  </div>
               ))}
            </div>

            {!isTotal ? (
               <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
                  <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">📝 Log Transfer</h2>
                  <form onSubmit={submitTransfer} className="flex flex-col space-y-6">
                     <div className="flex flex-col md:flex-row gap-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <div className="flex flex-col w-full md:w-1/3">
                           <label className="text-xs font-bold text-gray-500 uppercase mb-2">Player Name</label>
                           <input type="text" className="p-3 border rounded-lg outline-none" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
                        </div>
                        <div className="flex flex-col w-full md:w-1/3">
                           <label className="text-xs font-bold text-gray-500 uppercase mb-2">Manager</label>
                           <select className="p-3 border rounded-lg outline-none" value={acquiringManagerId} onChange={(e) => setAcquiringManagerId(e.target.value)}>
                              <option value="">Select Manager...</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                           </select>
                        </div>
                        <div className="flex flex-col w-full md:w-1/3">
                           <label className="text-xs font-bold text-gray-500 uppercase mb-2">Fee (Use - for Money Spent)</label>
                           <div className="relative">
                             <span className="absolute left-3 top-3 text-gray-400 font-bold">£</span>
                             <input type="number" step="0.1" className="p-3 pl-8 border rounded-lg w-full outline-none" value={transferFee} onChange={(e) => setTransferFee(e.target.value === '' ? '' : parseFloat(e.target.value))} />
                             <span className="absolute right-3 top-3 text-gray-400 font-bold">M</span>
                           </div>
                        </div>
                     </div>
                     <div className="flex flex-col md:flex-row gap-4 items-end pt-2">
                       {!isAdmin && (
                         <div className="flex flex-col w-full md:w-1/3">
                           <label className="text-xs font-bold text-gray-500 uppercase mb-2">Admin Password</label>
                           <input type="password" placeholder="••••••••" className="p-3 border rounded-lg w-full outline-none" value={password} onChange={(e) => setPassword(e.target.value)} />
                         </div>
                       )}
                       <button type="submit" className={`w-full ${isAdmin ? '' : 'md:w-2/3'} bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-lg shadow-md`}>Confirm Transfer</button>
                     </div>
                  </form>
               </div>
            ) : (
               <div className="text-center p-6 bg-gray-100 rounded-xl border border-dashed border-gray-300 text-gray-500 font-bold">Select a specific season to log new transfers.</div>
            )}

            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">🔄 Transfer Activity {isTotal && '(All Time)'}</h2>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <select 
                    className="p-2.5 bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-lg text-sm outline-none cursor-pointer w-full sm:w-auto"
                    value={transferManagerFilter}
                    onChange={(e) => setTransferManagerFilter(e.target.value)}
                  >
                    <option value="all">👥 All Managers</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <select 
                    className="p-2.5 bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-lg text-sm outline-none cursor-pointer w-full sm:w-auto"
                    value={transferTypeFilter}
                    onChange={(e) => setTransferTypeFilter(e.target.value)}
                  >
                    <option value="all">💸 All Types</option>
                    <option value="in">📥 Signed (Money Out)</option>
                    <option value="out">📤 Sold (Money In)</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4">
                {displayedTransfers.length > 0 ? (
                  displayedTransfers.slice().reverse().map((transfer) => (
                    <div key={transfer.id} className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center shadow-sm hover:border-blue-200 transition-colors">
                      <div className="flex items-center gap-4 w-full md:w-1/3">
                        <div className="bg-blue-50 text-blue-600 p-3 rounded-full text-xl border border-blue-100">👤</div>
                        <span className="font-bold text-gray-800 text-lg">{transfer.player_name}</span>
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-1/3 justify-center text-gray-500 font-medium my-3 md:my-0">
                        {transfer.transfer_fee < 0 ? 'Signed by ' : 'Sold by '} 
                        <span className="font-bold text-gray-800">{transfer.manager?.name}</span>
                      </div>
                      <div className="w-full md:w-1/3 flex flex-col items-center md:items-end justify-center gap-2">
                        <span className={`border px-5 py-2 rounded-full font-black tracking-wide ${transfer.transfer_fee >= 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                          {transfer.transfer_fee > 0 ? '+' : ''}£{transfer.transfer_fee}M
                        </span>
                        {isAdmin && (
                          <button 
                            onClick={() => deleteTransfer(transfer.id)}
                            className="text-xs font-bold text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors"
                          >
                            Admin: Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500 font-bold text-lg">No transfers found for these filters.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================= eBay TAB ======================= */}
        {activeTab === 'ebay' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
               <div className="z-10 flex items-center gap-3">
                 <div className="h-4 w-4 bg-red-500 rounded-full animate-pulse"></div>
                 <h2 className="text-2xl font-black tracking-widest uppercase">Live Auction House</h2>
               </div>
               <div className="z-10 font-mono text-xl font-bold bg-gray-800 px-6 py-2 rounded-lg border border-gray-700">UK Time: <span className="text-blue-400">{ukTime}</span></div>
            </div>

            {!isTotal ? (
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Admin: List Player</h3>
                  <form onSubmit={listAuction} className="flex flex-col md:flex-row items-end gap-4">
                     <div className={`w-full ${isAdmin ? 'md:w-1/2' : 'md:w-1/3'}`}>
                       <label className="text-xs font-bold text-gray-500 mb-1 block">Player Name</label>
                       <input type="text" className="w-full p-2 border rounded-lg outline-none" value={auctionPlayerName} onChange={e => setAuctionPlayerName(e.target.value)} />
                     </div>
                     <div className={`w-full ${isAdmin ? 'md:w-1/2' : 'md:w-1/4'}`}>
                       <label className="text-xs font-bold text-gray-500 mb-1 block">Starting Bid (£M)</label>
                       <input type="number" step="0.1" className="w-full p-2 border rounded-lg outline-none" value={auctionStartBid} onChange={e => setAuctionStartBid(e.target.value === '' ? '' : parseFloat(e.target.value))} />
                     </div>
                     {!isAdmin && (
                       <div className="w-full md:w-1/4">
                         <label className="text-xs font-bold text-gray-500 mb-1 block">Admin Password</label>
                         <input type="password" placeholder="••••••••" className="w-full p-2 border rounded-lg outline-none" value={password} onChange={e => setPassword(e.target.value)} />
                       </div>
                     )}
                     <button type="submit" className="w-full md:w-auto bg-gray-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-700 transition-colors">List</button>
                  </form>
               </div>
            ) : (
               <div className="text-center p-6 bg-gray-100 rounded-xl border border-dashed border-gray-300 text-gray-500 font-bold">Select a specific season to list a new player.</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentSeasonAuctions.map(auction => {
                 const endTimeMs = auction.end_time ? new Date(auction.end_time).getTime() : 0;
                 const timeLeft = auction.end_time ? Math.max(0, Math.floor((endTimeMs - currentTime) / 1000)) : 0;
                 const isPending = auction.status === 'pending';
                 const isActive = auction.status === 'active' && timeLeft > 0;
                 const isFinished = auction.status === 'active' && auction.end_time && timeLeft === 0;
                 const isUrgent = isActive && timeLeft <= 10;

                 let cardStyle = "p-6 rounded-2xl border-2 transition-all duration-300 ";
                 if (isPending) cardStyle += "bg-white border-yellow-400 shadow-lg";
                 else if (isActive && !isUrgent) cardStyle += "bg-white border-blue-400 shadow-lg shadow-blue-100";
                 else if (isUrgent) cardStyle += "bg-red-50 border-red-500 shadow-2xl shadow-red-200 animate-pop";
                 else if (isFinished) cardStyle += "bg-green-50 border-green-500 shadow-lg";

                 return (
                 <div key={auction.id} className={cardStyle}>
                    <div className="flex justify-between items-start mb-4">
                       <h3 className="text-3xl font-black text-gray-900">{auction.player_name}</h3>
                       {isPending && <span className="bg-yellow-100 text-yellow-700 text-xs font-black uppercase px-3 py-1 rounded-full border border-yellow-200">Waiting</span>}
                       {isActive && <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border ${isUrgent ? 'bg-red-600 text-white border-red-700' : 'bg-red-100 text-red-600 border-red-200 animate-pulse'} flex items-center gap-1`}>LIVE ⏳ {timeLeft}s</span>}
                       {isFinished && <span className="bg-green-100 text-green-700 text-xs font-black uppercase px-3 py-1 rounded-full border border-green-200">SOLD 🎉</span>}
                    </div>

                    <div className={`rounded-xl p-4 border mb-6 flex justify-between items-center ${isFinished ? 'bg-green-100 border-green-200' : 'bg-white border-gray-100'}`}>
                       <div>
                         <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{isFinished ? 'Winning Bid' : 'Current Highest Bid'}</p>
                         <p className={`text-4xl font-black ${isFinished ? 'text-green-700' : 'text-blue-600'}`}>£{auction.current_bid}M</p>
                       </div>
                       <div className="text-right">
                         <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{isFinished ? 'Won By' : 'Held By'}</p>
                         <p className="text-lg font-bold text-gray-800">{auction.highest_bidder?.name || 'No bids yet'}</p>
                       </div>
                    </div>

                    {isPending && <button onClick={() => startAuctionTimer(auction.id)} className="w-full bg-yellow-400 text-yellow-900 px-6 py-3 rounded-xl font-black hover:bg-yellow-500 transition-colors">Admin: Start 30s Timer</button>}
                    {isActive && (
                       <div className="flex gap-2">
                          <input type="number" step="0.1" placeholder={`> ${auction.current_bid}`} className="flex-1 p-3 border-2 border-gray-200 rounded-xl font-bold text-lg outline-none focus:border-blue-500" value={bidInputs[auction.id] || ''} onChange={(e) => setBidInputs({...bidInputs, [auction.id]: parseFloat(e.target.value)})} />
                          <button onClick={() => placeBid(auction.id, auction.current_bid, auction.end_time)} className="bg-blue-600 text-white px-8 rounded-xl font-black text-lg hover:bg-blue-700 active:scale-95 transition-transform">BID</button>
                       </div>
                    )}
                    {(isFinished || isPending) && <button onClick={() => archiveAuction(auction.id)} className="w-full mt-4 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest">Admin: Clear / Hide Auction</button>}
                 </div>
              )})}
            </div>
          </div>
        )}

        {/* ======================= AWARDS TAB ======================= */}
        {activeTab === 'awards' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-yellow-50 border-2 border-yellow-400 text-yellow-900 p-6 rounded-2xl shadow-sm text-center">
               <h2 className="text-3xl font-black tracking-wider uppercase mb-2">🏆 Award Nominations</h2>
               <p className="font-bold opacity-80">Each manager can nominate 2 players. You can cast ONE vote for another team&apos;s player.</p>
            </div>

            {!isTotal ? (
               <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Nominate a Player</h3>
                  <form onSubmit={submitNomination} className="flex flex-col md:flex-row items-end gap-4">
                     <div className="w-full md:w-3/4">
                       <label className="text-xs font-bold text-gray-500 mb-1 block">Player Name</label>
                       <input type="text" placeholder="Who deserves the award?" className="w-full p-3 border-2 border-gray-200 focus:border-yellow-400 rounded-lg outline-none font-bold" value={nominationName} onChange={e => setNominationName(e.target.value)} />
                     </div>
                     <button type="submit" className="w-full md:w-1/4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-6 py-3 rounded-lg font-black transition-colors">Nominate</button>
                  </form>
               </div>
            ) : (
               <div className="text-center p-6 bg-gray-100 rounded-xl border border-dashed border-gray-300 text-gray-500 font-bold">Select a specific season to cast votes or nominate players.</div>
            )}

            <div className="grid gap-4">
              {currentSeasonNominations
                .map(nom => ({ ...nom, voteCount: votes.filter(v => v.nomination_id === nom.id).length }))
                .sort((a, b) => b.voteCount - a.voteCount)
                .map(nom => {
                   const hasVotedThisSeason = votes.some(v => v.voter_id === myManagerId && v.season_id === nom.season_id);
                   const isOwnPlayer = nom.manager_id === myManagerId;
                   const iVotedForThis = votes.some(v => v.nomination_id === nom.id && v.voter_id === myManagerId);

                   return (
                   <div key={nom.id} className="bg-white border border-gray-100 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center shadow-sm">
                      <div className="w-full md:w-1/3">
                         <h3 className="text-2xl font-black text-gray-900">{nom.player_name}</h3>
                         <p className="text-gray-500 font-bold text-sm mt-1">Nominated by {nom.manager?.name}</p>
                      </div>
                      
                      <div className="w-full md:w-1/3 flex justify-center my-4 md:my-0">
                         <div className="bg-yellow-50 border border-yellow-200 px-6 py-3 rounded-full flex items-center gap-3">
                            <span className="text-xl">⭐️</span>
                            <span className="text-2xl font-black text-yellow-700">{nom.voteCount}</span>
                         </div>
                      </div>

                      <div className="w-full md:w-1/3 flex flex-col items-end justify-center gap-2">
                         {isTotal ? (
                            <span className="text-gray-400 font-bold italic">Voting closed</span>
                         ) : iVotedForThis ? (
                            <span className="bg-green-100 text-green-700 px-6 py-3 rounded-xl font-black flex items-center gap-2 border border-green-300">✅ Voted</span>
                         ) : (
                            <button 
                              onClick={() => castVote(nom)} 
                              disabled={isOwnPlayer || hasVotedThisSeason}
                              className={`w-full max-w-[160px] px-8 py-3 rounded-xl font-black transition-all ${isOwnPlayer ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : hasVotedThisSeason ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-gray-700 active:scale-95'}`}
                            >
                              {isOwnPlayer ? 'Your Player' : hasVotedThisSeason ? 'Vote Cast' : 'Vote'}
                            </button>
                         )}

                         {isAdmin && (
                           <button 
                             onClick={() => deleteNomination(nom.id)}
                             className="text-xs font-bold text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors mt-2"
                           >
                             Admin: Remove
                           </button>
                         )}
                      </div>
                   </div>
              )})}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}