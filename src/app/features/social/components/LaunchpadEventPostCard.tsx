import { useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { Link, useNavigate } from "react-router";
import { gql } from "@apollo/client/core";
import { useMutation, useQuery } from "@apollo/client/react";
import { ArrowRight, Users } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { useAuth } from "../../../../contexts/AuthContext";
import { JoinEventModal } from "../../launchpad/join-event-modal";
import type { LaunchpadEventType } from "../../launchpad";

const GET_LAUNCHPAD_EVENT_CARD = gql`
  query GetLaunchpadEventPostCard($id: ID!) {
    launchpadEvent(id: $id) {
      id
      title
      iconUrl
      projectName
      projectTagline
      projectStatus
      eventType
      description
      interestedCount
      spotsTotal
      isOpen
      interestedByMe
      author {
        id
      }
    }
  }
`;

const JOIN_LAUNCHPAD_EVENT_CARD = gql`
  mutation JoinLaunchpadEventPostCard($launchpadEventId: ID!, $commitmentEmail: String, $commitmentNote: String) {
    markInterested(
      launchpadEventId: $launchpadEventId
      commitmentEmail: $commitmentEmail
      commitmentNote: $commitmentNote
    ) {
      id
      interestedCount
      interestedByMe
    }
  }
`;

const LAUNCHPAD_PATH_REGEX = /(?:https?:\/\/(?:www\.|app\.)?lokalhost\.club)?\/launchpad\/([A-Za-z0-9_-]+)/i;
const LAUNCHPAD_PATH_GLOBAL_REGEX = /(?:https?:\/\/(?:www\.|app\.)?lokalhost\.club)?\/launchpad\/[A-Za-z0-9_-]+/gi;

export function extractLaunchpadEventId(text?: string | null) {
  if (!text) return null;
  const match = text.match(LAUNCHPAD_PATH_REGEX);
  return match?.[1] ?? null;
}

export function stripLaunchpadEventLinks(text: string) {
  return text
    .replace(LAUNCHPAD_PATH_GLOBAL_REGEX, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatEventType(value?: string | null) {
  if (!value) return "Launchpad";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function LaunchpadEventPostCard({
  eventId,
  className = "",
  stopPropagation = false,
}: {
  eventId: string;
  className?: string;
  stopPropagation?: boolean;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [joinOpen, setJoinOpen] = useState(false);
  const { data, loading, error } = useQuery(GET_LAUNCHPAD_EVENT_CARD, {
    variables: { id: eventId },
    fetchPolicy: "cache-and-network",
  });
  const [joinEvent, { loading: joining }] = useMutation(JOIN_LAUNCHPAD_EVENT_CARD);
  const event = data?.launchpadEvent;
  const detailsPath = `/launchpad/${eventId}`;
  const isOwner = !!user?.id && !!event?.author?.id && user.id === event.author.id;
  const isFull = !!event?.spotsTotal && event.interestedCount >= event.spotsTotal;
  const spotsText = useMemo(() => {
    if (!event?.spotsTotal) return `${event?.interestedCount ?? 0} joined`;
    return `${event.interestedCount}/${event.spotsTotal} joined`;
  }, [event?.interestedCount, event?.spotsTotal]);

  function handleJoinClick(clickEvent: MouseEvent<HTMLButtonElement>) {
    if (stopPropagation) clickEvent.stopPropagation();
    if (!user) {
      navigate("/login", { state: { from: detailsPath } });
      return;
    }
    if (isOwner || event?.interestedByMe || !event?.isOpen || isFull) return;
    setJoinOpen(true);
  }

  async function handleJoinConfirm(email: string, note: string) {
    await joinEvent({
      variables: {
        launchpadEventId: eventId,
        commitmentEmail: email,
        commitmentNote: note || undefined,
      },
    });
    setJoinOpen(false);
  }

  if (loading && !event) {
    return (
      <div className={`${className} rounded-2xl border bg-muted/35 p-4`.trim()}>
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className={`${className} rounded-2xl border border-dashed bg-muted/25 p-4`.trim()}>
        <p className="text-sm font-semibold">Launchpad event unavailable</p>
        <p className="mt-1 text-xs text-muted-foreground">This event may have been removed or is no longer public.</p>
      </div>
    );
  }

  return (
    <>
      <div
        className={`${className} overflow-hidden rounded-2xl border border-orange-500/25 bg-card shadow-sm`.trim()}
        onClick={(clickEvent) => {
          if (stopPropagation) clickEvent.stopPropagation();
        }}
      >
        <div className="border-b border-orange-500/15 bg-orange-500/10 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-orange-500/20 bg-background shadow-sm">
                {event.iconUrl ? (
                  <img src={event.iconUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-orange-600 dark:text-orange-300">
                    {(event.projectName || event.title || "L").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{event.projectName}</p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-orange-600 dark:text-orange-300">
                  {formatEventType(event.eventType)}
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              {event.isOpen ? event.projectStatus ?? "Open" : "Closed"}
            </span>
          </div>
        </div>

        <div className="p-4">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug">{event.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {event.projectTagline || event.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{spotsText}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-full bg-orange-500 px-3 text-white hover:bg-orange-600"
                disabled={joining || isOwner || event.interestedByMe || !event.isOpen || isFull}
                onClick={handleJoinClick}
              >
                {isOwner ? "Host" : event.interestedByMe ? "Joined" : isFull ? "Full" : event.isOpen ? "Join" : "Closed"}
              </Button>
              <Button asChild type="button" size="sm" variant="outline" className="h-8 rounded-full px-3">
                <Link
                  to={detailsPath}
                  onClick={(clickEvent) => {
                    if (stopPropagation) clickEvent.stopPropagation();
                  }}
                >
                  View details
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
      <JoinEventModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onConfirm={handleJoinConfirm}
        event={event}
        eventType={(event.eventType ?? "LAUNCH") as LaunchpadEventType}
        loading={joining}
      />
    </>
  );
}
