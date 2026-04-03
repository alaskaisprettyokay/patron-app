"use client";

interface TipEvent {
  id: string;
  artist: string;
  track: string;
  amount: string;
  ensName?: string;
  timestamp: Date;
  escrowed: boolean;
}

// Demo data for hackathon
const DEMO_TIPS: TipEvent[] = [
  {
    id: "1",
    artist: "Aphex Twin",
    track: "Windowlicker",
    amount: "0.05",
    ensName: "aphex-twin.patron.eth",
    timestamp: new Date(Date.now() - 120000),
    escrowed: false,
  },
  {
    id: "2",
    artist: "Burial",
    track: "Archangel",
    amount: "0.05",
    timestamp: new Date(Date.now() - 360000),
    escrowed: true,
  },
  {
    id: "3",
    artist: "Four Tet",
    track: "Baby",
    amount: "0.05",
    ensName: "four-tet.patron.eth",
    timestamp: new Date(Date.now() - 600000),
    escrowed: false,
  },
  {
    id: "4",
    artist: "Boards of Canada",
    track: "Dayvan Cowboy",
    amount: "0.05",
    timestamp: new Date(Date.now() - 900000),
    escrowed: true,
  },
];

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function TipFeed() {
  return (
    <div className="space-y-3">
      {DEMO_TIPS.map((tip) => (
        <div
          key={tip.id}
          className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-patron-500 to-accent flex items-center justify-center text-sm font-bold">
              {tip.artist[0]}
            </div>
            <div>
              <div className="font-medium text-sm">{tip.artist}</div>
              <div className="text-xs text-gray-400">{tip.track}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-accent text-sm font-medium">${tip.amount}</div>
            <div className="text-xs text-gray-500">
              {tip.escrowed ? (
                <span className="text-yellow-500">Escrowed</span>
              ) : (
                <span className="text-accent">{tip.ensName}</span>
              )}
            </div>
            <div className="text-xs text-gray-600">{timeAgo(tip.timestamp)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
