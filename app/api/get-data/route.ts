// @ts-nocheck
import { sql } from '@vercel/postgres';
import axios from 'axios';
import { NextResponse } from 'next/server';
import { currentTourneyId } from '../../constants';

const tourneyDataOptions = {
    method: 'GET',
    url: 'https://live-golf-data.p.rapidapi.com/leaderboard',
    headers: {
        'X-RapidAPI-Key': process.env.NEXT_PUBLIC_RAPID_API_KEY,
        'X-RapidAPI-Host': 'live-golf-data.p.rapidapi.com'
    }
};

const getAllLowPicks = (playerPicksData, lowPicks, pickIdsToIgnore, roundKey) => {
    const winningPickUserId = lowPicks[0].user_id;
    const playerPicks = playerPicksData.filter(playerPick => playerPick.user_id === winningPickUserId)[0];
    const winningPicks = playerPicks.picks.filter(pick => lowPicks.some(lowPick => pick.pick_id === lowPick.pick.pick_id) || pickIdsToIgnore.some(pickId => pickId === pick.pick_id));
    const formattedWinningPicks = winningPicks.map(pick => ({
        name: playerPicks.name,
        username: playerPicks.username,
        user_id: playerPicks.user_id,
        pick
    }));
    return formattedWinningPicks.sort((a, b) => a.pick[roundKey] - b.pick[roundKey]);
};

const calculateLowRound = (playerPicksData, roundKey, pickIdsToIgnore = [], userIdsToIgnore = []) => {
    let currentLow = 1000;
    let currentLowPicks = [];

    const playerPicksDataToCheck = playerPicksData.filter(playerPick => userIdsToIgnore.every(userId => userId !== playerPick.user_id));

    playerPicksDataToCheck.forEach((player) => {
        player.picks.forEach(pick => {
            if (!pick[roundKey]) return;
            if (pickIdsToIgnore.some(id => id === pick.pick_id)) return;

            if (pick[roundKey] === currentLow) {
                currentLowPicks = [...currentLowPicks, { pick, user_id: player.user_id, name: player.name, username: player.username }];
            }
            if (pick[roundKey] < currentLow) {
                currentLow = pick[roundKey];
                currentLowPicks = [{ pick, user_id: player.user_id, name: player.name, username: player.username }];
            }
        });
    });

    if (currentLowPicks.length === 0) return null;
    if (currentLowPicks.length === 1) return getAllLowPicks(playerPicksData, currentLowPicks, pickIdsToIgnore, roundKey);

    const lowPickUserIds = currentLowPicks.map(lp => lp.user_id);
    const countPerUser = {};
    lowPickUserIds.forEach(id => { countPerUser[id] = (countPerUser[id] || 0) + 1; });

    let maxCount = 0;
    let usersWithMost = [];
    Object.keys(countPerUser).forEach(id => {
        if (countPerUser[id] === maxCount) usersWithMost.push(id);
        if (countPerUser[id] > maxCount) { maxCount = countPerUser[id]; usersWithMost = [id]; }
    });

    if (usersWithMost.length === 1) {
        const lowestPicks = currentLowPicks.filter(lp => `${lp.user_id}` === usersWithMost[0]);
        return getAllLowPicks(playerPicksData, lowestPicks, pickIdsToIgnore, roundKey);
    }

    const playersWithoutLow = playerPicksData.filter(p => currentLowPicks.every(lp => lp.user_id !== p.user_id));
    const nextUserIdsToIgnore = [...new Set([...playersWithoutLow.map(p => p.user_id), ...userIdsToIgnore])];
    const nextPickIdsToIgnore = [...currentLowPicks.map(lp => lp.pick.pick_id), ...pickIdsToIgnore];
    return calculateLowRound(playerPicksData, roundKey, nextPickIdsToIgnore, nextUserIdsToIgnore);
};

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const tourneyIdToGet = body?.tourneyId || currentTourneyId;
        const currentYear = '2025';
        const tourneyId = `${tourneyIdToGet}-${currentYear}`;

        const [picksSql, usersSql, tourneyDataResponse] = await Promise.all([
            sql`SELECT * FROM picks WHERE tournament=${tourneyId};`,
            sql`SELECT * FROM users;`,
            axios.request({
                ...tourneyDataOptions,
                params: { orgId: '1', tournId: tourneyIdToGet, year: currentYear }
            })
        ]);

        const picks = picksSql?.rows;
        const users = usersSql?.rows;
        const tourneyData = tourneyDataResponse?.data;
        const isComplete = tourneyData?.status === "Official";
        const currentRound = tourneyData?.roundId;
        const roundStatus = tourneyData?.roundStatus;
        const playerData = tourneyData?.leaderboardRows;
        const firstPlacePlayer = playerData?.[0];

        const playerPicksData = users.map(user => {
            const picksForUser = picks?.filter(pick => pick?.user_id === `${user.user_id}`);
            const pickStats = [];
            let lowR1 = 200, lowR2 = 200, lowR3 = 200, lowR4 = 200;

            picksForUser?.forEach(pick => {
                const pd = playerData.find(p => p.playerId === pick.player_id);
                const rounds = pd?.rounds;
                const isPlayerCut = pd?.status === "cut";
                const playerHasntStarted = pd?.status === "between rounds" || pd?.status === "not started";
                const holesThrough = pd?.startingHole === 10
                    ? (pd?.currentHole > 9 ? pd?.currentHole - 10 : pd?.currentHole + 10)
                    : (pd?.currentHole - 1);
                const holesThroughDisplay = pd?.status === "complete" ? "F" : (playerHasntStarted ? pd?.teeTime : holesThrough === 0 ? "" : holesThrough);

                const r1 = rounds?.[0]?.strokes;
                const r2 = rounds?.[1]?.strokes;
                const r3 = isPlayerCut ? "-" : rounds?.[2]?.strokes;
                const r4 = isPlayerCut ? "-" : rounds?.[3]?.strokes;

                if (r1 < lowR1) lowR1 = r1;
                if (r2 < lowR2) lowR2 = r2;
                if (r3 !== "-" && r3 < lowR3) lowR3 = r3;
                if (r4 !== "-" && r4 < lowR4) lowR4 = r4;

                pickStats.push({
                    pick_id: pick.pick_id,
                    playerId: pd?.playerId,
                    name: `${pd?.firstName} ${pd?.lastName}`,
                    currentRoundScore: isPlayerCut ? "Cut" : (playerHasntStarted ? "-" : pd?.currentRoundScore),
                    currentHolesThrough: isPlayerCut ? "Cut" : holesThroughDisplay,
                    total: isPlayerCut ? "Cut" : pd?.total,
                    totalConvertedForMath: pd?.total === 'E' ? 0 : (Number(pd?.total) < 0 ? Number(pd?.total) : Number(pd?.total?.slice(1))),
                    round1Score: r1,
                    round2Score: r2,
                    round3Score: r3,
                    round4Score: r4,
                    totalStrokesFromCompletedRounds: pd?.totalStrokesFromCompletedRounds
                });
            });

            const picksWithoutCut = pickStats.filter(p => p.total !== "Cut");
            const sorted = [...picksWithoutCut].sort((a, b) => a.totalConvertedForMath - b.totalConvertedForMath);
            const topThree = sorted.length > 2
                ? sorted[0].totalConvertedForMath + sorted[1].totalConvertedForMath + sorted[2].totalConvertedForMath
                : "-";

            return {
                user_id: user.user_id,
                name: user.name,
                username: user.username,
                picks: pickStats,
                lowRoundOneScore: lowR1 === 200 ? "-" : lowR1,
                lowRoundTwoScore: lowR2 === 200 ? "-" : lowR2,
                lowRoundThreeScore: lowR3 === 200 ? "-" : lowR3,
                lowRoundFourScore: lowR4 === 200 ? "-" : lowR4,
                topThree
            };
        });

        const roundOneLow = (currentRound === 1 && roundStatus === "In Progress") ? null : calculateLowRound(playerPicksData, 'round1Score');
        const roundTwoLow = (currentRound === 2 && roundStatus === "In Progress") ? null : calculateLowRound(playerPicksData, 'round2Score');
        const roundThreeLow = (currentRound === 3 && roundStatus === "In Progress") ? null : calculateLowRound(playerPicksData, 'round3Score');
        const roundFourLow = (currentRound === 4 && roundStatus === "In Progress") ? null : calculateLowRound(playerPicksData, 'round4Score');

        const qualifiesForTopThree = playerPicksData.filter(p => p.topThree !== "-");
        const topThreeLow = isComplete ? qualifiesForTopThree.sort((a, b) => a.topThree - b.topThree)[0] : null;
        const pickedWinner = isComplete ? playerPicksData.find(p => p.picks.some(pick => pick.playerId === firstPlacePlayer?.playerId)) : null;

        return NextResponse.json({
            playerPicksData,
            winnersData: {
                roundOneLow,
                roundTwoLow,
                roundThreeLow,
                roundFourLow,
                topThree: topThreeLow,
                pickedWinner: pickedWinner ? { ...pickedWinner, winner: firstPlacePlayer } : null
            }
        }, { status: 200 });
    } catch (error) {
        console.log({ error });
        return NextResponse.json({ error }, { status: 500 });
    }
}
