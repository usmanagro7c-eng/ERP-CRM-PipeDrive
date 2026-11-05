import { CheckCircle2, Clock, Mail, MessageSquare, PhoneCall, Sparkles, User } from "lucide-react";

interface ActivityEvent {
  id: string;
  type: "created" | "stage" | "comment" | "call" | "task" | "email";
  title: string;
  description: string;
  time: string;
  author?: string | undefined;
}

interface RecordActivityFeedProps {
  referenceDoctype: string;
  referenceName: string;
  owner?: string;
  status?: string;
  creation?: string;
}

export function RecordActivityFeed({
  referenceDoctype,
  referenceName,
  owner,
  status,
  creation,
}: RecordActivityFeedProps) {
  const events: ActivityEvent[] = [
    {
      id: "ev-1",
      type: "created",
      title: `${referenceDoctype} Created`,
      description: `Initialized in the system by ${owner || "system"}`,
      time: creation?.split(" ")[0] || "Recently",
      author: owner,
    },
    {
      id: "ev-2",
      type: "stage",
      title: "Current Status",
      description: `Current pipeline status is "${status || "Active"}"`,
      time: "Current",
    },
  ];

  function getIcon(type: ActivityEvent["type"]) {
    switch (type) {
      case "created":
        return <Sparkles className="size-3.5 text-primary" />;
      case "stage":
        return <CheckCircle2 className="size-3.5 text-blue-500" />;
      case "comment":
        return <MessageSquare className="size-3.5 text-emerald-500" />;
      case "call":
        return <PhoneCall className="size-3.5 text-amber-500" />;
      case "email":
        return <Mail className="size-3.5 text-purple-500" />;
      default:
        return <Clock className="size-3.5 text-muted-foreground" />;
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h3 className="text-sm font-semibold">Timeline & Audit Activity</h3>
      <div className="relative pl-6 space-y-6 border-l-2 border-muted ml-2 pt-1">
        {events.map((ev) => (
          <div key={ev.id} className="relative">
            <div className="absolute -left-[31px] top-0.5 flex size-5 items-center justify-center rounded-full bg-background border border-border shadow-2xs">
              {getIcon(ev.type)}
            </div>
            <div className="text-xs space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{ev.title}</span>
                <span className="text-[10px] text-muted-foreground">{ev.time}</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {ev.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
