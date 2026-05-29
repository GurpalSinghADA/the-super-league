"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

export default function Home() {
  const [managers, setManagers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'league' | 'transfers' | 'ebay'>('league');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [password, setPassword] = useState('');
  
  // Time States
  const [ukTime, setUkTime] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(Date.now());

  // League States
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);

  // Transfer States
  const [playerName, setPlayerName] = useState('');
  const [acquiringManagerId, setAcquiringManagerId] = useState('');
  const [transferFee, setTransferFee] = useState<number | ''>('');

  // eBay States
  const [myManagerId, setMyManagerId] = useState('');
  const [auctionPlayerName, setAuctionPlayerName] = useState('');
  const [auctionStartBid, setAuctionStartBid] = useState<number | ''>('');
  const [bidInputs, setBidInputs] = useState<Record<string, number>>({});

  useEffect(() => {
    // 1. Start UK Time & Countdown Ticker
    const timer = setInterval(() => {
      setUkTime(new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/London' }));
      setCurrentTime(Date.now());
    }, 1000);

    // 2. Fetch Initial Data
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
        setSelectedSeasonId(seasonData[0].id);
      }
      fetchAuctions();
      setLoading(false);
    }
    
    async function fetchAuctions() {
      const { data } = await supabase.from('auctions').select('*, highest_bidder:highest_bidder_id(name)').neq('status', 'archived').order('created_at', { ascending: false });
      if (data) setAuctions(data);
    }

    fetchData();

    // 3. LIVE WebSockets Subscription
    const channel = supabase.channel('realtime-auctions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, (payload) => {
         fetchAuctions();
      })
      .subscribe();

    return () => { 
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const currentSeasonMatches = matches.filter(match => match.season_id === selectedSeasonId);
  const currentSeasonTransfers = transfers.filter(transfer => transfer.season_id === selectedSeasonId);
  const currentSeasonAuctions = auctions.filter(auction => auction.season_id === selectedSeasonId);

  // League Table Calculation
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

  // Action Functions
  const submitMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== "1") return alert("Incorrect password!");
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
    if (password !== "1") return alert("Incorrect password!");
    if (!playerName || !acquiringManagerId || transferFee === '') return alert("Fill all details!");
    const { error } = await supabase.from('transfers').insert([{ season_id: selectedSeasonId, manager_id: acquiringManagerId, player_name: playerName, transfer_fee: transferFee }]);
    if (!error) {
      const { data } = await supabase.from('transfers').select('*, manager:manager_id(name)');
      if (data) setTransfers(data);
      setPlayerName(''); setAcquiringManagerId(''); setTransferFee(''); setPassword('');
    }
  };

  // eBay Functions
  const listAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== "1") return alert("Incorrect Admin password!");
    if (!auctionPlayerName) return alert("Enter a player name!");
    if (!selectedSeasonId) return alert("Ensure a season is selected!");
    
    await supabase.from('auctions').insert([{ 
      season_id: selectedSeasonId,
      player_name: auctionPlayerName, 
      current_bid: auctionStartBid || 0, 
      status: 'pending' 
    }]);
    
    setAuctionPlayerName(''); setAuctionStartBid(''); setPassword('');
  };

  const startAuctionTimer = async (auctionId: string) => {
    if (password !== "1") {
       const promptPass = window.prompt("Admin Password required to start timer:");
       if (promptPass !== "1") return alert("Incorrect password.");
    }
    const endTime = new Date(Date.now() + 30000).toISOString();
    await supabase.from('auctions').update({ status: 'active', end_time: endTime }).eq('id', auctionId);
  };

  const placeBid = async (auctionId: string, currentBid: number, currentEndTime: string) => {
    if (!myManagerId) return alert("Select 'Who is bidding?' at the top of the page first!");
    const bidValue = bidInputs[auctionId];
    if (!bidValue || bidValue <= currentBid) return alert("Bid must be higher than the current bid!");
    
    const newEndTime = new Date(new Date(currentEndTime).getTime() + 10000).toISOString();
    await supabase.from('auctions').update({ current_bid: bidValue, highest_bidder_id: myManagerId, end_time: newEndTime }).eq('id', auctionId);
    setBidInputs({ ...bidInputs, [auctionId]: '' as any });
  };

  const archiveAuction = async (auctionId: string) => {
    if (password !== "1") {
       const promptPass = window.prompt("Admin Password required to clear auction:");
       if (promptPass !== "1") return alert("Incorrect password.");
    }
    await supabase.from('auctions').update({ status: 'archived' }).eq('id', auctionId);
  };

  if (loading) return <div className="p-10 text-center text-gray-500 font-medium">Loading the pitch...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-4 md:p-8 font-sans overflow-x-hidden">
      {/* Custom CSS Animation for the 10-second panic mode */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes popInOut {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .animate-pop {
          animation: popInOut 1s ease-in-out infinite;
        }
      `}} />

      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="text-center py-6">
          <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            The Super League
          </h1>
          <p className="mt-2 text-gray-500 font-medium">Official Match Tracking & Live Auctions</p>
        </div>
        
        {/* Navigation & Controls */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            <button onClick={() => setActiveTab('league')} className={`flex-1 min-w-[100px] py-2 px-4 rounded-lg font-bold text-sm transition-all ${activeTab === 'league' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>⚽ League</button>
            <button onClick={() => setActiveTab('transfers')} className={`flex-1 min-w-[100px] py-2 px-4 rounded-lg font-bold text-sm transition-all ${activeTab === 'transfers' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>🤝 Transfers</button>
            <button onClick={() => setActiveTab('ebay')} className={`flex-1 min-w-[100px] py-2 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'ebay' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              🛒 eBay <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>
            </button>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <label className="text-gray-500 uppercase tracking-wide text-xs font-bold whitespace-nowrap">Season:</label>
            <select className="p-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg font-bold text-md focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" value={selectedSeasonId} onChange={(e) => setSelectedSeasonId(e.target.value)}>
              {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* ======================= LEAGUE TAB ======================= */}
        {activeTab === 'league' && (
           <div className="space-y-6 animate-in fade-in duration-300">
             <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
               <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">🏆 League Standings</h2>
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
 
             <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">⚽ Log Match Result</h2>
                <form onSubmit={submitMatch} className="flex flex-col space-y-6">
                   <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
                      <div className="flex flex-col w-full md:w-2/5">
                         <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Home Team</label>
                         <select className="p-3 bg-white border border-gray-300 text-gray-900 rounded-lg outline-none cursor-pointer" value={homeTeamId} onChange={(e) => setHomeTeamId(e.target.value)}>
                            <option value="">Select Manager...</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                         </select>
                      </div>
                      <div className="flex items-center gap-3 w-full md:w-1/5 justify-center">
                         <input type="number" min="0" className="w-16 p-3 bg-white border border-gray-300 shadow-inner text-center text-2xl font-black text-gray-800 rounded-lg outline-none" value={homeGoals} onChange={(e) => setHomeGoals(parseInt(e.target.value) || 0)} />
                         <span className="font-bold text-gray-400 text-xl">-</span>
                         <input type="number" min="0" className="w-16 p-3 bg-white border border-gray-300 shadow-inner text-center text-2xl font-black text-gray-800 rounded-lg outline-none" value={awayGoals} onChange={(e) => setAwayGoals(parseInt(e.target.value) || 0)} />
                      </div>
                      <div className="flex flex-col w-full md:w-2/5">
                         <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Away Team</label>
                         <select className="p-3 bg-white border border-gray-300 text-gray-900 rounded-lg outline-none cursor-pointer" value={awayTeamId} onChange={(e) => setAwayTeamId(e.target.value)}>
                            <option value="">Select Manager...</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                         </select>
                      </div>
                   </div>
                   <div className="flex flex-col md:flex-row gap-4 items-end pt-2">
                     <div className="flex flex-col w-full md:w-1/3">
                       <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Admin Password</label>
                       <input type="password" placeholder="••••••••" className="p-3 bg-white border border-gray-300 rounded-lg w-full outline-none" value={password} onChange={(e) => setPassword(e.target.value)} />
                     </div>
                     <button type="submit" className="w-full md:w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg shadow-md transition-all">Submit Final Score</button>
                   </div>
                </form>
             </div>
           </div>
         )}

        {/* ======================= TRANSFERS TAB ======================= */}
        {activeTab === 'transfers' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {managerBalances.map(mb => (
                  <div key={mb.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center items-center">
                     <h4 className="text-gray-500 font-bold uppercase tracking-wide text-xs mb-2">{mb.name}&apos;s Net Spend</h4>
                     <p className={`text-3xl font-black ${mb.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>{mb.net >= 0 ? '+' : ''}£{mb.net}M</p>
                  </div>
               ))}
            </div>

            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
               <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">📝 Log Transfer Activity</h2>
               <form onSubmit={submitTransfer} className="flex flex-col space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
                     <div className="flex flex-col w-full md:w-1/3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Player Name</label>
                        <input type="text" placeholder="e.g. Jude Bellingham" className="p-3 bg-white border border-gray-300 rounded-lg outline-none" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
                     </div>
                     <div className="flex flex-col w-full md:w-1/3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Manager</label>
                        <select className="p-3 bg-white border border-gray-300 rounded-lg outline-none cursor-pointer" value={acquiringManagerId} onChange={(e) => setAcquiringManagerId(e.target.value)}>
                           <option value="">Select Manager...</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                     </div>
                     <div className="flex flex-col w-full md:w-1/3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Fee (Use - for Money Spent)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-400 font-bold">£</span>
                          <input type="number" step="0.1" placeholder="0.0" className="p-3 pl-8 bg-white border border-gray-300 rounded-lg w-full outline-none" value={transferFee} onChange={(e) => setTransferFee(e.target.value === '' ? '' : parseFloat(e.target.value))} />
                          <span className="absolute right-3 top-3 text-gray-400 font-bold">M</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 items-end pt-2">
                    <div className="flex flex-col w-full md:w-1/3">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Admin Password</label>
                      <input type="password" placeholder="••••••••" className="p-3 bg-white border border-gray-300 rounded-lg w-full outline-none" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <button type="submit" className="w-full md:w-2/3 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-lg shadow-md transition-all">Confirm Transfer</button>
                  </div>
               </form>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">🔄 Season Transfer Activity</h2>
              <div className="grid gap-4">
                {currentSeasonTransfers.slice().reverse().map((transfer) => (
                  <div key={transfer.id} className="bg-white border border-gray-100 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center shadow-sm">
                    <div className="flex items-center gap-4 w-full md:w-1/3">
                      <div className="bg-blue-100 text-blue-600 p-3 rounded-full text-xl">👤</div>
                      <span className="font-bold text-gray-800 text-lg">{transfer.player_name}</span>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-1/3 justify-center text-gray-500 font-medium my-2 md:my-0">
                      {transfer.transfer_fee < 0 ? 'Signed by ' : 'Sold by '} 
                      <span className="font-bold text-gray-800">{transfer.manager?.name}</span>
                    </div>
                    <div className="w-full md:w-1/3 text-right">
                      <span className={`border px-4 py-2 rounded-full font-black tracking-wide ${transfer.transfer_fee >= 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                        {transfer.transfer_fee > 0 ? '+' : ''}£{transfer.transfer_fee}M
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================= eBay TAB ======================= */}
        {activeTab === 'ebay' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* eBay Header & Clock */}
            <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
               <div className="z-10 flex items-center gap-3">
                 <div className="h-4 w-4 bg-red-500 rounded-full animate-pulse"></div>
                 <h2 className="text-2xl font-black tracking-widest uppercase">Live Auction House</h2>
               </div>
               <div className="z-10 font-mono text-xl font-bold bg-gray-800 px-6 py-2 rounded-lg border border-gray-700">
                 UK Time: <span className="text-blue-400">{ukTime}</span>
               </div>
            </div>

            {/* Global Bidder Identity */}
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-4 shadow-sm">
               <span className="font-bold text-blue-800">Who is bidding?</span>
               <select 
                 className="p-3 bg-white border border-blue-300 text-blue-900 font-bold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-sm cursor-pointer"
                 value={myManagerId}
                 onChange={(e) => setMyManagerId(e.target.value)}
               >
                 <option value="">Select your name to bid...</option>
                 {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
               </select>
            </div>

            {/* Admin: Create Auction */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Admin: List Player</h3>
               <form onSubmit={listAuction} className="flex flex-col md:flex-row items-end gap-4">
                  <div className="w-full md:w-1/3">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Player Name</label>
                    <input type="text" className="w-full p-2 border rounded-lg bg-gray-50 outline-none" value={auctionPlayerName} onChange={e => setAuctionPlayerName(e.target.value)} />
                  </div>
                  <div className="w-full md:w-1/4">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Starting Bid (£M)</label>
                    <input type="number" step="0.1" className="w-full p-2 border rounded-lg bg-gray-50 outline-none" value={auctionStartBid} onChange={e => setAuctionStartBid(e.target.value === '' ? '' : parseFloat(e.target.value))} />
                  </div>
                  <div className="w-full md:w-1/4">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Password</label>
                    <input type="password" className="w-full p-2 border rounded-lg bg-gray-50 outline-none" value={password} onChange={e => setPassword(e.target.value)} />
                  </div>
                  <button type="submit" className="w-full md:w-auto bg-gray-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-700 transition-colors">List</button>
               </form>
            </div>

            {/* Active Auctions Grid (Filtered by Season) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentSeasonAuctions.map(auction => {
                 // Countdown Timer Logic
                 const endTimeMs = auction.end_time ? new Date(auction.end_time).getTime() : 0;
                 const timeLeft = auction.end_time ? Math.max(0, Math.floor((endTimeMs - currentTime) / 1000)) : 0;
                 
                 // Display States
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
                    
                    {/* Header Row */}
                    <div className="flex justify-between items-start mb-4">
                       <h3 className="text-3xl font-black text-gray-900">{auction.player_name}</h3>
                       {isPending && <span className="bg-yellow-100 text-yellow-700 text-xs font-black uppercase px-3 py-1 rounded-full border border-yellow-200">Waiting</span>}
                       {isActive && <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border ${isUrgent ? 'bg-red-600 text-white border-red-700' : 'bg-red-100 text-red-600 border-red-200 animate-pulse'} flex items-center gap-1`}>LIVE ⏳ {timeLeft}s</span>}
                       {isFinished && <span className="bg-green-100 text-green-700 text-xs font-black uppercase px-3 py-1 rounded-full border border-green-200">SOLD 🎉</span>}
                    </div>

                    {/* Price Display */}
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

                    {/* Pending State: Start Button */}
                    {isPending && (
                       <button 
                         onClick={() => startAuctionTimer(auction.id)}
                         className="w-full bg-yellow-400 text-yellow-900 px-6 py-3 rounded-xl font-black text-lg hover:bg-yellow-500 transition-colors"
                       >
                         Admin: Start 30s Timer
                       </button>
                    )}

                    {/* Active State: Bid Input */}
                    {isActive && (
                       <div className="flex gap-2">
                          <input 
                            type="number" 
                            step="0.1"
                            placeholder={`> ${auction.current_bid}`}
                            className="flex-1 p-3 border-2 border-gray-200 rounded-xl font-bold text-lg outline-none focus:border-blue-500"
                            value={bidInputs[auction.id] || ''}
                            onChange={(e) => setBidInputs({...bidInputs, [auction.id]: parseFloat(e.target.value)})}
                          />
                          <button 
                            onClick={() => placeBid(auction.id, auction.current_bid, auction.end_time)}
                            className="bg-blue-600 text-white px-8 rounded-xl font-black text-lg hover:bg-blue-700 active:scale-95 transition-transform"
                          >
                            BID
                          </button>
                       </div>
                    )}

                    {/* Finished State / Admin Clear */}
                    {(isFinished || isPending) && (
                      <button onClick={() => archiveAuction(auction.id)} className="w-full mt-4 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest">
                        Admin: Clear / Hide Auction
                      </button>
                    )}
                 </div>
              )})}
              
              {currentSeasonAuctions.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                  <p className="text-gray-500 font-bold text-lg">The Auction House is currently empty for this season.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}