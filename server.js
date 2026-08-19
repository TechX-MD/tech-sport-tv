const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// REAL TELEGRAM CREDENTIALS
const TELEGRAM_BOT_TOKEN = "8903172225:AAGqHqHpBRNVXdj7Ic0KadYo_LRza_6DrhE";
const TELEGRAM_CHANNEL_ID = "@TechxMD1";

// EXACT 7 LEAGUES FROM YOUR IMAGE
const ESPN_LEAGUES = [
  { code: "eng.1", name: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League" },
  { code: "esp.1", name: "🇪🇸 LaLiga" },
  { code: "ger.1", name: "🇩🇪 Bundesliga" },
  { code: "ita.1", name: "🇮🇹 Serie A" },
  { code: "fra.1", name: "🇫🇷 Ligue 1" },
  { code: "eng.2", name: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Championship" },
  { code: "uefa.champions", name: "🇪🇺 Champions League" }
];

let trackedMatches = {};

// ROOT ROUTE
app.get('/', (req, res) => {
  res.status(200).send(`
    <div style="background:#0b1120;color:#f59e0b;padding:40px;font-family:sans-serif;text-align:center;min-height:100vh;">
      <h1>⚽ TECH SPORT TV FINAL ENGINE ACTIVE!</h1>
      <p style="color:#94a3b8;">Telegram Channel: <b>@TechxMD1</b></p>
      <p style="color:#10b981;">Status: 200 OK (Live Minutes Active for /live & live all)</p>
    </div>
  `);
});

// SEND ALERT TO TELEGRAM CHANNEL
async function sendTelegramAlert(targetChatId, message) {
  try {
    const chatId = targetChatId || TELEGRAM_CHANNEL_ID;
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML"
      })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Telegram send error:", err.message);
    return null;
  }
}

// TIME HELPER: AFRICA (CAT) & UK TIME
function formatMatchTimes(dateIsoString) {
  if (!dateIsoString) return "TBD";
  const d = new Date(dateIsoString);
  if (isNaN(d.getTime())) return "TBD";

  const catTime = new Date(d.getTime() + (2 * 3600 * 1000));
  const catHours = String(catTime.getUTCHours()).padStart(2, '0');
  const catMins = String(catTime.getUTCMinutes()).padStart(2, '0');

  const ukTime = new Date(d.getTime() + (1 * 3600 * 1000));
  const ukHours = String(ukTime.getUTCHours()).padStart(2, '0');
  const ukMins = String(ukTime.getUTCMinutes()).padStart(2, '0');

  return `${catHours}:${catMins} CAT | ${ukHours}:${ukMins} UK`;
}

function getYYYYMMDD(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function getFormattedDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function parseDateFromText(text) {
  const lower = text.toLowerCase();
  if (lower.includes('today')) return { dateStr: getYYYYMMDD(0), label: getFormattedDateString(0) };
  if (lower.includes('tomorrow')) return { dateStr: getYYYYMMDD(1), label: getFormattedDateString(1) };

  const clean = text.replace(/fixtures|fixture|\/fixtures|\/fixture/gi, '').trim();
  const parsedTime = Date.parse(clean);

  if (!isNaN(parsedTime)) {
    const d = new Date(parsedTime);
    if (d.getFullYear() < 2020) d.setFullYear(2026);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    const dateStr = `${year}${month}${day}`;
    const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    return { dateStr, label };
  }

  return { dateStr: getYYYYMMDD(0), label: getFormattedDateString(0) };
}

// GENERATE DYNAMIC ALL LIVE MATCHES BULLETIN WITH EXACT LIVE MINUTES
async function fetchRealLiveMatchesBulletin() {
  let bulletin = `🔴 <b>TECH SPORT TV — LIVE MATCHES BULLETIN</b>\n━━━━━━━━━━━━━━━\n\n`;
  let liveCount = 0;

  for (const league of ESPN_LEAGUES) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.code}/scoreboard`;
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();
      const events = data.events || [];

      const inPlayEvents = events.filter(ev => {
        const st = ev.status?.type?.name;
        return st === 'STATUS_IN_PLAY' || st === 'STATUS_HALFTIME';
      });

      if (inPlayEvents.length > 0) {
        bulletin += `${league.name}\n`;
        inPlayEvents.forEach(ev => {
          liveCount++;
          const comp = ev.competitions && ev.competitions[0];
          const home = comp.competitors.find(c => c.homeAway === 'home');
          const away = comp.competitors.find(c => c.homeAway === 'away');
          
          // Exact Live Minutes Formatting
          const rawDetail = ev.status?.type?.shortDetail || ev.status?.displayClock || 'LIVE';
          const displayMin = rawDetail === 'HT' ? 'Half Time' : (rawDetail.includes("'") ? rawDetail : `${rawDetail}'`);

          const hName = home?.team?.name || 'Home';
          const aName = away?.team?.name || 'Away';
          const hScore = home?.score || '0';
          const aScore = away?.score || '0';

          bulletin += `• 🔵 <b>${hName}</b> ${hScore} - ${aScore} 🔴 <b>${aName}</b> (⏱️ ${displayMin})\n`;
        });
        bulletin += `\n`;
      }
    } catch (e) {}
  }

  if (liveCount === 0) {
    return await fetchRealFixturesForDate(getYYYYMMDD(0), "TODAY'S SCHEDULED MATCHES");
  }

  bulletin += `📌 <i>Live Scores Updated</i>\n━━━━━━━━━━━━━━━\n📺 <b>TECH SPORT TV</b>`;
  return bulletin;
}

// FETCH REAL FIXTURES
async function fetchRealFixturesForDate(dateStr, dateLabel) {
  let fixturesText = `📅 <b>REAL FOOTBALL FIXTURES</b>\n🗓️ <i>${dateLabel}</i>\n━━━━━━━━━━━━━━━\n\n`;
  let hasMatches = false;

  for (const league of ESPN_LEAGUES) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.code}/scoreboard?dates=${dateStr}`;
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();
      const events = data.events || [];

      if (events.length > 0) {
        hasMatches = true;
        fixturesText += `${league.name}\n`;

        events.forEach(ev => {
          const comp = ev.competitions && ev.competitions[0];
          if (!comp) return;

          const home = comp.competitors.find(c => c.homeAway === 'home')?.team?.name || 'Home';
          const away = comp.competitors.find(c => c.homeAway === 'away')?.team?.name || 'Away';
          const status = ev.status?.type?.name;
          const timeFormatted = formatMatchTimes(ev.date);

          let scoreDisplay = `vs`;
          if (status === 'STATUS_IN_PLAY' || status === 'STATUS_HALFTIME' || status === 'STATUS_FINAL') {
            const hScore = comp.competitors.find(c => c.homeAway === 'home')?.score || '0';
            const aScore = comp.competitors.find(c => c.homeAway === 'away')?.score || '0';
            scoreDisplay = `<b>${hScore} - ${aScore}</b> (${ev.status?.type?.shortDetail || 'LIVE'})`;
          } else {
            scoreDisplay = `vs 🔴 <b>${away}</b> (${timeFormatted})`;
          }

          fixturesText += `• 🔵 <b>${home}</b> ${scoreDisplay}\n`;
        });

        fixturesText += `\n`;
      }
    } catch (e) {}
  }

  if (!hasMatches) {
    fixturesText += `<i>No scheduled major league fixtures found for ${dateLabel}.</i>\n\n`;
  }

  fixturesText += `📌 <i>Fetched Live from Sports Engine</i>\n━━━━━━━━━━━━━━━\n📺 <b>TECH SPORT TV</b>`;
  return fixturesText;
}

// REAL LIVE SOCCER SCORE ENGINE WITH GOALSCORERS & LIVE MINUTES
async function fetchLiveScoresFromESPN() {
  for (const league of ESPN_LEAGUES) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.code}/scoreboard`;
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();
      const events = data.events || [];

      for (const ev of events) {
        const comp = ev.competitions && ev.competitions[0];
        if (!comp) continue;

        const home = comp.competitors.find(c => c.homeAway === 'home');
        const away = comp.competitors.find(c => c.homeAway === 'away');
        if (!home || !away) continue;

        const matchId = ev.id;
        const homeName = home.team.name;
        const awayName = away.team.name;
        const homeScore = parseInt(home.score || "0", 10);
        const awayScore = parseInt(away.score || "0", 10);
        const statusType = ev.status?.type?.name || "";
        const minute = ev.status?.type?.shortDetail || "LIVE";

        let lastScorerName = "Goal Scored";
        if (comp.details && comp.details.length > 0) {
          const lastDetail = comp.details[comp.details.length - 1];
          if (lastDetail && lastDetail.athletes && lastDetail.athletes[0]) {
            lastScorerName = `${lastDetail.athletes[0].displayName} (${minute})`;
          }
        }

        const currentMatch = {
          id: matchId,
          league: league.name,
          homeTeam: homeName,
          awayTeam: awayName,
          homeScore: homeScore,
          awayScore: awayScore,
          minute: minute,
          status: statusType,
          lastScorer: lastScorerName
        };

        const prevMatch = trackedMatches[matchId];

        if (prevMatch) {
          if (homeScore > prevMatch.homeScore) {
            const msg = `⚽ <b>GOAL ALERT!</b>\n━━━━━━━━━━━━━━━\n${league.name}\n\n🔵 <b>${homeName}</b> ${homeScore}\n🔴 ${awayName} ${awayScore}\n\n⏱️ Minute: <b>${minute}</b>\n⚽ <b>Goalscorer:</b> ${lastScorerName}\n🔥 <b>${homeName}</b> score!\n━━━━━━━━━━━━━━━\n📺 <b>TECH SPORT TV</b>`;
            await sendTelegramAlert(TELEGRAM_CHANNEL_ID, msg);
          }

          if (awayScore > prevMatch.awayScore) {
            const msg = `⚽ <b>GOAL ALERT!</b>\n━━━━━━━━━━━━━━━\n${league.name}\n\n🔵 ${homeName} ${homeScore}\n🔴 <b>${awayName}</b> ${awayScore}\n\n⏱️ Minute: <b>${minute}</b>\n⚽ <b>Goalscorer:</b> ${lastScorerName}\n🔥 <b>${awayName}</b> score!\n━━━━━━━━━━━━━━━\n📺 <b>TECH SPORT TV</b>`;
            await sendTelegramAlert(TELEGRAM_CHANNEL_ID, msg);
          }

          if (statusType === "STATUS_HALFTIME" && prevMatch.status !== "STATUS_HALFTIME") {
            const msg = `⏸️ <b>HALF TIME STARTED / BREAK</b>\n━━━━━━━━━━━━━━━\n${league.name}\n\n🔵 <b>${homeName}</b> ${homeScore} - ${awayScore} <b>${awayName}</b> 🔴\n\n⏱️ 45' Half Time Intervane\n━━━━━━━━━━━━━━━\n📺 <b>TECH SPORT TV</b>`;
            await sendTelegramAlert(TELEGRAM_CHANNEL_ID, msg);
          }

          if (statusType === "STATUS_IN_PLAY" && prevMatch.status === "STATUS_HALFTIME") {
            const msg = `🔔 <b>2ND HALF KICK-OFF / STARTED</b>\n━━━━━━━━━━━━━━━\n${league.name}\n\n🔵 ${homeName} ${homeScore} - ${awayScore} ${awayName} 🔴\n\n⏱️ 2nd Half Underway!\n━━━━━━━━━━━━━━━\n📺 <b>TECH SPORT TV</b>`;
            await sendTelegramAlert(TELEGRAM_CHANNEL_ID, msg);
          }

          if ((statusType === "STATUS_FINAL" || statusType === "STATUS_FULL_TIME") && prevMatch.status !== "STATUS_FINAL") {
            const msg = `🏁 <b>MATCH ENDED / FULL TIME</b>\n━━━━━━━━━━━━━━━\n${league.name}\n\n🔵 <b>${homeName}</b> ${homeScore} - ${awayScore} <b>${awayName}</b> 🔴\n\n⏱️ Final Score\n━━━━━━━━━━━━━━━\n📺 <b>TECH SPORT TV</b>`;
            await sendTelegramAlert(TELEGRAM_CHANNEL_ID, msg);
          }
        }

        trackedMatches[matchId] = currentMatch;
      }
    } catch (err) {}
  }
}

// FETCH REAL LIVE STANDINGS (1-20)
async function fetchRealLiveStandings(leagueCode, leagueName) {
  try {
    const url = `https://site.api.espn.com/apis/v2/sports/soccer/${leagueCode}/standings`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const entries = data.children?.[0]?.standings?.entries || data.standings?.entries || [];

      if (entries.length > 0) {
        let tableText = `🏆 <b>${leagueName.toUpperCase()} STANDINGS 2026</b>\n━━━━━━━━━━━━━━━\n`;
        
        entries.slice(0, 20).forEach((entry, idx) => {
          const rank = idx + 1;
          const teamName = entry.team?.displayName || entry.team?.name || 'Team';
          const stats = entry.stats || [];

          const pts = stats.find(s => s.name === 'points')?.value ?? 0;
          const gp = stats.find(s => s.name === 'gamesPlayed')?.value ?? 0;
          const gd = stats.find(s => s.name === 'pointDifferential')?.value ?? 0;
          const gdSign = gd > 0 ? `+${gd}` : `${gd}`;

          let badge = "🔹";
          if (rank === 1) badge = "🥇";
          else if (rank === 2) badge = "🥈";
          else if (rank === 3) badge = "🥉";
          else if (rank >= 18) badge = "🔻";

          tableText += `${badge} <b>${rank}. ${teamName}</b> — ${gp} GP | <b>${pts} Pts</b> (GD: ${gdSign})\n`;
        });

        tableText += `\n🥇 <i>UCL Zone</i> | 🔹 <i>European Zone</i> | 🔻 <i>Relegation</i>\n━━━━━━━━━━━━━━━\n📺 <b>TECH SPORT TV</b>`;
        return tableText;
      }
    }
  } catch (e) {}
  return null;
}

// TELEGRAM WEBHOOK (RESPONDS TO /live, live all, /table, FIXTURES)
app.post('/api/telegram-webhook', async (req, res) => {
  try {
    const update = req.body;
    const msg = update.message || update.channel_post || update.edited_channel_post;

    if (msg && msg.text) {
      const targetChatId = msg.chat.id || TELEGRAM_CHANNEL_ID;
      const text = msg.text.trim().toLowerCase();
      console.log(`📩 Webhook Received in Chat (${targetChatId}): "${text}"`);

      // MATCH ALL VARIATIONS OF LIVE COMMANDS
      if (text.includes('/live') || text.includes('live match') || text.includes('live matches') || text.includes('live all') || text.includes('all live') || text === 'live') {
        console.log("🔴 Fetching Live Matches Bulletin with Live Minutes...");
        const liveText = await fetchRealLiveMatchesBulletin();
        await sendTelegramAlert(targetChatId, liveText);
      } else if (text.includes('fixture') || text.includes('fixtures') || text === '/today' || text === '/tomorrow') {
        const { dateStr, label } = parseDateFromText(text);
        const fixText = await fetchRealFixturesForDate(dateStr, label);
        await sendTelegramAlert(targetChatId, fixText);
      } else if (text.includes('/table') || text.includes('table')) {
        let leagueCode = 'eng.1', leagueName = 'Premier League';
        if (text.includes('laliga')) { leagueCode = 'esp.1'; leagueName = 'La Liga'; }
        else if (text.includes('bundesliga')) { leagueCode = 'ger.1'; leagueName = 'Bundesliga'; }
        else if (text.includes('seriea')) { leagueCode = 'ita.1'; leagueName = 'Serie A'; }
        else if (text.includes('ligue1')) { leagueCode = 'fra.1'; leagueName = 'Ligue 1'; }
        else if (text.includes('championship')) { leagueCode = 'eng.2'; leagueName = 'Championship'; }
        else if (text.includes('cl') || text.includes('champions')) { leagueCode = 'uefa.champions'; leagueName = 'Champions League'; }

        const tableText = await fetchRealLiveStandings(leagueCode, leagueName);
        if (tableText) await sendTelegramAlert(targetChatId, tableText);
      }
    }
  } catch (e) {
    console.error("Webhook processing error:", e.message);
  }

  return res.status(200).send("OK");
});

// CRON ENDPOINT FOR CRON-JOB.ORG
app.all('/api/cron', async (req, res) => {
  try {
    await fetchLiveScoresFromESPN();
    return res.status(200).json({ success: true, timestamp: new Date().toISOString() });
  } catch (e) {
    return res.status(200).json({ success: false, error: e.message });
  }
});

// SET WEBHOOK ROUTE
app.get('/api/set-webhook', async (req, res) => {
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const webhookUrl = `${protocol}://${host}/api/telegram-webhook`;

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`);

    const tgUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`;
    const tgRes = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "edited_message", "channel_post", "edited_channel_post"]
      })
    });
    const data = await tgRes.json();
    return res.json({ success: data.ok, telegramResponse: data, webhookUrl });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

const PORT_NUM = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT_NUM, () => console.log(`Server listening on port ${PORT_NUM}`));
}

module.exports = app;
