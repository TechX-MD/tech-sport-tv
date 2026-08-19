const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// REAL TELEGRAM CREDENTIALS
const TELEGRAM_BOT_TOKEN = "8903172225:AAGqHqHpBRNVXdj7Ic0KadYo_LRza_6DrhE";
const TELEGRAM_CHANNEL_ID = "@TechxMD1";

const ESPN_LEAGUES = [
  { code: "eng.1", name: "🏆 Premier League 🇬🇧" },
  { code: "uefa.champions", name: "🏆 UEFA Champions League 🇪🇺" },
  { code: "esp.1", name: "🏆 La Liga 🇪🇸" },
  { code: "ita.1", name: "🏆 Serie A 🇮🇹" },
  { code: "ger.1", name: "🏆 Bundesliga 🇩🇪" }
];

let trackedMatches = {};

// ROOT ROUTE
app.get('/', (req, res) => {
  res.status(200).send(`
    <div style="background:#0b1120;color:#2dd4bf;padding:40px;font-family:sans-serif;text-align:center;min-height:100vh;">
      <h1>⚽ TECH SPORT TV WEBHOOK ENGINE IS ONLINE!</h1>
      <p style="color:#94a3b8;">Telegram Channel: <b>@TechxMD1</b></p>
      <p style="color:#10b981;">Status: 200 OK (Clean Webhook Architecture)</p>
    </div>
  `);
});

// SEND ALERT TO TELEGRAM CHANNEL
async function sendTelegramAlert(message) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHANNEL_ID,
        text: message,
        parse_mode: "HTML"
      })
    });
    const data = await res.json();
    if (data.ok) {
      console.log("✅ TELEGRAM ALERT SENT TO @TechxMD1!");
    } else {
      console.error("❌ Telegram Error:", data.description);
    }
    return data;
  } catch (err) {
    console.error("❌ Network Error:", err.message);
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

// REAL LIVE SOCCER SCORE ENGINE
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

        const currentMatch = {
          id: matchId,
          league: league.name,
          homeTeam: homeName,
          awayTeam: awayName,
          homeScore: homeScore,
          awayScore: awayScore,
          minute: minute,
          status: statusType
        };

        const prevMatch = trackedMatches[matchId];

        if (prevMatch) {
          if (homeScore > prevMatch.homeScore) {
            const msg = `⚽ <b>GOAL ALERT!</b>\n━━━━━━━━━━━━━━━\n${league.name}\n\n🔵 <b>${homeName}</b> ${homeScore}\n🔴 ${awayName} ${awayScore}\n\n⏱️ Minute: ${minute}\n🔥 <b>${homeName}</b> score!\n━━━━━━━━━━━━━━━\n📺 <b>TECH SPORT TV</b>`;
            sendTelegramAlert(msg);
          }

          if (awayScore > prevMatch.awayScore) {
            const msg = `⚽ <b>GOAL ALERT!</b>\n━━━━━━━━━━━━━━━\n${league.name}\n\n🔵 ${homeName} ${homeScore}\n🔴 <b>${awayName}</b> ${awayScore}\n\n⏱️ Minute: ${minute}\n🔥 <b>${awayName}</b> score!\n━━━━━━━━━━━━━━━\n📺 <b>TECH SPORT TV</b>`;
            sendTelegramAlert(msg);
          }

          if (statusType === "STATUS_HALFTIME" && prevMatch.status !== "STATUS_HALFTIME") {
            const msg = `⏸️ <b>HALF TIME STARTED / BREAK</b>\n━━━━━━━━━━━━━━━\n${league.name}\n\n🔵 <b>${homeName}</b> ${homeScore} - ${awayScore} ${homeName} 🔴\n\n⏱️ 45' Half Time Intervane\n━━━━━━━━━━━━━━━\n📺 <b>TECH SPORT TV</b>`;
            sendTelegramAlert(msg);
          }

          if (statusType === "STATUS_IN_PLAY" && prevMatch.status === "STATUS_HALFTIME") {
            const msg = `🔔 <b>2ND HALF KICK-OFF / STARTED</b>\n━━━━━━━━━━━━━━━\n${league.name}\n\n🔵 ${homeName} ${homeScore} - ${awayScore} ${awayName} 🔴\n\n⏱️ 2nd Half Underway!\n━━━━━━━━━━━━━━━\n📺 <b>TECH SPORT TV</b>`;
            sendTelegramAlert(msg);
          }

          if ((statusType === "STATUS_FINAL" || statusType === "STATUS_FULL_TIME") && prevMatch.status !== "STATUS_FINAL") {
            const msg = `🏁 <b>FULL TIME / MATCH ENDED</b>\n━━━━━━━━━━━━━━━\n${league.name}\n\n🔵 <b>${homeName}</b> ${homeScore} - ${awayScore} <b>${awayName}</b> 🔴\n\n⏱️ Final Score\n━━━━━━━━━━━━━━━\n📺 <b>TECH SPORT TV</b>`;
            sendTelegramAlert(msg);
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

// TELEGRAM WEBHOOK (INSTANT COMMANDS ON VERCEL)
app.post('/api/telegram-webhook', async (req, res) => {
  try {
    const update = req.body;
    const msg = update.message || update.channel_post || update.edited_channel_post;

    if (msg && msg.text) {
      const text = msg.text.trim().toLowerCase();
      console.log(`📩 Webhook Command Received: "${text}"`);

      if (text.includes('fixture') || text.includes('fixtures') || text === '/today' || text === '/tomorrow') {
        const { dateStr, label } = parseDateFromText(text);
        const fixText = await fetchRealFixturesForDate(dateStr, label);
        await sendTelegramAlert(fixText);
      } else if (text.includes('/table') || text.includes('table')) {
        let leagueCode = 'eng.1', leagueName = 'Premier League';
        if (text.includes('laliga')) { leagueCode = 'esp.1'; leagueName = 'La Liga'; }
        else if (text.includes('cl') || text.includes('champions')) { leagueCode = 'uefa.champions'; leagueName = 'Champions League'; }
        else if (text.includes('seriea')) { leagueCode = 'ita.1'; leagueName = 'Serie A'; }
        else if (text.includes('bundesliga')) { leagueCode = 'ger.1'; leagueName = 'Bundesliga'; }

        const tableText = await fetchRealLiveStandings(leagueCode, leagueName);
        if (tableText) await sendTelegramAlert(tableText);
      }
    }
  } catch (e) {
    console.error("Webhook processing error:", e.message);
  }

  return res.status(200).send("OK");
});

// SET WEBHOOK WITH FULL CHANNEL POST PERMISSIONS
app.get('/api/set-webhook', async (req, res) => {
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const webhookUrl = `${protocol}://${host}/api/telegram-webhook`;

  try {
    // Delete old webhook first
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`);

    // Set new webhook with channel_post allowed_updates
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

// TEST TELEGRAM DIRECTLY FROM VERCEL
app.get('/api/test-telegram', async (req, res) => {
  const result = await sendTelegramAlert("⚽ <b>Tech Sport TV Bot is Live & Connected to Vercel!</b>");
  return res.json({ result });
});

// VERCEL 24/7 CRON ENDPOINT
app.all('/api/cron', async (req, res) => {
  await fetchLiveScoresFromESPN();
  return res.status(200).json({ success: true, timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;
