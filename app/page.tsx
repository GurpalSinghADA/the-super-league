"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

export default function Home() {
  const [managers, setManagers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'league' | 'transfers'>('league');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [password, setPassword] = useState('');
  
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);

  const [playerName, setPlayerName] = useState('');
  const [acquiringManagerId, setAcquiringManagerId] = useState('');
  const [transferFee, setTransferFee] = useState<number | ''>('');

  useEffect(() => {
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
      setLoading(false);
    }
    fetchData();
  }, []);

  const currentSeasonMatches = matches.filter(match => match.season_id === selectedSeasonId);
  const currentSeasonTransfers = transfers.filter(transfer => transfer.season_id === selectedSeasonId);

  // Calculate League Table
  const calculateTable = () => {
    let table: Record<string, any> = {};
    managers.forEach(m => {
      table[m.id] = { id: m.id, name: m.name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    });

    currentSeasonMatches.forEach(match => {
      if (!table[match.home_manager_id] || !table[match.away_manager_id]) return;
      const home = table[match.home_manager_id];
      const away = table[match.away_manager_id];

      home.p += 1; away.p += 1;
      home.gf += match.home_goals; away.gf += match.away_goals;
      home.ga += match.away_goals; away.ga += match.home_goals;

      if (match.home_goals > match.away_goals) {
        home.w += 1; home.pts += 3; away.l += 1;
      } else if (match.home_goals < match.away_goals) {
        away.w += 1; away.pts += 3; home.l += 1;
      } else {
        home.d += 1; home.pts += 1; away.d += 1; away.pts += 1;
      }
      home.gd = home.gf - home.ga; away.gd = away.gf - away.ga;
    });

    return Object.values(table).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  };

  const leagueTable = calculateTable();

  // Calculate Net Spend Balances
  const managerBalances = managers.map(m => {
    const mTransfers = currentSeasonTransfers.filter(t => t.manager_id === m.id);
    const net = mTransfers.reduce((sum, t) => sum + Number(t.transfer_fee), 0);
    return { ...m, net };
  });

  const submitMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== "1") return alert("Incorrect password!");
    if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId || !selectedSeasonId) return alert("Please select valid teams!");

    const { error } = await supabase.from('matches').insert([
      { season_id: selectedSeasonId, home_manager_id: homeTeamId, away_manager_id: awayTeamId, home_goals: homeGoals, away_goals: awayGoals }
    ]);

    if (!error) {
      const { data: newMatches } = await supabase.from('matches').select('*, home:home_manager_id(name), away:away_manager_id(name)');
      if (newMatches) setMatches(newMatches);
      setHomeGoals(0); setAwayGoals(0); setHomeTeamId(''); setAwayTeamId(''); setPassword(''); 
    }
  };

  const submitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== "1") return alert("Incorrect password!");
    if (!playerName || !acquiringManagerId || transferFee === '' || !selectedSeasonId) return alert("Please fill in details!");

    const { error } = await supabase.from('transfers').insert([
      { season_id: selectedSeasonId, manager_id: acquiringManagerId, player_name: playerName, transfer_fee: transferFee }
    ]);

    if (!error) {
      const { data: newTransfers } = await supabase.from('transfers').select('*, manager:manager_id(name)');
      if (newTransfers) setTransfers(newTransfers);
      setPlayerName(''); setAcquiringManagerId(''); setTransferFee(''); setPassword('');
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500 font-medium">Loading the pitch...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="text-center py-6">
          <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            The Super League
          </h1>
          <p className="mt-2 text-gray-500 font-medium">Official Match Tracking & Transfer Market</p>
        </div>
        
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
            <button onClick={() => setActiveTab('league')} className={`flex-1 md:w-32 py-2 px-4 rounded-lg font-bold text-sm transition-all ${activeTab === 'league' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>⚽ League</button>
            <button onClick={() => setActiveTab('transfers')} className={`flex-1 md:w-32 py-2 px-4 rounded-lg font-bold text-sm transition-all ${activeTab === 'transfers' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>🤝 Transfers</button>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <label className="text-gray-500 uppercase tracking-wide text-xs font-bold whitespace-nowrap">Season:</label>
            <select className="p-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg font-bold text-md focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" value={selectedSeasonId} onChange={(e) => setSelectedSeasonId(e.target.value)}>
              {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {activeTab === 'league' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">🏆 League Standings</h2>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-y border-gray-200 text-gray-500 text-sm uppercase tracking-wider">
                    <th className="p-4 font-semibold rounded-tl-lg">Manager</th>
                    <th className="p-4 font-semibold">P</th>
                    <th className="p-4 font-semibold">W</th>
                    <th className="p-4 font-semibold">D</th>
                    <th className="p-4 font-semibold">L</th>
                    <th className="p-4 font-semibold">GD</th>
                    <th className="p-4 font-bold text-blue-600 rounded-tr-lg">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leagueTable.map((row, index) => (
                    <tr key={row.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <span className="text-gray-400 font-medium text-sm">{index + 1}</span>
                        <span className="font-bold text-gray-800">{row.name}</span>
                      </td>
                      <td className="p-4 text-gray-600">{row.p}</td>
                      <td className="p-4 text-gray-600">{row.w}</td>
                      <td className="p-4 text-gray-600">{row.d}</td>
                      <td className="p-4 text-gray-600">{row.l}</td>
                      <td className="p-4 text-gray-600 font-medium">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                      <td className="p-4 font-black text-blue-600 text-lg">{row.pts}</td>
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
                        <select className="p-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer" value={homeTeamId} onChange={(e) => setHomeTeamId(e.target.value)}>
                           <option value="">Select Manager...</option>
                           {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                     </div>
                     <div className="flex items-center gap-3 w-full md:w-1/5 justify-center">
                        <input type="number" min="0" className="w-16 p-3 bg-white border border-gray-300 shadow-inner text-center text-2xl font-black text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={homeGoals} onChange={(e) => setHomeGoals(parseInt(e.target.value) || 0)} />
                        <span className="font-bold text-gray-400 text-xl">-</span>
                        <input type="number" min="0" className="w-16 p-3 bg-white border border-gray-300 shadow-inner text-center text-2xl font-black text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={awayGoals} onChange={(e) => setAwayGoals(parseInt(e.target.value) || 0)} />
                     </div>
                     <div className="flex flex-col w-full md:w-2/5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Away Team</label>
                        <select className="p-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer" value={awayTeamId} onChange={(e) => setAwayTeamId(e.target.value)}>
                           <option value="">Select Manager...</option>
                           {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                     </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 items-end pt-2">
                    <div className="flex flex-col w-full md:w-1/3">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Admin Password</label>
                      <input type="password" placeholder="••••••••" className="p-3 bg-white border border-gray-300 text-gray-900 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <button type="submit" className="w-full md:w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg shadow-md transition-all">Submit Final Score</button>
                  </div>
               </form>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">📅 Season Matches</h2>
              {currentSeasonMatches.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <p className="text-gray-500 font-medium">No matches logged for this season yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentSeasonMatches.slice().reverse().map((match) => (
                    <div key={match.id} className="bg-white border border-gray-100 p-4 rounded-xl flex justify-between items-center text-lg">
                      <span className="w-1/3 text-right font-bold text-gray-700">{match.home?.name}</span>
                      <span className="w-1/3 flex justify-center">
                        <span className="bg-gray-50 border border-gray-200 px-4 py-1.5 rounded-full text-blue-600 font-black font-mono tracking-widest shadow-inner">{match.home_goals} - {match.away_goals}</span>
                      </span>
                      <span className="w-1/3 text-left font-bold text-gray-700">{match.away?.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'transfers' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {managerBalances.map(mb => (
                  <div key={mb.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center items-center">
                     <h4 className="text-gray-500 font-bold uppercase tracking-wide text-xs mb-2">{mb.name}'s Net Spend</h4>
                     <p className={`text-3xl font-black ${mb.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {mb.net >= 0 ? '+' : ''}£{mb.net}M
                     </p>
                  </div>
               ))}
            </div>

            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
               <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">📝 Log Transfer Activity</h2>
               <form onSubmit={submitTransfer} className="flex flex-col space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
                     <div className="flex flex-col w-full md:w-1/3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Player Name</label>
                        <input type="text" placeholder="e.g. Jude Bellingham" className="p-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
                     </div>
                     <div className="flex flex-col w-full md:w-1/3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Manager</label>
                        <select className="p-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer" value={acquiringManagerId} onChange={(e) => setAcquiringManagerId(e.target.value)}>
                           <option value="">Select Manager...</option>
                           {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                     </div>
                     <div className="flex flex-col w-full md:w-1/3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Fee (Use - for Money Spent)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-400 font-bold">£</span>
                          <input type="number" step="0.1" placeholder="0.0" className="p-3 pl-8 bg-white border border-gray-300 text-gray-900 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" value={transferFee} onChange={(e) => setTransferFee(e.target.value === '' ? '' : parseFloat(e.target.value))} />
                          <span className="absolute right-3 top-3 text-gray-400 font-bold">M</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 items-end pt-2">
                    <div className="flex flex-col w-full md:w-1/3">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Admin Password</label>
                      <input type="password" placeholder="••••••••" className="p-3 bg-white border border-gray-300 text-gray-900 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <button type="submit" className="w-full md:w-2/3 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-lg shadow-md transition-all">Confirm Transfer</button>
                  </div>
               </form>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">🔄 Season Transfer Activity</h2>
              {currentSeasonTransfers.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <p className="text-gray-500 font-medium">No transfer activity for this season yet.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {currentSeasonTransfers.slice().reverse().map((transfer) => (
                    <div key={transfer.id} className="bg-white border border-gray-100 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center shadow-sm hover:shadow-md transition-all">
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
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}